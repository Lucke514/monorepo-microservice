import { Logger } from '@nestjs/common';
import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { Client, Pool } from 'pg';
import { JobEntity, JobStatus } from '../../domain/entities/job.entity.js';
import { JOBS_REPLY_CHANNEL } from '../../domain/constants/queue.constants.js';
import { PgQueueContext } from './pg-queue.context.js';

export interface PgQueueServerConfig {
    pool: Pool;
    createListenClient: () => Client;
    staleJobTimeoutMs?: number;
    staleJobCheckIntervalMs?: number;
    workerId?: string;
}

export class PgQueueServer extends Server implements CustomTransportStrategy {
    protected readonly logger = new Logger(PgQueueServer.name);

    private listenClient: Client;
    private pool: Pool;
    private recoveryTimer: NodeJS.Timeout | null = null;
    private inflightCount = 0;
    private closing = false;

    constructor(private readonly config: PgQueueServerConfig) {
        super();
    }

    async listen(callback: () => void): Promise<void> {
        this.pool = this.config.pool;

        this.listenClient = this.config.createListenClient();

        await this.listenClient.connect();
        await this.subscribeToChannels(this.listenClient);

        this.listenClient.on('notification', (msg) => {
            void this.handleNotification(msg.channel);
        });

        this.listenClient.on('error', (err) => {
            this.logger.error(`pg LISTEN client error: ${err.message}`);
            void this.reconnect();
        });

        this.startRecovery();

        const channels = [...this.messageHandlers.keys()];
        for (const channel of channels) {
            void this.handleNotification(channel);
        }

        callback();
    }

    on<EventKey extends keyof Record<string, Function>>(
        _event: EventKey,
        _callback: Record<string, Function>[EventKey],
    ): void {}

    unwrap<T>(): T {
        throw new Error('PgQueueServer does not support unwrap()');
    }

    async close(): Promise<void> {
        this.closing = true;

        if (this.recoveryTimer) {
            clearInterval(this.recoveryTimer);
            this.recoveryTimer = null;
        }

        this.listenClient.removeAllListeners('notification');
        this.listenClient.removeAllListeners('error');

        await this.drainInflight(30_000);
        await this.listenClient.end().catch(() => undefined);
        await this.pool.end().catch(() => undefined);
    }

    private async subscribeToChannels(client: Client): Promise<void> {
        const channels = [...this.messageHandlers.keys()];
        for (const channel of channels) {
            await client.query(`LISTEN "${channel}"`);
            this.logger.log(`Listening on channel: ${channel}`);
        }
    }

    private async handleNotification(channel: string): Promise<void> {
        if (this.closing) return;

        const handler = this.getHandlerByPattern(channel);
        if (!handler) return;

        while (!this.closing) {
            const job = await this.claimJob(channel);
            if (!job) break;

            this.inflightCount++;
            this.processJob(job, handler).finally(() => {
                this.inflightCount--;
            });
        }
    }

    private async processJob(
        job: JobEntity,
        handler: (data: unknown, ctx: PgQueueContext) => Promise<unknown>,
    ): Promise<void> {
        const ctx = new PgQueueContext([job]);
        try {
            const resultOrStream = await handler(job.payload, ctx);
            const result = await lastValueFrom(
                this.transformToObservable(resultOrStream),
                { defaultValue: null },
            );
            await this.markDone(job.id, result);
        } catch (err: unknown) {
            const message = this.extractErrorMessage(err);
            this.logger.error(
                `Job ${job.id} failed (attempt ${job.attempts}/${job.maxRetries}): ${message}`,
            );
            const canRetry = job.attempts < job.maxRetries;
            await this.markFailed(job.id, message, canRetry);
            if (canRetry) {
                await this.pool.query('SELECT pg_notify($1, $2)', [
                    job.queueName,
                    job.id,
                ]);
            }
        }
    }

    private extractErrorMessage(err: unknown): string {
        if (err instanceof Error) return err.message;
        if (err && typeof err === 'object' && 'message' in err) {
            return String(err.message);
        }
        return typeof err === 'string' ? err : JSON.stringify(err);
    }

    private async claimJob(queueName: string): Promise<JobEntity | null> {
        const result = await this.pool.query<Record<string, unknown>>(
            `UPDATE jobs
       SET status      = 'processing',
           "lockedAt"  = NOW(),
           "workerId"  = $2,
           attempts    = attempts + 1
       WHERE id = (
         SELECT id FROM jobs
         WHERE "queueName" = $1
           AND status       = 'pending'
         ORDER BY "createdAt" ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`,
            [queueName, this.config.workerId ?? null],
        );
        const row = result.rows[0];
        if (!row) return null;
        return {
            id: row['id'] as string,
            queueName: row['queueName'] as string,
            payload: row['payload'] as Record<string, unknown>,
            status: row['status'] as JobStatus,
            attempts: row['attempts'] as number,
            maxRetries: row['maxRetries'] as number,
            lockedAt: row['lockedAt']
                ? new Date(row['lockedAt'] as string)
                : null,
            workerId: (row['workerId'] as string | null) ?? null,
            createdAt: new Date(row['createdAt'] as string),
            processedAt: row['processedAt']
                ? new Date(row['processedAt'] as string)
                : null,
            errorMessage: (row['errorMessage'] as string | null) ?? null,
            result: (row['result'] as Record<string, unknown> | null) ?? null,
        };
    }

    private async markDone(id: string, result: unknown): Promise<void> {
        await this.pool.query(
            `UPDATE jobs SET status = 'done', "processedAt" = NOW(), result = $2 WHERE id = $1`,
            [id, JSON.stringify(result ?? null)],
        );
        await this.notifyReply(id);
    }

    private async markFailed(
        id: string,
        message: string,
        reschedule: boolean,
    ): Promise<void> {
        if (reschedule) {
            await this.pool.query(
                `UPDATE jobs SET status = 'pending', "lockedAt" = NULL, "workerId" = NULL, "errorMessage" = $2 WHERE id = $1`,
                [id, message],
            );
        } else {
            await this.pool.query(
                `UPDATE jobs SET status = 'failed', "processedAt" = NOW(), "errorMessage" = $2 WHERE id = $1`,
                [id, message],
            );
            await this.notifyReply(id);
        }
    }

    private async notifyReply(id: string): Promise<void> {
        await this.pool.query('SELECT pg_notify($1, $2)', [
            JOBS_REPLY_CHANNEL,
            id,
        ]);
    }

    private startRecovery(): void {
        const intervalMs = this.config.staleJobCheckIntervalMs ?? 30_000;
        const timeoutMs = this.config.staleJobTimeoutMs ?? 300_000;

        this.recoveryTimer = setInterval(() => {
            void this.runRecovery(timeoutMs);
        }, intervalMs);
    }

    private async runRecovery(timeoutMs: number): Promise<void> {
        const rescheduled = await this.pool
            .query<{ id: string }>(
                `UPDATE jobs
         SET status     = 'pending',
             "lockedAt" = NULL,
             "workerId" = NULL
         WHERE status     = 'processing'
           AND "lockedAt" < NOW() - ($1 * INTERVAL '1 millisecond')
           AND attempts   < "maxRetries"
         RETURNING id`,
                [timeoutMs],
            )
            .then((r) => r.rows.length)
            .catch(() => 0);

        const failed = await this.pool
            .query<{ id: string }>(
                `UPDATE jobs
         SET status        = 'failed',
             "processedAt" = NOW()
         WHERE status     = 'processing'
           AND "lockedAt" < NOW() - ($1 * INTERVAL '1 millisecond')
           AND attempts   >= "maxRetries"
         RETURNING id`,
                [timeoutMs],
            )
            .then((r) => r.rows.length)
            .catch(() => 0);

        if (rescheduled > 0 || failed > 0) {
            this.logger.warn(
                `Stale job recovery: rescheduled=${rescheduled}, permanently_failed=${failed}`,
            );
            if (rescheduled > 0) {
                const channels = [...this.messageHandlers.keys()];
                for (const channel of channels) {
                    void this.handleNotification(channel);
                }
            }
        }
    }

    private async drainInflight(timeoutMs: number): Promise<void> {
        const deadline = Date.now() + timeoutMs;
        while (this.inflightCount > 0 && Date.now() < deadline) {
            await new Promise<void>((resolve) => setTimeout(resolve, 100));
        }
        if (this.inflightCount > 0) {
            this.logger.warn(
                `Shutdown with ${this.inflightCount} jobs still in flight`,
            );
        }
    }

    private async reconnect(): Promise<void> {
        let delay = 1_000;
        while (!this.closing) {
            try {
                const client = this.config.createListenClient();
                await client.connect();
                await this.subscribeToChannels(client);
                client.on(
                    'notification',
                    (msg) => void this.handleNotification(msg.channel),
                );
                client.on('error', (err) => {
                    this.logger.error(`pg LISTEN client error: ${err.message}`);
                    void this.reconnect();
                });
                this.listenClient = client;
                this.logger.log('Reconnected pg LISTEN client');
                return;
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : String(err);
                this.logger.error(
                    `Reconnect failed, retrying in ${delay}ms: ${message}`,
                );
                await new Promise<void>((resolve) =>
                    setTimeout(resolve, delay),
                );
                delay = Math.min(delay * 2, 30_000);
            }
        }
    }
}

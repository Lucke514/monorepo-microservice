import { Logger } from '@nestjs/common';
import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { Client, Pool } from 'pg';
import { JobEntity, JobStatus } from '../../domain/entities/job.entity.js';
import { PgQueueContext } from './pg-queue.context.js';

export interface PgQueueServerConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    maxConnections?: number;
    staleJobTimeoutMs?: number;
    staleJobCheckIntervalMs?: number;
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
        this.pool = new Pool({
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            user: this.config.user,
            password: this.config.password,
            max: this.config.maxConnections ?? 10,
        });

        this.listenClient = new Client({
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            user: this.config.user,
            password: this.config.password,
        });

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

        // Scan for any pending jobs that arrived before we connected
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

        // Claim one job; others may also be waiting — loop until no more pending
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
            await handler(job.payload, ctx);
            await this.markDone(job.id);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(
                `Job ${job.id} failed (attempt ${job.attempts}/${job.maxRetries}): ${message}`,
            );
            const canRetry = job.attempts < job.maxRetries;
            await this.markFailed(job.id, message, canRetry);
        }
    }

    private async claimJob(queueName: string): Promise<JobEntity | null> {
        const result = await this.pool.query<Record<string, unknown>>(
            `UPDATE jobs
       SET status    = 'processing',
           locked_at = NOW(),
           attempts  = attempts + 1
       WHERE id = (
         SELECT id FROM jobs
         WHERE queue_name = $1
           AND status     = 'pending'
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`,
            [queueName],
        );
        const row = result.rows[0];
        if (!row) return null;
        return {
            id: row['id'] as string,
            queueName: row['queue_name'] as string,
            payload: row['payload'] as Record<string, unknown>,
            status: row['status'] as JobStatus,
            attempts: row['attempts'] as number,
            maxRetries: row['max_retries'] as number,
            lockedAt: row['locked_at']
                ? new Date(row['locked_at'] as string)
                : null,
            createdAt: new Date(row['created_at'] as string),
            processedAt: row['processed_at']
                ? new Date(row['processed_at'] as string)
                : null,
            errorMessage: (row['error_message'] as string | null) ?? null,
        };
    }

    private async markDone(id: string): Promise<void> {
        await this.pool.query(
            `UPDATE jobs SET status = 'done', processed_at = NOW() WHERE id = $1`,
            [id],
        );
    }

    private async markFailed(
        id: string,
        message: string,
        reschedule: boolean,
    ): Promise<void> {
        if (reschedule) {
            await this.pool.query(
                `UPDATE jobs SET status = 'pending', locked_at = NULL, error_message = $2 WHERE id = $1`,
                [id, message],
            );
        } else {
            await this.pool.query(
                `UPDATE jobs SET status = 'failed', processed_at = NOW(), error_message = $2 WHERE id = $1`,
                [id, message],
            );
        }
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
         SET status    = 'pending',
             locked_at = NULL
         WHERE status    = 'processing'
           AND locked_at < NOW() - ($1 * INTERVAL '1 millisecond')
           AND attempts  < max_retries
         RETURNING id`,
                [timeoutMs],
            )
            .then((r) => r.rows.length)
            .catch(() => 0);

        const failed = await this.pool
            .query<{ id: string }>(
                `UPDATE jobs
         SET status       = 'failed',
             processed_at = NOW()
         WHERE status    = 'processing'
           AND locked_at < NOW() - ($1 * INTERVAL '1 millisecond')
           AND attempts  >= max_retries
         RETURNING id`,
                [timeoutMs],
            )
            .then((r) => r.rows.length)
            .catch(() => 0);

        if (rescheduled > 0 || failed > 0) {
            this.logger.warn(
                `Stale job recovery: rescheduled=${rescheduled}, permanently_failed=${failed}`,
            );
            // Wake up handlers for rescheduled jobs
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
                const client = new Client({
                    host: this.config.host,
                    port: this.config.port,
                    database: this.config.database,
                    user: this.config.user,
                    password: this.config.password,
                });
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

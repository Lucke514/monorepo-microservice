import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { PgConnectionService } from '@app/database';
import { Client, Pool } from 'pg';
import { JOBS_REPLY_CHANNEL } from '../../domain/constants/queue.constants.js';
import {
    JobFailedError,
    JobTimeoutError,
} from '../../domain/errors/queue.errors.js';

type JobResult = Record<string, unknown> | null;

interface PendingRequest {
    resolve: (result: JobResult) => void;
    reject: (err: Error) => void;
    timer: NodeJS.Timeout;
}

@Injectable()
export class JobReplyWaiterService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(JobReplyWaiterService.name);
    private readonly pending = new Map<string, PendingRequest>();

    private pool: Pool;
    private listenClient: Client;
    private closing = false;

    constructor(private readonly connection: PgConnectionService) {}

    async onModuleInit(): Promise<void> {
        this.pool = this.connection.getPool();
        this.listenClient = this.connection.createListenClient();
        await this.listenClient.connect();
        await this.listenClient.query(`LISTEN "${JOBS_REPLY_CHANNEL}"`);

        this.listenClient.on('notification', (msg) => {
            if (msg.payload) void this.settleFromDb(msg.payload);
        });
        this.listenClient.on('error', (err) => {
            this.logger.error(`reply LISTEN client error: ${err.message}`);
            void this.reconnect();
        });

        this.logger.log(
            `Listening for replies on channel: ${JOBS_REPLY_CHANNEL}`,
        );
    }

    async onModuleDestroy(): Promise<void> {
        this.closing = true;
        for (const [jobId, entry] of this.pending) {
            clearTimeout(entry.timer);
            entry.reject(
                new Error(`Shutting down while awaiting job ${jobId}`),
            );
        }
        this.pending.clear();
        await this.listenClient?.end().catch(() => undefined);
    }

    waitFor(jobId: string, timeoutMs: number): Promise<JobResult> {
        return new Promise<JobResult>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(jobId);
                reject(new JobTimeoutError(jobId, timeoutMs));
            }, timeoutMs);

            this.pending.set(jobId, { resolve, reject, timer });

            void this.settleFromDb(jobId);
        });
    }

    private async settleFromDb(jobId: string): Promise<void> {
        const entry = this.pending.get(jobId);
        if (!entry || this.closing) return;

        const { rows } = await this.pool.query<{
            status: string;
            result: JobResult;
            error_message: string | null;
        }>(`SELECT status, result, error_message FROM jobs WHERE id = $1`, [
            jobId,
        ]);
        const row = rows[0];
        if (!row) return;

        if (row.status === 'done') {
            clearTimeout(entry.timer);
            this.pending.delete(jobId);
            entry.resolve(row.result ?? null);
        } else if (row.status === 'failed') {
            clearTimeout(entry.timer);
            this.pending.delete(jobId);
            entry.reject(
                new JobFailedError(jobId, row.error_message ?? 'unknown error'),
            );
        }
    }

    private async reconnect(): Promise<void> {
        let delay = 1_000;
        while (!this.closing) {
            try {
                const client = this.connection.createListenClient();
                await client.connect();
                await client.query(`LISTEN "${JOBS_REPLY_CHANNEL}"`);
                client.on('notification', (msg) => {
                    if (msg.payload) void this.settleFromDb(msg.payload);
                });
                client.on('error', (err) => {
                    this.logger.error(
                        `reply LISTEN client error: ${err.message}`,
                    );
                    void this.reconnect();
                });
                this.listenClient = client;
                this.logger.log('Reconnected reply LISTEN client');
                return;
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : String(err);
                this.logger.error(
                    `Reply reconnect failed, retrying in ${delay}ms: ${message}`,
                );
                await new Promise<void>((resolve) =>
                    setTimeout(resolve, delay),
                );
                delay = Math.min(delay * 2, 30_000);
            }
        }
    }
}

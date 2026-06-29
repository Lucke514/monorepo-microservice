import {
    Inject,
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { FindStaleJobsRepository } from '../../domain/ports/find-stale-jobs.repository.js';
import { QUEUE_CONFIG } from '../../queue.constants.js';
import type { QueueModuleOptions } from '../../queue.constants.js';

@Injectable()
export class StaleJobRecoveryService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(StaleJobRecoveryService.name);
    private timer: NodeJS.Timeout | null = null;

    constructor(
        private readonly findStaleJobsRepository: FindStaleJobsRepository,
        @Inject(QUEUE_CONFIG) private readonly config: QueueModuleOptions,
    ) {}

    onModuleInit(): void {
        const intervalMs = this.config.staleJobCheckIntervalMs ?? 30_000;
        this.timer = setInterval(() => void this.run(), intervalMs);
    }

    onModuleDestroy(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    private async run(): Promise<void> {
        const timeoutMs = this.config.staleJobTimeoutMs ?? 300_000;
        try {
            const rescheduled =
                await this.findStaleJobsRepository.rescheduleStale(timeoutMs);
            const failed =
                await this.findStaleJobsRepository.failExpired(timeoutMs);
            if (rescheduled > 0 || failed > 0) {
                this.logger.warn(
                    `Stale job recovery: rescheduled=${rescheduled}, permanently_failed=${failed}`,
                );
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`Stale job recovery error: ${message}`);
        }
    }
}

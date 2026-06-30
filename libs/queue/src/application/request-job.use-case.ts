import { Inject, Injectable } from '@nestjs/common';
import { EnqueueJobRepository } from '../domain/ports/enqueue-job.repository.js';
import { JobReplyWaiterService } from '../infrastructure/transporter/job-reply-waiter.service.js';
import { QUEUE_CONFIG } from '../domain/constants/queue.constants.js';
import type { QueueModuleOptions } from '../domain/constants/queue.constants.js';

export interface RequestOptions {
    maxRetries?: number;
    timeoutMs?: number;
}

/**
 * Productor request/reply: encola un job y espera (bloquea) su response.
 * Resuelve con el `result` del job o lanza JobFailedError / JobTimeoutError.
 */
@Injectable()
export class RequestJobUseCase {
    constructor(
        private readonly enqueueJobRepository: EnqueueJobRepository,
        private readonly waiter: JobReplyWaiterService,
        @Inject(QUEUE_CONFIG) private readonly config: QueueModuleOptions,
    ) {}

    async request(
        queueName: string,
        payload: Record<string, unknown>,
        options?: RequestOptions,
    ): Promise<Record<string, unknown> | null> {
        const timeoutMs =
            options?.timeoutMs ?? this.config.requestTimeoutMs ?? 30_000;
        const jobId = await this.enqueueJobRepository.enqueue(
            queueName,
            payload,
            { maxRetries: options?.maxRetries },
        );
        return this.waiter.waitFor(jobId, timeoutMs);
    }
}

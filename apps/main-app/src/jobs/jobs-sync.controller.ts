import {
    Controller,
    Get,
    InternalServerErrorException,
    Query,
    RequestTimeoutException,
} from '@nestjs/common';
import { JobFailedError, JobTimeoutError, RequestJobUseCase } from '@app/queue';

// Debe coincidir con el @EventPattern del worker (apps/worker/src/jobs/example-job.controller.ts)
const EXAMPLE_QUEUE = 'example-queue';

@Controller('jobs')
export class JobsSyncController {
    constructor(private readonly requestJob: RequestJobUseCase) {}

    // GET /jobs/sync?message=hola → encola y BLOQUEA hasta recibir la response del worker.
    @Get('sync')
    async createAndWait(
        @Query('message') message?: string,
    ): Promise<Record<string, unknown> | null> {
        try {
            return await this.requestJob.request(EXAMPLE_QUEUE, {
                message: message ?? 'hello from main-app',
                enqueuedAt: new Date().toISOString(),
            });
        } catch (err: unknown) {
            if (err instanceof JobTimeoutError) {
                throw new RequestTimeoutException(err.message);
            }
            if (err instanceof JobFailedError) {
                throw new InternalServerErrorException(err.message);
            }
            throw err;
        }
    }
}

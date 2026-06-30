import { Controller, Get, Query } from '@nestjs/common';
import { EnqueueJobUseCase } from '@app/queue';

// Debe coincidir con el @EventPattern del worker (apps/worker/src/jobs/example-job.controller.ts)
const EXAMPLE_QUEUE = 'example-queue';

@Controller('jobs')
export class JobsController {
    constructor(private readonly enqueueJob: EnqueueJobUseCase) {}

    // GET /jobs?message=hola → encola un job que el worker procesará vía pg_notify
    @Get()
    async create(@Query('message') message?: string): Promise<{
        jobId: string;
        queue: string;
    }> {
        const jobId = await this.enqueueJob.emit(EXAMPLE_QUEUE, {
            message: message ?? 'hello from main-app',
            enqueuedAt: new Date().toISOString(),
        });
        return { jobId, queue: EXAMPLE_QUEUE };
    }
}

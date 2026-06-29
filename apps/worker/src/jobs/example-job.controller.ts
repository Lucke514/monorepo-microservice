import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload } from '@nestjs/microservices';
import { PgQueueContext } from '@app/queue';

@Controller()
export class ExampleJobController {
    private readonly logger = new Logger(ExampleJobController.name);

    @EventPattern('example-queue')
    async handleExampleJob(
        @Payload() data: Record<string, unknown>,
        @Ctx() ctx: PgQueueContext,
    ): Promise<Record<string, unknown>> {
        const job = ctx.getJob();
        this.logger.log(
            `Processing job ${job.id} (attempt ${job.attempts}/${job.maxRetries})`,
        );
        this.logger.log(`Payload: ${JSON.stringify(data)}`);

        // Demo del manejo de errores: con `message=fail` el handler lanza, el job
        // agota reintentos (maxRetries) y termina 'failed' → GET /jobs/sync → 500.
        if (data.message === 'fail') throw new Error('boom (demo)');

        // Replace with real business logic. El valor retornado se persiste como
        // `result` del job y se entrega al productor que espera la response.
        return {
            echo: String(data.message ?? '').toUpperCase(),
            processedAt: new Date().toISOString(),
        };
    }
}

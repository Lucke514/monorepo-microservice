import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern } from '@nestjs/microservices';
import { PgQueueContext } from '@app/queue';

@Controller()
export class ExampleJobController {
  private readonly logger = new Logger(ExampleJobController.name);

  @EventPattern('example-queue')
  async handleExampleJob(
    data: Record<string, unknown>,
    @Ctx() ctx: PgQueueContext,
  ): Promise<void> {
    const job = ctx.getJob();
    this.logger.log(`Processing job ${job.id} (attempt ${job.attempts}/${job.maxRetries})`);
    this.logger.log(`Payload: ${JSON.stringify(data)}`);
    // Replace with real business logic
  }
}

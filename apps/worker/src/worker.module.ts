import { Module } from '@nestjs/common';
import { ExampleJobController } from './jobs/example-job.controller.js';

@Module({
  controllers: [ExampleJobController],
})
export class WorkerModule {}

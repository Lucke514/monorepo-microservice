import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CompleteJobRepository } from '../../domain/ports/complete-job.repository.js';

@Injectable()
export class CompleteJobService implements CompleteJobRepository {
  constructor(
    @InjectDataSource('queue')
    private readonly dataSource: DataSource,
  ) {}

  async complete(jobId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE jobs SET status = 'done', processed_at = NOW() WHERE id = $1`,
      [jobId],
    );
  }
}

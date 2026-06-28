import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { FindStaleJobsRepository } from '../../domain/ports/find-stale-jobs.repository.js';

@Injectable()
export class FindStaleJobsService implements FindStaleJobsRepository {
  constructor(
    @InjectDataSource('queue')
    private readonly dataSource: DataSource,
  ) {}

  async rescheduleStale(timeoutMs: number): Promise<number> {
    const rows: unknown[] = await this.dataSource.query(
      `UPDATE jobs
       SET status    = 'pending',
           locked_at = NULL
       WHERE status    = 'processing'
         AND locked_at < NOW() - ($1 * INTERVAL '1 millisecond')
         AND attempts  < max_retries
       RETURNING id`,
      [timeoutMs],
    );
    return rows.length;
  }

  async failExpired(timeoutMs: number): Promise<number> {
    const rows: unknown[] = await this.dataSource.query(
      `UPDATE jobs
       SET status       = 'failed',
           processed_at = NOW()
       WHERE status    = 'processing'
         AND locked_at < NOW() - ($1 * INTERVAL '1 millisecond')
         AND attempts  >= max_retries
       RETURNING id`,
      [timeoutMs],
    );
    return rows.length;
  }
}

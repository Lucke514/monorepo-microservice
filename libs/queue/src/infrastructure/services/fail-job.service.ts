import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { FailJobRepository } from '../../domain/ports/fail-job.repository.js';

@Injectable()
export class FailJobService implements FailJobRepository {
    constructor(
        @InjectDataSource('queue')
        private readonly dataSource: DataSource,
    ) {}

    async fail(
        jobId: string,
        errorMessage: string,
        reschedule: boolean,
    ): Promise<void> {
        if (reschedule) {
            await this.dataSource.query(
                `UPDATE jobs
         SET status        = 'pending',
             locked_at     = NULL,
             error_message = $2
         WHERE id = $1`,
                [jobId, errorMessage],
            );
        } else {
            await this.dataSource.query(
                `UPDATE jobs
         SET status        = 'failed',
             processed_at  = NOW(),
             error_message = $2
         WHERE id = $1`,
                [jobId, errorMessage],
            );
        }
    }
}

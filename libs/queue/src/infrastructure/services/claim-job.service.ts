import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JobEntity, JobStatus } from '../../domain/entities/job.entity.js';
import { ClaimJobRepository } from '../../domain/ports/claim-job.repository.js';

@Injectable()
export class ClaimJobService implements ClaimJobRepository {
    constructor(
        @InjectDataSource('queue')
        private readonly dataSource: DataSource,
    ) {}

    async claim(queueName: string): Promise<JobEntity | null> {
        const rows: Record<string, unknown>[] = await this.dataSource.query(
            `UPDATE jobs
       SET status    = 'processing',
           locked_at = NOW(),
           attempts  = attempts + 1
       WHERE id = (
         SELECT id FROM jobs
         WHERE queue_name = $1
           AND status     = 'pending'
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`,
            [queueName],
        );
        const row = rows[0];
        if (!row) return null;
        return {
            id: row['id'] as string,
            queueName: row['queue_name'] as string,
            payload: row['payload'] as Record<string, unknown>,
            status: row['status'] as JobStatus,
            attempts: row['attempts'] as number,
            maxRetries: row['max_retries'] as number,
            lockedAt: row['locked_at']
                ? new Date(row['locked_at'] as string)
                : null,
            createdAt: new Date(row['created_at'] as string),
            processedAt: row['processed_at']
                ? new Date(row['processed_at'] as string)
                : null,
            errorMessage: (row['error_message'] as string | null) ?? null,
        };
    }
}

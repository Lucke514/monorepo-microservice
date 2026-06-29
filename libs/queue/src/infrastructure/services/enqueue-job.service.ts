import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JobStatus } from '../../domain/entities/job.entity.js';
import {
    EnqueueJobRepository,
    EnqueueOptions,
} from '../../domain/ports/enqueue-job.repository.js';
import { JobTypeOrmEntity } from '../entities/job.typeorm-entity.js';

@Injectable()
export class EnqueueJobService implements EnqueueJobRepository {
    constructor(
        @InjectRepository(JobTypeOrmEntity, 'queue')
        private readonly repo: Repository<JobTypeOrmEntity>,
        @InjectDataSource('queue')
        private readonly dataSource: DataSource,
    ) {}

    async enqueue(
        queueName: string,
        payload: Record<string, unknown>,
        options?: EnqueueOptions,
    ): Promise<string> {
        const job = this.repo.create({
            queueName,
            payload,
            status: JobStatus.PENDING,
            maxRetries: options?.maxRetries ?? 3,
        });
        const saved = await this.repo.save(job);
        await this.dataSource.query('SELECT pg_notify($1, $2)', [
            queueName,
            saved.id,
        ]);
        return saved.id;
    }
}

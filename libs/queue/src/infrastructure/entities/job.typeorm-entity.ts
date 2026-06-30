import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { JobStatus } from '../../domain/entities/job.entity.js';

@Index(['queueName', 'status', 'createdAt'])
@Index(['status', 'lockedAt'])
@Entity('jobs')
export class JobTypeOrmEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'queue_name', length: 128 })
    queueName: string;

    @Column({ type: 'jsonb' })
    payload: Record<string, unknown>;

    @Column({ type: 'enum', enum: JobStatus, default: JobStatus.PENDING })
    status: JobStatus;

    @Column({ default: 0 })
    attempts: number;

    @Column({ name: 'max_retries', default: 3 })
    maxRetries: number;

    @Column({
        name: 'locked_at',
        type: 'timestamptz',
        nullable: true,
        default: null,
    })
    lockedAt: Date | null;

    @Column({ name: 'worker_id', length: 128, nullable: true, default: null })
    workerId: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @Column({
        name: 'processed_at',
        type: 'timestamptz',
        nullable: true,
        default: null,
    })
    processedAt: Date | null;

    @Column({
        name: 'error_message',
        type: 'text',
        nullable: true,
        default: null,
    })
    errorMessage: string | null;

    @Column({ type: 'jsonb', nullable: true, default: null })
    result: Record<string, unknown> | null;
}

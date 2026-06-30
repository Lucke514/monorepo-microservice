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

    @Column({ length: 128 })
    queueName: string;

    @Column({ type: 'jsonb' })
    payload: Record<string, unknown>;

    @Column({ type: 'enum', enum: JobStatus, default: JobStatus.PENDING })
    status: JobStatus;

    @Column({ default: 0 })
    attempts: number;

    @Column({ default: 3 })
    maxRetries: number;

    @Column({
        type: 'timestamptz',
        nullable: true,
        default: null,
    })
    lockedAt: Date | null;

    @Column({ length: 128, nullable: true, default: null })
    workerId: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @Column({
        type: 'timestamptz',
        nullable: true,
        default: null,
    })
    processedAt: Date | null;

    @Column({
        type: 'text',
        nullable: true,
        default: null,
    })
    errorMessage: string | null;

    @Column({ type: 'jsonb', nullable: true, default: null })
    result: Record<string, unknown> | null;
}

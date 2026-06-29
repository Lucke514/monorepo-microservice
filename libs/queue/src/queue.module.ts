import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnqueueJobUseCase } from './application/enqueue-job.use-case.js';
import { EnqueueJobRepository } from './domain/ports/enqueue-job.repository.js';
import { ClaimJobRepository } from './domain/ports/claim-job.repository.js';
import { CompleteJobRepository } from './domain/ports/complete-job.repository.js';
import { FailJobRepository } from './domain/ports/fail-job.repository.js';
import { FindStaleJobsRepository } from './domain/ports/find-stale-jobs.repository.js';
import { JobTypeOrmEntity } from './infrastructure/entities/job.typeorm-entity.js';
import { EnqueueJobService } from './infrastructure/services/enqueue-job.service.js';
import { ClaimJobService } from './infrastructure/services/claim-job.service.js';
import { CompleteJobService } from './infrastructure/services/complete-job.service.js';
import { FailJobService } from './infrastructure/services/fail-job.service.js';
import { FindStaleJobsService } from './infrastructure/services/find-stale-jobs.service.js';
import { StaleJobRecoveryService } from './infrastructure/recovery/stale-job-recovery.service.js';
import { QUEUE_CONFIG } from './queue.constants.js';
import type { QueueModuleOptions } from './queue.constants.js';

export { QUEUE_CONFIG };
export type { QueueModuleOptions };

@Module({})
export class QueueModule {
    static forRoot(options: QueueModuleOptions): DynamicModule {
        return {
            module: QueueModule,
            imports: [
                TypeOrmModule.forRoot({
                    name: 'queue',
                    type: 'postgres',
                    host: options.host,
                    port: options.port,
                    database: options.database,
                    username: options.username,
                    password: options.password,
                    entities: [JobTypeOrmEntity],
                    synchronize: options.synchronize ?? false,
                }),
                TypeOrmModule.forFeature([JobTypeOrmEntity], 'queue'),
            ],
            providers: [
                { provide: QUEUE_CONFIG, useValue: options },
                { provide: EnqueueJobRepository, useClass: EnqueueJobService },
                { provide: ClaimJobRepository, useClass: ClaimJobService },
                {
                    provide: CompleteJobRepository,
                    useClass: CompleteJobService,
                },
                { provide: FailJobRepository, useClass: FailJobService },
                {
                    provide: FindStaleJobsRepository,
                    useClass: FindStaleJobsService,
                },
                EnqueueJobUseCase,
                StaleJobRecoveryService,
            ],
            exports: [EnqueueJobUseCase],
        };
    }

    static forRootAsync(options: {
        useFactory: (
            ...args: unknown[]
        ) => QueueModuleOptions | Promise<QueueModuleOptions>;
        inject?: unknown[];
        imports?: unknown[];
    }): DynamicModule {
        return {
            module: QueueModule,
            imports: [
                TypeOrmModule.forRootAsync({
                    name: 'queue',
                    useFactory: async (...args: unknown[]) => {
                        const config = await options.useFactory(...args);
                        return {
                            type: 'postgres' as const,
                            host: config.host,
                            port: config.port,
                            database: config.database,
                            username: config.username,
                            password: config.password,
                            entities: [JobTypeOrmEntity],
                            synchronize: config.synchronize ?? false,
                        };
                    },
                    inject: options.inject as never[] | undefined,
                    imports: options.imports as never[] | undefined,
                }),
                TypeOrmModule.forFeature([JobTypeOrmEntity], 'queue'),
                ...((options.imports as never[]) ?? []),
            ],
            providers: [
                {
                    provide: QUEUE_CONFIG,
                    useFactory: options.useFactory,
                    inject: options.inject as never[] | undefined,
                },
                { provide: EnqueueJobRepository, useClass: EnqueueJobService },
                { provide: ClaimJobRepository, useClass: ClaimJobService },
                {
                    provide: CompleteJobRepository,
                    useClass: CompleteJobService,
                },
                { provide: FailJobRepository, useClass: FailJobService },
                {
                    provide: FindStaleJobsRepository,
                    useClass: FindStaleJobsService,
                },
                EnqueueJobUseCase,
                StaleJobRecoveryService,
            ],
            exports: [EnqueueJobUseCase],
        };
    }
}

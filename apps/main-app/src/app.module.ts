import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { QueueModule } from '@app/queue';
import { envs } from './config/envs';
import { HealthController } from './health/health.controller';
import { JobsController } from './jobs/jobs.controller';
import { JobsSyncController } from './jobs/jobs-sync.controller';

@Module({
    imports: [
        DatabaseModule.forRoot({
            name: 'queue',
            host: envs.DB_HOST,
            port: envs.DB_PORT,
            database: envs.DB_NAME,
            username: envs.DB_USER,
            password: envs.DB_PASS,
            synchronize: envs.NODE_ENV !== 'production',
            poolMax: envs.QUEUE_POOL_MAX,
            listenHost: envs.DB_LISTEN_HOST,
            listenPort: envs.DB_LISTEN_PORT,
        }),
        QueueModule.forRoot({
            requestTimeoutMs: envs.QUEUE_REQUEST_TIMEOUT_MS,
        }),
    ],
    controllers: [HealthController, JobsController, JobsSyncController],
})
export class AppModule {}

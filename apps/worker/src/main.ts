import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { PgQueueServer } from '@app/queue';
import { envs } from './config/envs.js';
import { WorkerModule } from './worker.module.js';

async function bootstrap() {
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
        WorkerModule,
        {
            strategy: new PgQueueServer({
                host: envs.DB_HOST,
                port: envs.DB_PORT,
                database: envs.DB_NAME,
                user: envs.DB_USER,
                password: envs.DB_PASS,
                staleJobTimeoutMs: envs.QUEUE_STALE_JOB_TIMEOUT_MS,
                staleJobCheckIntervalMs: envs.QUEUE_STALE_JOB_CHECK_INTERVAL_MS,
                maxConnections: envs.QUEUE_MAX_CONNECTIONS,
                listenHost: envs.DB_LISTEN_HOST,
                listenPort: envs.DB_LISTEN_PORT,
                workerId: envs.WORKER_ID,
            }),
        },
    );

    app.enableShutdownHooks();
    await app.listen();
}

bootstrap();

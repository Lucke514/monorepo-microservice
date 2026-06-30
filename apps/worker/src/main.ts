import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { createListenClient, createPgPool } from '@app/database';
import type { DatabaseConfig } from '@app/database';
import { PgQueueServer } from '@app/queue';
import { envs } from './config/envs.js';
import { WorkerModule } from './worker.module.js';

async function bootstrap() {
    const dbConfig: DatabaseConfig = {
        host: envs.DB_HOST,
        port: envs.DB_PORT,
        database: envs.DB_NAME,
        username: envs.DB_USER,
        password: envs.DB_PASS,
        poolMax: envs.QUEUE_MAX_CONNECTIONS,
        listenHost: envs.DB_LISTEN_HOST,
        listenPort: envs.DB_LISTEN_PORT,
    };

    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
        WorkerModule,
        {
            strategy: new PgQueueServer({
                pool: createPgPool(dbConfig),
                createListenClient: () => createListenClient(dbConfig),
                staleJobTimeoutMs: envs.QUEUE_STALE_JOB_TIMEOUT_MS,
                staleJobCheckIntervalMs: envs.QUEUE_STALE_JOB_CHECK_INTERVAL_MS,
                workerId: envs.WORKER_ID,
            }),
        },
    );

    app.enableShutdownHooks();
    await app.listen();
}

bootstrap();

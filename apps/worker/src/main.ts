import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { PgQueueServer } from '@app/queue';
import { WorkerModule } from './worker.module.js';

async function bootstrap() {
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
        WorkerModule,
        {
            strategy: new PgQueueServer({
                host: process.env['DB_HOST'] ?? 'localhost',
                port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
                database: process.env['DB_NAME'] ?? 'queue_db',
                user: process.env['DB_USER'] ?? 'postgres',
                password: process.env['DB_PASS'] ?? 'postgres',
                staleJobTimeoutMs: 300_000,
                staleJobCheckIntervalMs: 30_000,
            }),
        },
    );

    app.enableShutdownHooks();
    await app.listen();
}

bootstrap();

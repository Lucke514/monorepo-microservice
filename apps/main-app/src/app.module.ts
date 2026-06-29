import { Module } from '@nestjs/common';
import { QueueModule } from '@app/queue';
import { envs } from './config/envs';
import { HealthController } from './health/health.controller';

@Module({
    imports: [
        QueueModule.forRoot({
            host: envs.DB_HOST,
            port: envs.DB_PORT,
            database: envs.DB_NAME,
            username: envs.DB_USER,
            password: envs.DB_PASS,
            synchronize: envs.NODE_ENV !== 'production',
        }),
    ],
    controllers: [HealthController],
})
export class AppModule {}

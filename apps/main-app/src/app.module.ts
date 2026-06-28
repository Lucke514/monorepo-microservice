import { Module } from '@nestjs/common';
import { QueueModule } from '@app/queue';

@Module({
  imports: [
    QueueModule.forRoot({
      host: process.env['DB_HOST'] ?? 'localhost',
      port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
      database: process.env['DB_NAME'] ?? 'queue_db',
      username: process.env['DB_USER'] ?? 'postgres',
      password: process.env['DB_PASS'] ?? 'postgres',
      synchronize: process.env['NODE_ENV'] !== 'production',
    }),
  ],
})
export class AppModule {}

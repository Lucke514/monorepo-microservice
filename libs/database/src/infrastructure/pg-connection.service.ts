import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Client, Pool } from 'pg';
import { DATABASE_CONFIG } from '../domain/constants/database.constants.js';
import type { DatabaseConfig } from '../domain/constants/database.constants.js';
import { createListenClient,createPgPool } from './pg-connection.factory.js';

@Injectable()
export class PgConnectionService implements OnModuleInit, OnModuleDestroy {
    private pool: Pool;

    constructor(
        @Inject(DATABASE_CONFIG) private readonly config: DatabaseConfig,
    ) {}

    onModuleInit(): void {
        this.pool = createPgPool(this.config);
    }

    async onModuleDestroy(): Promise<void> {
        await this.pool?.end().catch(() => undefined);
    }

    getPool(): Pool {
        return this.pool;
    }

    createListenClient(): Client {
        return createListenClient(this.config);
    }
}

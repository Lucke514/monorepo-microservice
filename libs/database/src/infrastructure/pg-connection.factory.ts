import { Client, Pool } from 'pg';
import type { DatabaseConfig } from '../domain/constants/database.constants.js';

export function createPgPool(config: DatabaseConfig): Pool {
    return new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        max: config.poolMax ?? 10,
    });
}

export function createListenClient(config: DatabaseConfig): Client {
    return new Client({
        host: config.listenHost ?? config.host,
        port: config.listenPort ?? config.port,
        database: config.database,
        user: config.username,
        password: config.password,
    });
}

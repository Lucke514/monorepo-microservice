export const DATABASE_CONFIG = Symbol('DATABASE_CONFIG');

export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    synchronize?: boolean;
    poolMax?: number;
    listenHost?: string;
    listenPort?: number;
}

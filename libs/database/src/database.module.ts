import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DATABASE_CONFIG } from './domain/constants/database.constants.js';
import type { DatabaseConfig } from './domain/constants/database.constants.js';
import { PgConnectionService } from './infrastructure/pg-connection.service.js';

export { DATABASE_CONFIG };
export type { DatabaseConfig };

export interface DatabaseModuleOptions extends DatabaseConfig {
    name?: string;
}

export interface DatabaseModuleAsyncOptions {
    name?: string;
    useFactory: (
        ...args: unknown[]
    ) => DatabaseConfig | Promise<DatabaseConfig>;
    inject?: unknown[];
    imports?: unknown[];
}

function typeOrmOptions(name: string | undefined, config: DatabaseConfig) {
    return {
        name,
        type: 'postgres' as const,
        host: config.host,
        port: config.port,
        database: config.database,
        username: config.username,
        password: config.password,
        synchronize: config.synchronize ?? false,
        autoLoadEntities: true,
        extra: { max: config.poolMax ?? 10 },
    };
}

@Module({})
export class DatabaseModule {
    static forRoot(options: DatabaseModuleOptions): DynamicModule {
        const { name, ...config } = options;
        return {
            module: DatabaseModule,
            global: true,
            imports: [TypeOrmModule.forRoot(typeOrmOptions(name, config))],
            providers: [
                { provide: DATABASE_CONFIG, useValue: config },
                PgConnectionService,
            ],
            exports: [TypeOrmModule, PgConnectionService],
        };
    }

    static forRootAsync(options: DatabaseModuleAsyncOptions): DynamicModule {
        return {
            module: DatabaseModule,
            global: true,
            imports: [
                TypeOrmModule.forRootAsync({
                    name: options.name,
                    useFactory: async (...args: unknown[]) => {
                        const config = await options.useFactory(...args);
                        return typeOrmOptions(options.name, config);
                    },
                    inject: options.inject as never[] | undefined,
                    imports: options.imports as never[] | undefined,
                }),
                ...((options.imports as never[]) ?? []),
            ],
            providers: [
                {
                    provide: DATABASE_CONFIG,
                    useFactory: options.useFactory,
                    inject: options.inject as never[] | undefined,
                },
                PgConnectionService,
            ],
            exports: [TypeOrmModule, PgConnectionService],
        };
    }
}

import * as joi from 'joi';
import * as dotenv from 'dotenv';
import { hostname } from 'os';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), 'apps/worker/.env.local') });

interface EnvVars {
    NODE_ENV: 'development' | 'production' | 'test';
    DB_HOST: string;
    DB_PORT: number;
    DB_NAME: string;
    DB_USER: string;
    DB_PASS: string;
    DB_LISTEN_HOST: string;
    DB_LISTEN_PORT: number;
    QUEUE_STALE_JOB_TIMEOUT_MS: number;
    QUEUE_STALE_JOB_CHECK_INTERVAL_MS: number;
    QUEUE_MAX_RETRIES: number;
    QUEUE_MAX_CONNECTIONS: number;
    WORKER_ID: string;
}

const envsSchema = joi
    .object({
        NODE_ENV: joi
            .string()
            .valid('development', 'production', 'test')
            .default('development'),
        DB_HOST: joi.string().required(),
        DB_PORT: joi.number().required(),
        DB_NAME: joi.string().required(),
        DB_USER: joi.string().required(),
        DB_PASS: joi.string().required(),
        // LISTEN directo a Postgres cuando hay PgBouncer; por defecto = DB_HOST/PORT.
        DB_LISTEN_HOST: joi.string().default(joi.ref('DB_HOST')),
        DB_LISTEN_PORT: joi.number().default(joi.ref('DB_PORT')),
        QUEUE_STALE_JOB_TIMEOUT_MS: joi.number().default(300_000),
        QUEUE_STALE_JOB_CHECK_INTERVAL_MS: joi.number().default(30_000),
        QUEUE_MAX_RETRIES: joi.number().default(3),
        QUEUE_MAX_CONNECTIONS: joi.number().default(20),
        WORKER_ID: joi.string().default(hostname()),
    })
    .unknown(true);

// Cargar los errores del esquema de validación
const validationResult = envsSchema.validate(process.env) as {
    error?: joi.ValidationError;
    value: EnvVars;
};

// Asignar las variables de entorno validadas al objeto global process.env
if (validationResult.error) {
    throw new Error(
        `Error en las variables de entorno: ${validationResult.error.message}`,
    );
}

// En caso de que la validación sea exitosa, asignar las variables al objeto global
const { value } = validationResult;
export const envs: EnvVars = {
    NODE_ENV: value.NODE_ENV,
    DB_HOST: value.DB_HOST,
    DB_PORT: value.DB_PORT,
    DB_NAME: value.DB_NAME,
    DB_USER: value.DB_USER,
    DB_PASS: value.DB_PASS,
    DB_LISTEN_HOST: value.DB_LISTEN_HOST,
    DB_LISTEN_PORT: value.DB_LISTEN_PORT,
    QUEUE_STALE_JOB_TIMEOUT_MS: value.QUEUE_STALE_JOB_TIMEOUT_MS,
    QUEUE_STALE_JOB_CHECK_INTERVAL_MS: value.QUEUE_STALE_JOB_CHECK_INTERVAL_MS,
    QUEUE_MAX_RETRIES: value.QUEUE_MAX_RETRIES,
    QUEUE_MAX_CONNECTIONS: value.QUEUE_MAX_CONNECTIONS,
    WORKER_ID: value.WORKER_ID,
};

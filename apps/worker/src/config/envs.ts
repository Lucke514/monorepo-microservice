import * as joi from 'joi';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), 'apps/worker/.env.local') });

interface EnvVars {
    NODE_ENV: 'development' | 'production' | 'test';
    DB_HOST: string;
    DB_PORT: number;
    DB_NAME: string;
    DB_USER: string;
    DB_PASS: string;
    QUEUE_STALE_JOB_TIMEOUT_MS: number;
    QUEUE_STALE_JOB_CHECK_INTERVAL_MS: number;
    QUEUE_MAX_RETRIES: number;
}

const envsSchema = joi
    .object({
        NODE_ENV: joi.string().valid('development', 'production', 'test').default('development'),
        DB_HOST: joi.string().required(),
        DB_PORT: joi.number().required(),
        DB_NAME: joi.string().required(),
        DB_USER: joi.string().required(),
        DB_PASS: joi.string().required(),
        QUEUE_STALE_JOB_TIMEOUT_MS: joi.number().default(300_000),
        QUEUE_STALE_JOB_CHECK_INTERVAL_MS: joi.number().default(30_000),
        QUEUE_MAX_RETRIES: joi.number().default(3),
    })
    .unknown(true);

// Cargar los errores del esquema de validación
const validationResult = envsSchema.validate(process.env) as { error?: joi.ValidationError; value: EnvVars };

// Asignar las variables de entorno validadas al objeto global process.env
if (validationResult.error) {
    throw new Error(`Error en las variables de entorno: ${validationResult.error.message}`);
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
    QUEUE_STALE_JOB_TIMEOUT_MS: value.QUEUE_STALE_JOB_TIMEOUT_MS,
    QUEUE_STALE_JOB_CHECK_INTERVAL_MS: value.QUEUE_STALE_JOB_CHECK_INTERVAL_MS,
    QUEUE_MAX_RETRIES: value.QUEUE_MAX_RETRIES,
};

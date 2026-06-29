import * as joi from 'joi';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), 'apps/main-app/.env.local') });

interface EnvVars {
    PORT: number;
    NODE_ENV: 'development' | 'production' | 'test';
    DB_HOST: string;
    DB_PORT: number;
    DB_NAME: string;
    DB_USER: string;
    DB_PASS: string;
}

const envsSchema = joi
    .object({
        PORT: joi.number().required(),
        NODE_ENV: joi.string().valid('development', 'production', 'test').default('development'),
        DB_HOST: joi.string().required(),
        DB_PORT: joi.number().required(),
        DB_NAME: joi.string().required(),
        DB_USER: joi.string().required(),
        DB_PASS: joi.string().required(),
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
    PORT: value.PORT,
    NODE_ENV: value.NODE_ENV,
    DB_HOST: value.DB_HOST,
    DB_PORT: value.DB_PORT,
    DB_NAME: value.DB_NAME,
    DB_USER: value.DB_USER,
    DB_PASS: value.DB_PASS,
};

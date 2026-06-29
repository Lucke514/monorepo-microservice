// Token e interfaz de configuración de la cola.
// Viven en su propio módulo para evitar el import circular entre
// queue.module.ts y los providers que inyectan QUEUE_CONFIG
// (p. ej. StaleJobRecoveryService).

export const QUEUE_CONFIG = Symbol('QUEUE_CONFIG');

export interface QueueModuleOptions {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    synchronize?: boolean;
    staleJobTimeoutMs?: number;
    staleJobCheckIntervalMs?: number;
}

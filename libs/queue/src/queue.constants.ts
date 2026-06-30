// Token e interfaz de configuración de la cola.
// Viven en su propio módulo para evitar el import circular entre
// queue.module.ts y los providers que inyectan QUEUE_CONFIG
// (p. ej. RequestJobUseCase, JobReplyWaiterService).

export const QUEUE_CONFIG = Symbol('QUEUE_CONFIG');

// Canal pg_notify por el que el worker avisa que un job alcanzó un estado terminal
// (done/failed). El productor (request/reply) lo escucha para resolver al instante.
export const JOBS_REPLY_CHANNEL = 'jobs_reply';

export interface QueueModuleOptions {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    synchronize?: boolean;
    requestTimeoutMs?: number;
    // Tamaño máximo de los pools de conexión del lado productor: el de TypeORM
    // (enqueue) y el del JobReplyWaiterService (SELECT de replies).
    poolMax?: number;
    // El cliente LISTEN del reply waiter debe ir DIRECTO a Postgres (LISTEN no
    // funciona vía PgBouncer transaction). Los pools van por host/port (PgBouncer).
    // Si no se setea, cae a host/port.
    listenHost?: string;
    listenPort?: number;
}

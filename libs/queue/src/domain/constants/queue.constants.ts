export const QUEUE_CONFIG = Symbol('QUEUE_CONFIG');

export const JOBS_REPLY_CHANNEL = 'jobs_reply';

export interface QueueModuleOptions {
    requestTimeoutMs?: number;
}

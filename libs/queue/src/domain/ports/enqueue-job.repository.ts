export interface EnqueueOptions {
    maxRetries?: number;
}

export abstract class EnqueueJobRepository {
    abstract enqueue(
        queueName: string,
        payload: Record<string, unknown>,
        options?: EnqueueOptions,
    ): Promise<string>;
}

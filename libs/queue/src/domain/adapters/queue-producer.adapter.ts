export interface EmitOptions {
  maxRetries?: number;
}

export abstract class QueueProducerAdapter {
  abstract emit(
    queueName: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ): Promise<string>;
}

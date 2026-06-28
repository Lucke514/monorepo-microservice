import { Injectable } from '@nestjs/common';
import { EmitOptions, QueueProducerAdapter } from '../domain/adapters/queue-producer.adapter.js';
import { EnqueueJobRepository } from '../domain/ports/enqueue-job.repository.js';

@Injectable()
export class EnqueueJobUseCase extends QueueProducerAdapter {
  constructor(private readonly enqueueJobRepository: EnqueueJobRepository) {
    super();
  }

  emit(
    queueName: string,
    payload: Record<string, unknown>,
    options?: EmitOptions,
  ): Promise<string> {
    return this.enqueueJobRepository.enqueue(queueName, payload, options);
  }
}

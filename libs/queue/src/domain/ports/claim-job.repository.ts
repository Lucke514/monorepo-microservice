import { JobEntity } from '../entities/job.entity.js';

export abstract class ClaimJobRepository {
  abstract claim(queueName: string): Promise<JobEntity | null>;
}

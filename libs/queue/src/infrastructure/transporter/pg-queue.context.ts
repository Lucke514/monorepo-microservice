import { BaseRpcContext } from '@nestjs/microservices';
import { JobEntity } from '../../domain/entities/job.entity.js';

export class PgQueueContext extends BaseRpcContext<[JobEntity]> {
    getJob(): JobEntity {
        return this.args[0];
    }
}

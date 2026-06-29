export enum JobStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    DONE = 'done',
    FAILED = 'failed',
}

export interface JobEntity {
    id: string;
    queueName: string;
    payload: Record<string, unknown>;
    status: JobStatus;
    attempts: number;
    maxRetries: number;
    lockedAt: Date | null;
    createdAt: Date;
    processedAt: Date | null;
    errorMessage: string | null;
}

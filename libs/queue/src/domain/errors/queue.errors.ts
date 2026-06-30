export class JobTimeoutError extends Error {
    constructor(jobId: string, timeoutMs: number) {
        super(`Job ${jobId} did not complete within ${timeoutMs}ms`);
        this.name = 'JobTimeoutError';
    }
}

export class JobFailedError extends Error {
    constructor(jobId: string, reason: string) {
        super(`Job ${jobId} failed: ${reason}`);
        this.name = 'JobFailedError';
    }
}

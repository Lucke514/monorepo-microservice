export abstract class FindStaleJobsRepository {
    abstract rescheduleStale(timeoutMs: number): Promise<number>;
    abstract failExpired(timeoutMs: number): Promise<number>;
}

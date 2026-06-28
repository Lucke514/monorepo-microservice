export abstract class FailJobRepository {
  abstract fail(jobId: string, errorMessage: string, reschedule: boolean): Promise<void>;
}

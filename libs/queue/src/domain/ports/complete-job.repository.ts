export abstract class CompleteJobRepository {
  abstract complete(jobId: string): Promise<void>;
}

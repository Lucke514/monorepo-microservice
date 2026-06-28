export abstract class DeleteCacheRepository {
  abstract deleteCache(key: string): Promise<void>;
  abstract clearCache(): Promise<void>;
}

export abstract class SaveCacheRepository {
  abstract saveCache(key: string, value: any): Promise<void>;
  abstract saveCacheWithExpiration(key: string, value: any, minutes: number): Promise<void>;
}
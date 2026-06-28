export abstract class CacheAdapter {
  abstract getCache(key: string): Promise<any>;
  abstract saveCache(key: string, value: any): Promise<void>;
  abstract saveCacheWithExpiration(key: string, value: any, minutes: number): Promise<void>;
  abstract deleteCache(key: string): Promise<void>;
  abstract clearCache(): Promise<void>;
  abstract updateCache(key: string, value: any): Promise<void>;
  abstract updateCacheWithExpiration(key: string, value: any, minutes: number): Promise<void>;
}

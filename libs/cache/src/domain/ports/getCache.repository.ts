export abstract class GetCacheRepository {
    abstract getCache(key: string): Promise<any>;
}

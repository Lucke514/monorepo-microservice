export abstract class UpdateCacheRepository {
    abstract updateCache(key: string, value: any): Promise<void>;
    abstract updateCacheWithExpiration(
        key: string,
        value: any,
        minutes: number,
    ): Promise<void>;
}

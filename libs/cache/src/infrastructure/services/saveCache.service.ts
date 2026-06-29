import { SaveCacheRepository } from '@app/cache/domain/ports/saveCache.repository';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';

@Injectable()
export class SaveCacheService implements SaveCacheRepository {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

    async saveCache(key: string, value: any): Promise<void> {
        await this.cacheManager.set(key, value);
    }

    async saveCacheWithExpiration(
        key: string,
        value: any,
        minutes: number,
    ): Promise<void> {
        await this.cacheManager.set(key, value, minutes * 60);
    }
}

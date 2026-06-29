import { DeleteCacheRepository } from '@app/cache/domain/ports/deleteCache.repository';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';

@Injectable()
export class DeleteCacheService implements DeleteCacheRepository {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

    async deleteCache(key: string): Promise<void> {
        await this.cacheManager.del(key);
    }

    async clearCache(): Promise<void> {
        await this.cacheManager.clear();
    }
}

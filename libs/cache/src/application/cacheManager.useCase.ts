import { Injectable } from '@nestjs/common';
import { GetCacheRepository } from '../domain/ports/getCache.repository';
import { SaveCacheRepository } from '../domain/ports/saveCache.repository';
import { DeleteCacheRepository } from '../domain/ports/deleteCache.repository';
import { UpdateCacheRepository } from '../domain/ports/updateCache.repository';
import { CacheAdapter } from '../domain/adapters/cache.adapter';

@Injectable()
export class CacheManagerUseCase implements CacheAdapter {
    constructor(
        private readonly getCacheRepository: GetCacheRepository,
        private readonly saveCacheRepository: SaveCacheRepository,
        private readonly deleteCacheRepository: DeleteCacheRepository,
        private readonly updateCacheRepository: UpdateCacheRepository,
    ) {}

    async getCache(key: string): Promise<any> {
        return this.getCacheRepository.getCache(key);
    }

    async saveCache(key: string, value: any): Promise<void> {
        return this.saveCacheRepository.saveCache(key, value);
    }

    async saveCacheWithExpiration(
        key: string,
        value: any,
        minutes: number,
    ): Promise<void> {
        return this.saveCacheRepository.saveCacheWithExpiration(
            key,
            value,
            minutes,
        );
    }

    async deleteCache(key: string): Promise<void> {
        return this.deleteCacheRepository.deleteCache(key);
    }

    async clearCache(): Promise<void> {
        return this.deleteCacheRepository.clearCache();
    }

    async updateCache(key: string, value: any): Promise<void> {
        return this.updateCacheRepository.updateCache(key, value);
    }

    async updateCacheWithExpiration(
        key: string,
        value: any,
        minutes: number,
    ): Promise<void> {
        return this.updateCacheRepository.updateCacheWithExpiration(
            key,
            value,
            minutes,
        );
    }
}

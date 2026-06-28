import { GetCacheRepository } from "@app/cache/domain/ports/getCache.repository";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import type { Cache } from "cache-manager";

@Injectable()
export class GetCacheService implements GetCacheRepository {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

    async getCache(key: string) : Promise<any> {
        return (await this.cacheManager.get(key)) as any;
    }
}
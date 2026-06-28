import { UpdateCacheRepository } from "@app/cache/domain/ports/updateCache.repository";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import type { Cache } from "cache-manager";

@Injectable()
export class UpdateCacheService implements UpdateCacheRepository {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async updateCache(key: string, value: any): Promise<void> {
    await this.cacheManager.set(key, value);
  }

  async updateCacheWithExpiration(key: string, value: any, minutes: number): Promise<void> {
    await this.cacheManager.set(key, value, minutes * 60);
  }
}

import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { CacheManagerUseCase } from './application/cacheManager.useCase';
import { GetCacheRepository } from './domain/ports/getCache.repository';
import { SaveCacheRepository } from './domain/ports/saveCache.repository';
import { DeleteCacheRepository } from './domain/ports/deleteCache.repository';
import { UpdateCacheRepository } from './domain/ports/updateCache.repository';
import { GetCacheService } from './infrastructure/services/getCache.service';
import { SaveCacheService } from './infrastructure/services/saveCache.service';
import { DeleteCacheService } from './infrastructure/services/deleteCache.service';
import { UpdateCacheService } from './infrastructure/services/updateCache.service';

@Module({
  imports: [NestCacheModule.register()],
  providers: [
    CacheManagerUseCase,
    { provide: GetCacheRepository, useClass: GetCacheService },
    { provide: SaveCacheRepository, useClass: SaveCacheService },
    { provide: DeleteCacheRepository, useClass: DeleteCacheService },
    { provide: UpdateCacheRepository, useClass: UpdateCacheService },
  ],
  exports: [CacheManagerUseCase],
})
export class CacheModule {}

import { FactoryProvider, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FSLogDAO } from './fs/fsLog.dao';
import { MemoryLogDAO } from './memory/memoryLog.dao';
import { MongoDBLogDAO } from './mongo/mongoLog.dao';
export const LogDaoFactory: Provider<FactoryProvider> = {
  provide: 'LogDAO',
  useFactory: (configService: ConfigService) => {
    return {
      mongodb: MongoDBLogDAO,
      fs: FSLogDAO,
      memory: MemoryLogDAO,
    }[configService.get('persistence')];
  },
  inject: [ConfigService],
};

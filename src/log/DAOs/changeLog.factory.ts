import { FactoryProvider, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FSChangeLogDAO } from './fs/fsChangeLog.dao';
import { MemoryChangeLogDAO } from './memory/memoryChangeLog.dao';
import { MongoDBChangeLogDAO } from './mongo/mongoChangeLog.dao';
import { TChangeLogDAO } from '../types/daoLog.type';
export const ChangeLogDaoFactory: Provider<FactoryProvider<TChangeLogDAO>> = {
  provide: 'ChangeLogDAO',
  useFactory: (
    configService: ConfigService,
    mongoDBChangeLogDAO: MongoDBChangeLogDAO,
    fsChangeLogDAO: FSChangeLogDAO,
    memoryChangeLogDAO: MemoryChangeLogDAO,
  ) => {
    return {
      mongodb: mongoDBChangeLogDAO,
      fs: fsChangeLogDAO,
      memory: memoryChangeLogDAO,
    }[configService.get('persistence')];
  },
  inject: [
    ConfigService,
    MongoDBChangeLogDAO,
    FSChangeLogDAO,
    MemoryChangeLogDAO,
  ],
};

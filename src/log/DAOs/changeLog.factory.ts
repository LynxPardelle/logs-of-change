import { FactoryProvider, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FSChangeLogDAO } from './fs/fsChangeLog.dao';
import { MongoDBChangeLogDAO } from './mongo/mongoChangeLog.dao';
import { TChangeLogDAO } from '../types/daoLog.type';
export const ChangeLogDaoFactory: Provider<FactoryProvider<TChangeLogDAO>> = {
  provide: 'ChangeLogDAO',
  useFactory: (
    configService: ConfigService,
    mongoDBChangeLogDAO: MongoDBChangeLogDAO,
    fsChangeLogDAO: FSChangeLogDAO,
  ) => {
    return {
      mongodb: mongoDBChangeLogDAO,
      fs: fsChangeLogDAO,
    }[configService.get('persistence')];
  },
  inject: [ConfigService, MongoDBChangeLogDAO, FSChangeLogDAO],
};

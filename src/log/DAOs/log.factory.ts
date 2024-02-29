import { FactoryProvider, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FSLogDAO } from './fs/fsLog.dao';
import { MongoDBLogDAO } from './mongo/mongoLog.dao';
import { TLogDAO } from '../types/daoLog.type';
export const LogDaoFactory: Provider<FactoryProvider<TLogDAO>> = {
  provide: 'LogDAO',
  useFactory: (
    configService: ConfigService,
    MongoDBLogDAO: MongoDBLogDAO,
    FSLogDAO: FSLogDAO,
  ) => {
    return {
      mongodb: MongoDBLogDAO,
      fs: FSLogDAO,
    }[configService.get('persistence')];
  },
  inject: [ConfigService, MongoDBLogDAO, FSLogDAO],
};

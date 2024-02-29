import { FactoryProvider, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FSLogSectionDAO } from './fs/fsLogSection.dao';
import { MongoDBLogSectionDAO } from './mongo/mongoLogSection.dao';
import { TLogSectionDAO } from '../types/daoLog.type';
export const LogSectionDaoFactory: Provider<FactoryProvider<TLogSectionDAO>> = {
  provide: 'LogSectionDAO',
  useFactory: (
    configService: ConfigService,
    mongoDBLogSectionDAO: MongoDBLogSectionDAO,
    fsLogSectionDAO: FSLogSectionDAO,
  ) => {
    return {
      mongodb: mongoDBLogSectionDAO,
      fs: fsLogSectionDAO,
    }[configService.get('persistence')];
  },
  inject: [ConfigService, MongoDBLogSectionDAO, FSLogSectionDAO],
};

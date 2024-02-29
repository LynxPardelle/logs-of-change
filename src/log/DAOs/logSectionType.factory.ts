import { FactoryProvider, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FSLogSectionTypeDAO } from './fs/fsLogSectionType.dao';
import { MongoDBLogSectionTypeDAO } from './mongo/mongoLogSectionType.dao';
import { TLogSectionTypeDAO } from '../types/daoLog.type';
export const LogSectionTypeDaoFactory: Provider<
  FactoryProvider<TLogSectionTypeDAO>
> = {
  provide: 'LogSectionTypeDAO',
  useFactory: (
    configService: ConfigService,
    mongoDBLogSectionTypeDAO: MongoDBLogSectionTypeDAO,
    fsLogSectionTypeDAO: FSLogSectionTypeDAO,
  ) => {
    return {
      mongodb: mongoDBLogSectionTypeDAO,
      fs: fsLogSectionTypeDAO,
    }[configService.get('persistence')];
  },
  inject: [ConfigService, MongoDBLogSectionTypeDAO, FSLogSectionTypeDAO],
};

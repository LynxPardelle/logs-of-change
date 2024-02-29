import { FactoryProvider, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FSLogMediaDAO } from './fs/fsLogMedia.dao';
import { MongoDBLogMediaDAO } from './mongo/mongoLogMedia.dao';
import { TLogMediaDAO } from '../types/daoLog.type';
export const LogMediaDaoFactory: Provider<FactoryProvider<TLogMediaDAO>> = {
  provide: 'LogMediaDAO',
  useFactory: (
    configService: ConfigService,
    mongoDBLogMediaDAO: MongoDBLogMediaDAO,
    fsLogMediaDAO: FSLogMediaDAO,
  ) => {
    return {
      mongodb: mongoDBLogMediaDAO,
      fs: fsLogMediaDAO,
    }[configService.get('persistence')];
  },
  inject: [ConfigService, MongoDBLogMediaDAO, FSLogMediaDAO],
};

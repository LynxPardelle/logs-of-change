import { FactoryProvider, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FSLogTextDAO } from './fs/fsLogText.dao';
import { MongoDBLogTextDAO } from './mongo/mongoLogText.dao';
import { TLogTextDAO } from '../types/daoLog.type';
export const LogTextDaoFactory: Provider<FactoryProvider<TLogTextDAO>> = {
  provide: 'LogTextDAO',
  useFactory: (
    configService: ConfigService,
    mongoDBLogTextDAO: MongoDBLogTextDAO,
    fsLogTextDAO: FSLogTextDAO,
  ) => {
    return {
      mongodb: mongoDBLogTextDAO,
      fs: fsLogTextDAO,
    }[configService.get('persistence')];
  },
  inject: [ConfigService, MongoDBLogTextDAO, FSLogTextDAO],
};

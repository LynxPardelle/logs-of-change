import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
/* Modules */
import { SharedModule } from '@src/shared/shared.module';
/* Controllers */
import { ChangeLogController } from './controllers/change-log.controller';
import { LogController } from './controllers/log.controller';
import { LogMediaController } from './controllers/log-media.controller';
import { LogSectionController } from './controllers/log-section.controller';
import { LogSectionTypeController } from './controllers/log-section-type.controller';
import { LogTextController } from './controllers/log-text.controller';
/* Services */
import { ChangeLogService } from './services/change-log.service';
import { LogService } from './services/log.service';
import { LogMediaService } from './services/log-media.service';
import { LogSectionService } from './services/log-section.service';
import { LogSectionTypeService } from './services/log-section-type.service';
import { LogTextService } from './services/log-text.service';
/* Repositories */
import ChangeLogRepository from './repositories/changeLog.repository';
import LogRepository from './repositories/log.repository';
import LogMediaRepository from './repositories/logMedia.repository';
import LogSectionRepository from './repositories/logSection.repository';
import LogSectionTypeRepository from './repositories/logSectionType.repository';
import LogTextRepository from './repositories/logText.repository';
/* Factories */
import { ChangeLogDaoFactory } from './DAOs/changeLog.factory';
import { LogDaoFactory } from './DAOs/log.factory';
import { LogMediaDaoFactory } from './DAOs/logMedia.factory';
import { LogSectionDaoFactory } from './DAOs/logSection.factory';
import { LogSectionTypeDaoFactory } from './DAOs/logSectionType.factory';
import { LogTextDaoFactory } from './DAOs/logText.factory';
/* Schemas */
import { logModuleSchemaFactory } from './schemas/log.module.schema.factory';
/* DAOs */
import { MongoDBChangeLogDAO } from './DAOs/mongo/mongoChangeLog.dao';
import { FSChangeLogDAO } from './DAOs/fs/fsChangeLog.dao';
import { MongoDBLogDAO } from './DAOs/mongo/mongoLog.dao';
import { FSLogDAO } from './DAOs/fs/fsLog.dao';
import { MongoDBLogMediaDAO } from './DAOs/mongo/mongoLogMedia.dao';
import { FSLogMediaDAO } from './DAOs/fs/fsLogMedia.dao';
import { MongoDBLogSectionDAO } from './DAOs/mongo/mongoLogSection.dao';
import { FSLogSectionDAO } from './DAOs/fs/fsLogSection.dao';
import { MongoDBLogSectionTypeDAO } from './DAOs/mongo/mongoLogSectionType.dao';
import { FSLogSectionTypeDAO } from './DAOs/fs/fsLogSectionType.dao';
import { MongoDBLogTextDAO } from './DAOs/mongo/mongoLogText.dao';
import { FSLogTextDAO } from './DAOs/fs/fsLogText.dao';
@Module({
  imports: [
    MongooseModule.forFeatureAsync(logModuleSchemaFactory),
    SharedModule,
  ],
  controllers: [
    ChangeLogController,
    LogController,
    LogMediaController,
    LogSectionController,
    LogSectionTypeController,
    LogTextController,
  ],
  providers: [
    /* Services */
    ChangeLogService,
    LogService,
    LogMediaService,
    LogSectionService,
    LogSectionTypeService,
    LogTextService,
    /* Repositories */
    ChangeLogRepository,
    LogRepository,
    LogMediaRepository,
    LogSectionRepository,
    LogSectionTypeRepository,
    LogTextRepository,
    /* Factories */
    ChangeLogDaoFactory,
    LogDaoFactory,
    LogMediaDaoFactory,
    LogSectionDaoFactory,
    LogSectionTypeDaoFactory,
    LogTextDaoFactory,
    /* DAOs */
    MongoDBChangeLogDAO,
    FSChangeLogDAO,
    MongoDBLogDAO,
    FSLogDAO,
    MongoDBLogMediaDAO,
    FSLogMediaDAO,
    MongoDBLogSectionDAO,
    FSLogSectionDAO,
    MongoDBLogSectionTypeDAO,
    FSLogSectionTypeDAO,
    MongoDBLogTextDAO,
    FSLogTextDAO,
  ],
  exports: [
    /* Services */
    ChangeLogService,
    LogService,
    LogMediaService,
    LogSectionService,
    LogSectionTypeService,
    LogTextService,
    /* Repositories */
    ChangeLogRepository,
    LogRepository,
    LogMediaRepository,
    LogSectionRepository,
    LogSectionTypeRepository,
    LogTextRepository,
    /* Factories */
    ChangeLogDaoFactory,
    LogDaoFactory,
    LogMediaDaoFactory,
    LogSectionDaoFactory,
    LogSectionTypeDaoFactory,
    LogTextDaoFactory,
    /* MongoDB */
    MongooseModule,
  ],
})
export class LogModule {}

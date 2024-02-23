import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
/* Modules */
import { SharedModule } from '@src/shared/shared.module';
/* Controllers */
import { ChangeLogController } from './controllers/change-log.controller';
import { LogController } from './controllers/log.controller';
/* Services */
import { ChangeLogService } from './services/change-log.service';
import { LogService } from './services/log.service';
/* Repositories */
import ChangeLogRepository from './repositories/changeLog.repository';
import LogRepository from './repositories/log.repository';
/* Factories */
import { ChangeLogDaoFactory } from './DAOs/changeLog.factory';
import { LogDaoFactory } from './DAOs/log.factory';
/* Schemas */
import { changeLogSchema } from './schemas/changeLog.schema';
import { logSchema } from './schemas/log.schema';
import { logMediaSchema } from './schemas/logMedia.schema';
import { logSectionSchema } from './schemas/logSection.schema';
import { logSectionTypeSchema } from './schemas/logSectionType.schema';
import { logTextSchema } from './schemas/logText.schema';
/* DAOs */
import { MongoDBChangeLogDAO } from './DAOs/mongo/mongoChangeLog.dao';
import { FSChangeLogDAO } from './DAOs/fs/fsChangeLog.dao';
import { MemoryChangeLogDAO } from './DAOs/memory/memoryChangeLog.dao';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'ChangeLog',
        schema: changeLogSchema,
      },
      {
        name: 'Log',
        schema: logSchema,
      },
      {
        name: 'LogSectionType',
        schema: logSectionTypeSchema,
      },
      {
        name: 'LogSection',
        schema: logSectionSchema,
      },
      {
        name: 'LogMedia',
        schema: logMediaSchema,
      },
      {
        name: 'LogText',
        schema: logTextSchema,
      },
    ]),
    SharedModule,
  ],
  controllers: [ChangeLogController, LogController],
  providers: [
    /* Services */
    ChangeLogService,
    LogService,
    /* Repositories */
    ChangeLogRepository,
    LogRepository,
    /* Factories */
    ChangeLogDaoFactory,
    LogDaoFactory,
    /* DAOs */
    MongoDBChangeLogDAO,
    FSChangeLogDAO,
    MemoryChangeLogDAO,
  ],
  exports: [
    /* Services */
    LogService,
    /* Repositories */
    ChangeLogRepository,
    LogRepository,
    /* Factories */
    ChangeLogDaoFactory,
    LogDaoFactory,
    /* MongoDB */
    MongooseModule.forFeature([
      {
        name: 'ChangeLog',
        schema: changeLogSchema,
      },
      {
        name: 'Log',
        schema: logSchema,
      },
      {
        name: 'LogSectionType',
        schema: logSectionTypeSchema,
      },
      {
        name: 'LogSection',
        schema: logSectionSchema,
      },
      {
        name: 'LogMedia',
        schema: logMediaSchema,
      },
      {
        name: 'LogText',
        schema: logTextSchema,
      },
    ]),
  ],
})
export class LogModule {}

import { AsyncModelFactory } from '@nestjs/mongoose';
import { changeLogSchemaFactory } from './changeLog.schema.factory';
import { logSchemaFactory } from './log.schema.factory';
import { logSectionTypeSchemaFactory } from './logSectionType.schema.factory';
import { logTextSchemaFactory } from './logText.schema.factory';
import { logMediaSchemaFactory } from './logMedia.schema.factory';
import { logSectionSchemaFactory } from './logSection.schema.factory';

export const logModuleSchemaFactory: AsyncModelFactory[] = [
  changeLogSchemaFactory,
  logSchemaFactory,
  logMediaSchemaFactory,
  logSectionSchemaFactory,
  logSectionTypeSchemaFactory,
  logTextSchemaFactory,
];

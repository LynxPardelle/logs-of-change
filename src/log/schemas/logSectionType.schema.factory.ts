import { AsyncModelFactory, getModelToken } from '@nestjs/mongoose';
import { ObjectId } from 'mongoose';
/* Types */
import { TLogSection, asTLogSection } from '../types/logSection.type';
/* Schemas */
import {
  LogSectionTypeDocument,
  logSectionTypeSchema,
} from './logSectionType.schema';
import { LogSectionDocument, LogSectionModel } from './logSection.schema';
import { ChangeLogDocument, ChangeLogModel } from './changeLog.schema';
export const logSectionTypeSchemaFactory: AsyncModelFactory = {
  name: 'LogSectionType',
  imports: [],
  useFactory: (
    logSectionModel: LogSectionModel,
    changeLogModel: ChangeLogModel,
  ) => {
    const schema = logSectionTypeSchema;
    schema.post('save', (doc: LogSectionTypeDocument) => {
      console.log('%s has been saved', doc._id);
    });
    schema.pre('validate', function (next) {
      console.log('validate', this);
      next();
    });
    schema.pre('save', function (next) {
      console.log('save', this);
      next();
    });
    schema.post('findOneAndDelete', async (doc: LogSectionTypeDocument) => {
      console.log(`doc deleted: `, doc);
      console.log(`${doc._id} has been removed`);
      const logSections: LogSectionDocument[] = await logSectionModel.find({
        logSectionType: [doc._id],
      });
      console.log('logSections: ', logSections);
      logSections.forEach(async (logSection: LogSectionDocument) => {
        console.log('updating logSection: ', logSection);
        const logSectionUpdated: LogSectionDocument =
          await logSectionModel.findByIdAndUpdate(
            logSection._id,
            { logSectionType: undefined },
            { new: true },
          );
        console.log('logSection updated: ', logSectionUpdated);
      });
      const changeLogs: ChangeLogDocument[] = await changeLogModel.find({
        logSectionTypes: { $in: [doc._id] },
      });
      console.log('changeLogs: ', changeLogs);
      changeLogs.forEach(async (changeLog: ChangeLogDocument) => {
        console.log('updating changeLog: ', changeLog);
        const changeLogUpdated: ChangeLogDocument =
          await changeLogModel.findByIdAndUpdate(
            changeLog._id,
            { $pull: { logSectionTypes: doc._id } },
            { new: true },
          );
        console.log('changeLog updated: ', changeLogUpdated);
      });
    });
    return schema;
  },
  inject: [],
};

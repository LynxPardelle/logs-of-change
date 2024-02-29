import { AsyncModelFactory, getModelToken } from '@nestjs/mongoose';
import { ObjectId, Model } from 'mongoose';
/* Types */
import { TLogSection, asTLogSection } from '../types/logSection.type';
/* Schemas */
import { LogDocument, logSchema } from './log.schema';
import { LogSectionDocument, LogSectionModel } from './logSection.schema';
import { ChangeLogDocument, ChangeLogModel } from './changeLog.schema';
export const logSchemaFactory: AsyncModelFactory = {
  name: 'Log',
  imports: [],
  useFactory: (
    logSectionModel: Model<LogSectionModel>,
    changeLogModel: Model<ChangeLogModel>,
  ) => {
    const schema = logSchema;
    schema.post('save', (doc: LogDocument) => {
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
    schema.post('findOneAndDelete', async (doc: LogDocument) => {
      console.log(`doc deleted: `, doc);
      console.log(`${doc._id} has been removed`);
      doc.logSections.forEach(
        async (logSection: string | TLogSection | ObjectId) => {
          console.log('deleting logSection: ', logSection);
          const logSection_id: string =
            typeof logSection === 'string'
              ? (logSection as string)
              : asTLogSection(logSection)._id;
          console.log('logSection_id: ', logSection_id);
          const logSectionDeleted: LogSectionDocument =
            await logSectionModel.findByIdAndDelete(logSection_id);
          console.log('logSection deleted: ', logSectionDeleted);
        },
      );
      const changeLogs: ChangeLogDocument[] = await changeLogModel.find({
        logs: { $in: [doc._id] },
      });
      console.log('changeLogs: ', changeLogs);
      changeLogs.forEach(async (changeLog: ChangeLogDocument) => {
        console.log('updating changeLog: ', changeLog);
        const changeLogUpdated: ChangeLogDocument =
          await changeLogModel.findByIdAndUpdate(
            changeLog._id,
            { $pull: { logs: doc._id } },
            { new: true },
          );
        console.log('changeLog updated: ', changeLogUpdated);
      });
    });
    return schema;
  },
  inject: [],
};

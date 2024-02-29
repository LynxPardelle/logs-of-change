import { AsyncModelFactory, getModelToken } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
/* Types */
import { TLog, asTLog } from '../types/log.type';
/* Schemas */
import { LogDocument, LogModel } from './log.schema';
import { ChangeLogDocument, changeLogSchema } from './changeLog.schema';
export const changeLogSchemaFactory: AsyncModelFactory = {
  name: 'ChangeLog',
  imports: [],
  useFactory: (logModel: Model<LogModel>) => {
    const schema = changeLogSchema;
    schema.post('save', (doc: ChangeLogDocument) => {
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
    schema.post('findOneAndDelete', async (doc: ChangeLogDocument) => {
      console.log(`doc deleted: `, doc);
      console.log(`${doc._id} has been removed`);
      doc.logs.forEach(async (log: string | TLog | ObjectId) => {
        console.log('deleting log: ', log);
        const log_id: string =
          typeof log === 'string' ? (log as string) : asTLog(log)._id;
        console.log('log_id: ', log_id);
        const logDeleted: LogDocument =
          await logModel.findByIdAndDelete(log_id);
        console.log('log deleted: ', logDeleted);
      });
    });
    return schema;
  },
  inject: [],
};

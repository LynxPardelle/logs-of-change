import { AsyncModelFactory, getModelToken } from '@nestjs/mongoose';
import { ObjectId } from 'mongoose';
/* Schemas */
import { LogTextDocument, logTextSchema } from './logText.schema';
import { LogSectionDocument, LogSectionModel } from './logSection.schema';
export const logTextSchemaFactory: AsyncModelFactory = {
  name: 'LogText',
  imports: [],
  useFactory: (logSectionModel: LogSectionModel) => {
    const schema = logTextSchema;
    schema.post('save', (doc: LogTextDocument) => {
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
    schema.post('findOneAndDelete', async (doc: LogTextDocument) => {
      console.log(`doc deleted: `, doc);
      console.log(`${doc._id} has been removed`);
      const logSections: LogSectionDocument[] = await logSectionModel.find({
        texts: { $in: [doc._id] },
      });
      console.log('logSections: ', logSections);
      logSections.forEach(async (logSection: LogSectionDocument) => {
        console.log('updating logSection: ', logSection);
        const logSectionUpdated: LogSectionDocument =
          await logSectionModel.findByIdAndUpdate(
            logSection._id,
            { $pull: { texts: doc._id } },
            { new: true },
          );
        console.log('logSection updated: ', logSectionUpdated);
      });
    });
    return schema;
  },
  inject: [],
};

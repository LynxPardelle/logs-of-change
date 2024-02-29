import { AsyncModelFactory, getModelToken } from '@nestjs/mongoose';
import { ObjectId } from 'mongoose';
/* Types */
import { TFile, isTFile } from '@src/shared/types/file.type';
/* Schemas */
import { FileDocument, FileModel } from '@src/shared/schemas/file.schema';
import { LogMediaDocument, logMediaSchema } from './logMedia.schema';
import { LogDocument, LogModel } from './log.schema';
export const logMediaSchemaFactory: AsyncModelFactory = {
  name: 'LogMedia',
  imports: [],
  useFactory: (fileModel: FileModel, logModel: LogModel) => {
    const schema = logMediaSchema;
    schema.post('save', (doc: LogMediaDocument) => {
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
    schema.post('findOneAndDelete', async (doc: LogMediaDocument) => {
      console.log(`doc deleted: `, doc);
      console.log(`${doc._id} has been removed`);
      if (doc.file) {
        const file_id: string =
          typeof doc.file === 'string' ? (doc.file as string) : doc.file._id;
        console.log('file_id: ', file_id);
        const fileDeleted: FileDocument =
          await fileModel.findByIdAndDelete(file_id);
        console.log('file deleted: ', fileDeleted);
      }
      const logs: LogDocument[] = await logModel.find({
        logMedias: { $in: [doc._id] },
      });
      console.log('logs: ', logs);
      logs.forEach(async (log: LogDocument) => {
        console.log('updating log: ', log);
        const logUpdated: LogDocument = await logModel.findByIdAndUpdate(
          log._id,
          { $pull: { logMedias: doc._id } },
          { new: true },
        );
        console.log('log updated: ', logUpdated);
      });
    });
    return schema;
  },
  inject: [],
};

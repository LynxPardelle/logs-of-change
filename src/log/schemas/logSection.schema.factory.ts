import { AsyncModelFactory, getModelToken } from '@nestjs/mongoose';
import { ObjectId } from 'mongoose';
/* Types */
import { TLogMedia, asTLogMedia } from '../types/logMedia.type';
import { TLogText, asTLogText } from '../types/logText.type';
/* Schemas */
import { LogSectionDocument, logSectionSchema } from './logSection.schema';
import { LogMediaDocument, LogMediaModel } from './logMedia.schema';
import { LogTextDocument, LogTextModel } from './logText.schema';
import { LogDocument, LogModel } from './log.schema';
import { LogSectionTypeModel } from './logSectionType.schema';
import { asTLogSectionType } from '../types/logSectionType.type';
export const logSectionSchemaFactory: AsyncModelFactory = {
  name: 'LogSection',
  imports: [],
  useFactory: (
    logMediaModel: LogMediaModel,
    logTextModel: LogTextModel,
    logModel: LogModel,
    logSectionTypeModel: LogSectionTypeModel,
  ) => {
    const schema = logSectionSchema;
    schema.post('save', (doc: LogSectionDocument) => {
      console.log('%s has been saved', doc._id);
    });
    schema.pre('validate', function (next) {
      console.log('validate', this);
      if (this.type) {
        console.log('logSectionType: ', this.type);
        const type_id: string =
          typeof this.type === 'string'
            ? (this.type as string)
            : asTLogSectionType(this.type)._id;
        logSectionTypeModel.findById(type_id).then((doc) => {
          console.log('logSectionType: ', doc);
          if (!doc) {
            next(new Error('LogSectionType does not exist'));
          }
        });
      }
      next();
    });
    schema.pre('save', function (next) {
      console.log('save', this);
      next();
    });
    schema.post('findOneAndDelete', async (doc: LogSectionDocument) => {
      console.log(`doc deleted: `, doc);
      console.log(`${doc._id} has been removed`);
      doc.media.forEach(async (media: string | TLogMedia | ObjectId) => {
        console.log('deleting media: ', media);
        const media_id: string =
          typeof media === 'string'
            ? (media as string)
            : asTLogMedia(media)._id;
        console.log('media_id: ', media_id);
        const mediaDeleted: LogMediaDocument =
          await logMediaModel.findByIdAndDelete(media_id);
        console.log('media deleted: ', mediaDeleted);
      });
      doc.texts.forEach(async (text: string | TLogText | ObjectId) => {
        console.log('deleting text: ', text);
        const text_id: string =
          typeof text === 'string' ? (text as string) : asTLogText(text)._id;
        console.log('text_id: ', text_id);
        const textDeleted: LogTextDocument =
          await logTextModel.findByIdAndDelete(text_id);
        console.log('text deleted: ', textDeleted);
      });
      const logs: LogDocument[] = await logModel.find({
        logSections: { $in: [doc._id] },
      });
      console.log('logs: ', logs);
      logs.forEach(async (log: LogDocument) => {
        console.log('updating log: ', log);
        const logUpdated: LogDocument = await logModel.findByIdAndUpdate(
          log._id,
          { $pull: { logSections: doc._id } },
          { new: true },
        );
        console.log('log updated: ', logUpdated);
      });
    });
    return schema;
  },
  inject: [],
};

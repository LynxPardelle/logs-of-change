import { AsyncModelFactory, getModelToken } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
/* Types */
import { asTFile, TFile } from '@src/shared/types/file.type';
/* Schemas */
import { FileDocument, FileModel } from '@src/shared/schemas/file.schema';
import { UserDocument, userSchema } from './user.schema';
export const userSchemaFactory: AsyncModelFactory = {
  name: 'User',
  imports: [],
  useFactory: (fileModel: Model<FileModel>) => {
    const schema = userSchema;
    schema.post('save', (doc: UserDocument) => {
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
    schema.post('findOneAndDelete', async (doc: UserDocument) => {
      console.log(`doc deleted: `, doc);
      const avatar_id: string =
        typeof doc.avatar === 'string' ? doc.avatar : asTFile(doc.avatar)._id;
      console.log('avatar_id: ', avatar_id);
      const avatarDeleted: FileDocument =
        await fileModel.findByIdAndDelete(avatar_id);
      console.log('avatar deleted: ', avatarDeleted);
    });
    return schema;
  },
  inject: [getModelToken('File')],
};

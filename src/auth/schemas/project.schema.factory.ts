import { AsyncModelFactory, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
/* Types */
import { asTChangeLog } from '@src/log/types/changeLog.type';
/* Schemas */
import { ProjectDocument, projectSchema } from './project.schema';
import {
  ChangeLogDocument,
  ChangeLogModel,
} from '@src/log/schemas/changeLog.schema';
import { UserModel } from './user.schema';
import { SubscriptionModel } from './subscription.schema';
export const projectSchemaFactory: AsyncModelFactory = {
  name: 'Project',
  imports: [],
  useFactory: (
    changeLogModel: Model<ChangeLogModel>,
    userModel: Model<UserModel>,
    subscriptionModel: Model<SubscriptionModel>,
  ) => {
    const schema = projectSchema;
    schema.post('save', (doc: ProjectDocument) => {
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
    schema.post('findOneAndDelete', async (doc: ProjectDocument) => {
      console.log(`doc deleted: `, doc);
      console.log(`${doc._id} has been removed`);
      const changeLog_id: string =
        typeof doc.changeLog === 'string'
          ? doc.changeLog
          : asTChangeLog(doc.changeLog)._id;
      console.log('changeLog_id: ', changeLog_id);
      const changeLogDeleted: ChangeLogDocument =
        await changeLogModel.findByIdAndDelete(changeLog_id);
      console.log('changeLog deleted: ', changeLogDeleted);
    });
    return schema;
  },
  inject: [getModelToken('User'), getModelToken('Subscription')],
};

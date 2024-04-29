import { AsyncModelFactory, getModelToken } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
/* Types */
import { TSubscription } from '../types/subscription.type';
/* Schemas */
import { SubscriptionDocument, SubscriptionModel } from './subscription.schema';
import { RoleDocument, roleSchema } from './role.schema';
export const roleSchemaFactory: AsyncModelFactory = {
  name: 'Role',
  imports: [],
  useFactory: (subscriptionModel: Model<SubscriptionModel>) => {
    const schema = roleSchema;
    schema.post('save', (doc: RoleDocument) => {
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
    schema.post('findOneAndDelete', async (doc: RoleDocument) => {
      console.log(`doc deleted: `, doc);
    });
    return schema;
  },
  inject: [getModelToken('Subscription')],
};

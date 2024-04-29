import { AsyncModelFactory } from '@nestjs/mongoose';
/* Schemas */
import {
  SubscriptionDocument,
  subscriptionSchema,
} from './subscription.schema';
export const subscriptionSchemaFactory: AsyncModelFactory = {
  name: 'Subscription',
  imports: [],
  useFactory: () => {
    const schema = subscriptionSchema;
    schema.post('save', (doc: SubscriptionDocument) => {
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
    schema.post('findOneAndDelete', async (doc: SubscriptionDocument) => {
      console.log(`doc deleted: `, doc);
    });
    return schema;
  },
  inject: [],
};

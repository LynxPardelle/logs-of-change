import { HydratedDocument, Model } from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
/* Types */
import { TSubscription } from '../types/subscription.type';
/* Schemas */
@Schema()
export class Subscription implements Omit<TSubscription, '_id'> {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop({ default: 0 })
  duration: number;

  @Prop({ default: 0 })
  logsLimit: number;

  @Prop({ default: 0 })
  filesLimit: number;

  @Prop({ default: 0 })
  fileSizeLimit: number;

  @Prop({ default: 0 })
  allFilesSizeLimit: number;

  @Prop({ default: false })
  canCreateSectionTypes: boolean;

  @Prop({ default: false })
  canCreateCombos: boolean;

  @Prop({ default: false })
  canUploadFiles: boolean;

  @Prop({ default: [] })
  fileTypes: string[];

  @Prop({ default: false })
  canEditCssClasses: boolean;

  @Prop({ default: false })
  canEditCssStyles: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const subscriptionSchema = SchemaFactory.createForClass(Subscription);
export type SubscriptionDocument = HydratedDocument<Subscription>;
export type SubscriptionModel = Model<Subscription>;

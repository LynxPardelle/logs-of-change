import { HydratedDocument, Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
/* Types */
import { TUser } from '../types/user.type';
import { TFile } from '@src/shared/types/file.type';
import { TRole } from '../types/role.type';
import { TSubscription } from '../types/subscription.type';
/* Schemas */
@Schema()
export class User implements Omit<TUser, '_id'> {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  email: string;

  @Prop({
    default: '',
    schema: true,
    schemaName: 'File',
    type: mongoose.Schema.Types.ObjectId || String,
    ref: 'File',
  })
  avatar: TFile | string;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ required: true })
  verificationToken: string;

  @Prop({
    required: true,
    schema: true,
    schemaName: 'Role',
    type: mongoose.Schema.Types.ObjectId || String,
    ref: 'Role',
  })
  role: TRole | string;

  @Prop({
    default: 'No Subscription',
    schema: true,
    schemaName: 'Subscription',
    type: mongoose.Schema.Types.ObjectId || String,
    ref: 'Subscription',
  })
  subscription: TSubscription | string;

  @Prop({ default: Date.now })
  subscriptionEnd: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const userSchema = SchemaFactory.createForClass(User);
export type UserDocument = HydratedDocument<User>;
export type UserModel = Model<User>;

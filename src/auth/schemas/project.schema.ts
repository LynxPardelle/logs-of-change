import { HydratedDocument, Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
/* Types */
import { TProject } from '../types/project.type';
import { TUser } from '../types/user.type';
import { TSubscription } from '../types/subscription.type';
/* Schemas */
@Schema()
export class Project implements Omit<TProject, '_id'> {
  @Prop({ required: true })
  name: string;

  @Prop({
    default: [],
    type: [mongoose.Schema.Types.ObjectId || String],
    ref: 'User',
  })
  members: (TUser | string)[];

  @Prop({ default: '' })
  description: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId || String,
    ref: 'Subscription',
  })
  subscription: TSubscription | string;

  @Prop({ default: Date.now })
  subscriptionEnd: Date;

  @Prop({
    type: mongoose.Schema.Types.ObjectId || String,
    ref: 'ChangeLog',
  })
  changeLog: string;

  @Prop({ default: [] })
  apiKeys: string[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const projectSchema = SchemaFactory.createForClass(Project);
export type ProjectDocument = HydratedDocument<Project>;
export type ProjectModel = Model<Project>;

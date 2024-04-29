import { HydratedDocument, Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
/* Types */
import { TRole } from '../types/role.type';
import { TSubscription } from '../types/subscription.type';
/* Schemas */
@Schema()
export class Role implements Omit<TRole, '_id'> {
  @Prop({ required: true })
  name: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId || String,
    ref: 'Subscription',
  })
  subscription: TSubscription | string;

  @Prop({ default: false })
  canEditUsers: boolean;

  @Prop({ default: false })
  canEditSubscriptions: boolean;

  @Prop({ default: false })
  canEditProjects: boolean;

  @Prop({ default: false })
  canEditChangeLogs: boolean;

  @Prop({ default: false })
  canManageFiles: boolean;

  @Prop({ default: false })
  canEditRoles: boolean;

  @Prop({ default: false })
  canEditConfigs: boolean;

  @Prop({ default: false })
  isTechnician: boolean;

  @Prop({ default: false })
  isAdmin: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const roleSchema = SchemaFactory.createForClass(Role);
export type RoleDocument = HydratedDocument<Role>;
export type RoleModel = Model<Role>;

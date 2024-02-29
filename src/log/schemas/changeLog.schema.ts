import { HydratedDocument, Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
/* Types */
import { TChangeLog } from '../types/changeLog.type';
import { TLog } from '../types/log.type';
import { TLogSectionType } from '../types/logSectionType.type';
import { TCombo } from '@src/shared/types/combo.type';
/* Schemas */
@Schema()
export class ChangeLog implements Omit<TChangeLog, '_id'> {
  @Prop({
    default: [],
    schema: true,
    schemaName: 'Log',
    type: [mongoose.Schema.Types.ObjectId] || [String],
    ref: 'Log',
  })
  logs: (TLog | string)[];

  @Prop({
    default: [],
    schema: true,
    schemaName: 'LogSectionType',
    type: [mongoose.Schema.Types.ObjectId] || [String],
    ref: 'LogSectionType',
  })
  logSectionTypes: (TLogSectionType | string)[];

  @Prop({ default: '' })
  logCssClassesDefault: string;

  @Prop({ default: '' })
  logCssStylesDefault: string;

  @Prop({
    type: [mongoose.Schema.Types.ObjectId] || [String],
    schema: true,
    schemaName: 'Combo',
    ref: 'Combo',
  })
  logCombosDefault: (TCombo | string)[];

  @Prop({ default: [] })
  apiKeys: string[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const changeLogSchema = SchemaFactory.createForClass(ChangeLog);
export type ChangeLogDocument = HydratedDocument<ChangeLog>;
export type ChangeLogModel = Model<ChangeLog>;

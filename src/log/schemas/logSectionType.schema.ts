import { HydratedDocument, Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { TCombo } from '@src/shared/types/combo.type';
import { TLogSectionType } from '../types/logSectionType.type';

@Schema()
export class LogSectionType implements Omit<TLogSectionType, '_id'> {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  priorityDefault: number;

  @Prop({ required: true })
  mediaPositionDefault: number;

  @Prop({ required: true })
  textPositionDefault: number;

  @Prop({ default: '' })
  logSectionCssClassesDefault: string;

  @Prop({ default: '' })
  logSectionCssStylesDefault: string;

  @Prop({
    type: [mongoose.Schema.Types.ObjectId] || [String],
    schema: true,
    schemaName: 'Combo',
    ref: 'Combo',
  })
  logSectionCombosDefault: (TCombo | string)[];

  @Prop({ default: '' })
  logTextCssClassesDefault: string;

  @Prop({ default: '' })
  logTextCssStylesDefault: string;

  @Prop({
    type: [mongoose.Schema.Types.ObjectId] || [String],
    schema: true,
    schemaName: 'Combo',
    ref: 'Combo',
  })
  logTextCombosDefault: (TCombo | string)[];

  @Prop({ default: '' })
  logMediaCssClassesDefault: string;

  @Prop({ default: '' })
  logMediaCssStylesDefault: string;

  @Prop({
    type: [mongoose.Schema.Types.ObjectId] || [String],
    schema: true,
    schemaName: 'Combo',
    ref: 'Combo',
  })
  logMediaCombosDefault: (TCombo | string)[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const logSectionTypeSchema =
  SchemaFactory.createForClass(LogSectionType);
export type LogSectionTypeDocument = HydratedDocument<LogSectionType>;
export type LogSectionTypeModel = Model<LogSectionType>;

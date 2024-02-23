import { Document, Model } from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { TCombo } from '@src/shared/types/combo.type';
import { TLogSectionType } from '../types/logSectionType.type';

@Schema()
class LogSectionType implements Omit<TLogSectionType, '_id'> {
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

  @Prop({ type: [String], schema: true, schemaName: 'Combo' })
  logSectionCombosDefault: TCombo[];

  @Prop({ default: '' })
  logTextCssClassesDefault: string;

  @Prop({ default: '' })
  logTextCssStylesDefault: string;

  @Prop({ type: [String], schema: true, schemaName: 'Combo' })
  logTextCombosDefault: TCombo[];

  @Prop({ default: '' })
  logMediaCssClassesDefault: string;

  @Prop({ default: '' })
  logMediaCssStylesDefault: string;

  @Prop({ type: [String], schema: true, schemaName: 'Combo' })
  logMediaCombosDefault: TCombo[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const logSectionTypeSchema =
  SchemaFactory.createForClass(LogSectionType);
export type LogSectionTypeDocument = LogSectionType & Document;
export type LogSectionTypeModel = Model<LogSectionType>;

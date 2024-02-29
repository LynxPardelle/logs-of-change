import { HydratedDocument, Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { TLogSection } from '../types/logSection.type';
import { TLogMedia } from '../types/logMedia.type';
import { TLogSectionType } from '../types/logSectionType.type';
import { TLogText } from '../types/logText.type';
import { TCombo } from '@src/shared/types/combo.type';

@Schema()
export class LogSection implements Omit<TLogSection, '_id'> {
  @Prop({
    schema: true,
    schemaName: 'LogSectionType',
    type: mongoose.Schema.Types.ObjectId || String || undefined,
    ref: 'LogSectionType',
    default: undefined,
  })
  type: TLogSectionType | string | undefined;

  @Prop({ required: true })
  priority: number;

  @Prop({
    required: true,
    schema: true,
    schemaName: 'LogMedia',
    ref: 'LogMedia',
    type: [mongoose.Schema.Types.ObjectId] || [String],
  })
  media: (TLogMedia | string)[];

  @Prop({
    required: true,
    schema: true,
    schemaName: 'LogText',
    ref: 'LogText',
    type: [mongoose.Schema.Types.ObjectId] || [String],
  })
  texts: (TLogText | string)[];

  @Prop({
    required: true,
    schema: true,
    schemaName: 'LogText',
    ref: 'LogText',
    type: [mongoose.Schema.Types.ObjectId] || [String],
  })
  titles: (TLogText | string)[];

  @Prop({ default: '' })
  cssClasses: string;

  @Prop({ default: '' })
  cssStyles: string;

  @Prop({
    type: [mongoose.Schema.Types.ObjectId] || [String],
    schema: true,
    schemaName: 'Combo',
    ref: 'Combo',
  })
  combos: (TCombo | string)[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const logSectionSchema = SchemaFactory.createForClass(LogSection);
export type LogSectionDocument = HydratedDocument<LogSection>;
export type LogSectionModel = Model<LogSection>;

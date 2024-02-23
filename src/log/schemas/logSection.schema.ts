import { Document, Model } from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { TLogSection } from '../types/logSection.type';
import { TLogMedia } from '../types/logMedia.type';
import { TLogSectionType } from '../types/logSectionType.type';
import { TLogText } from '../types/logText.type';
import { TCombo } from '@src/shared/types/combo.type';

@Schema()
class LogSection implements Omit<TLogSection, '_id'> {
  @Prop({
    required: true,
    schema: true,
    schemaName: 'LogSectionType',
    type: String,
  })
  type: TLogSectionType | string;

  @Prop({ required: true })
  priority: number;

  @Prop({ required: true, schema: true, schemaName: 'LogMedia' })
  media: (TLogMedia | string)[];

  @Prop({ required: true, schema: true, schemaName: 'LogText' })
  texts: (TLogText | string)[];

  @Prop({ required: true, schema: true, schemaName: 'LogText' })
  titles: (TLogText | string)[];

  @Prop({ default: '' })
  cssClasses: string;

  @Prop({ default: '' })
  cssStyles: string;

  @Prop({ type: [String], schema: true, schemaName: 'Combo' })
  combos: (TCombo | string)[];

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const logSectionSchema = SchemaFactory.createForClass(LogSection);
export type LogSectionDocument = LogSection & Document;
export type LogSectionModel = Model<LogSection>;

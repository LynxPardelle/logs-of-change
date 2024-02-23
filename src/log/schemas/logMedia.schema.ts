import { Document, Model } from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { TLogMedia } from '../types/logMedia.type';
import { TCombo } from '@src/shared/types/combo.type';
import { TFile } from '@src/shared/types/file.type';
@Schema()
class LogMedia implements Omit<TLogMedia, '_id'> {
  @Prop({ required: true, schema: true, schemaName: 'File', type: String })
  file: TFile | string;

  @Prop({ required: true })
  position: number;

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

export const logMediaSchema = SchemaFactory.createForClass(LogMedia);
export type LogMediaDocument = LogMedia & Document;
export type LogMediaModel = Model<LogMedia>;

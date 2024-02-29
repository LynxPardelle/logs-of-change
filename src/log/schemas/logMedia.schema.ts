import { HydratedDocument, Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { TLogMedia } from '../types/logMedia.type';
import { TCombo } from '@src/shared/types/combo.type';
import { TFile } from '@src/shared/types/file.type';
@Schema()
export class LogMedia implements Omit<TLogMedia, '_id'> {
  @Prop({
    required: true,
    schema: true,
    schemaName: 'File',
    type: mongoose.Schema.Types.ObjectId || String,
    ref: 'File',
  })
  file: TFile | string;

  @Prop({ required: true })
  position: number;

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

export const logMediaSchema = SchemaFactory.createForClass(LogMedia);
export type LogMediaDocument = HydratedDocument<LogMedia>;
export type LogMediaModel = Model<LogMedia>;

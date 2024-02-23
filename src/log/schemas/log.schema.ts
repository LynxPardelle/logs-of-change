import { Document, Model } from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { TLog } from '../types/log.type';
import { TCombo } from '@src/shared/types/combo.type';
import { TLogSection } from '../types/logSection.type';

@Schema()
class Log implements Omit<TLog, '_id'> {
  @Prop({ required: true, default: Date.now })
  date: Date;

  @Prop({ required: true, type: [String], ref: 'LogSection' })
  logSections: (TLogSection | string)[];

  @Prop({ default: '' })
  cssClasses: string;

  @Prop({ default: '' })
  cssStyles: string;

  @Prop({ type: [String], schema: true, schemaName: 'Combo' })
  combos: (string | TCombo)[];

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const logSchema = SchemaFactory.createForClass(Log);
export type LogDocument = Log & Document;
export type LogModel = Model<Log>;

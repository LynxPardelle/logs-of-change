import { Document, Model } from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { TCombo } from '@src/shared/types/combo.type';
import { TLogText } from '../types/logText.type';

@Schema()
class LogText implements Omit<TLogText, '_id'> {
  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  position: number;

  @Prop({ default: '' })
  cssClasses: string;

  @Prop({ default: '' })
  cssStyles: string;

  @Prop({ type: [String], schema: true, schemaName: 'Combo' })
  combos: TCombo[];

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const logTextSchema = SchemaFactory.createForClass(LogText);
export type LogTextDocument = LogText & Document;
export type LogTextModel = Model<LogTextDocument>;

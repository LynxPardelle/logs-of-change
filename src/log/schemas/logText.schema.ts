import { HydratedDocument, Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { TCombo } from '@src/shared/types/combo.type';
import { TLogText } from '../types/logText.type';

@Schema()
export class LogText implements Omit<TLogText, '_id'> {
  @Prop({ required: true })
  text: string;

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

export const logTextSchema = SchemaFactory.createForClass(LogText);
export type LogTextDocument = HydratedDocument<LogText>;
export type LogTextModel = Model<LogTextDocument>;

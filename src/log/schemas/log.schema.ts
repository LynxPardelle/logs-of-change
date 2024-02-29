import { HydratedDocument, Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { TLog } from '../types/log.type';
import { TCombo } from '@src/shared/types/combo.type';
import { TLogSection } from '../types/logSection.type';

@Schema()
export class Log implements Omit<TLog, '_id'> {
  @Prop({ required: true, default: Date.now })
  date: Date;

  @Prop({
    required: true,
    schema: true,
    schemaName: 'LogSection',
    type: [mongoose.Schema.Types.ObjectId] || [String],
    ref: 'LogSection',
  })
  logSections: (TLogSection | string)[];

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
  combos: (string | TCombo)[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const logSchema = SchemaFactory.createForClass(Log);
export type LogDocument = HydratedDocument<Log>;
export type LogModel = Model<Log>;

import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model } from 'mongoose';
import { TCombo } from '../types/combo.type';

@Schema()
export class Combo implements Omit<TCombo, '_id'> {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  cssClasses: string[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const comboSchema = SchemaFactory.createForClass(Combo);
export type ComboDocument = Combo & Document;
export type ComboModel = Model<Combo>;

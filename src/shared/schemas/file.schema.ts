import { Document, Model } from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { TFile } from '../types/file.type';

@Schema()
class File implements Omit<TFile, '_id'> {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  location: string;

  @Prop()
  size: number;

  @Prop({ required: true })
  type: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const fileSchema = SchemaFactory.createForClass(File);
export type FileDocument = File & Document;
export type FileModel = Model<File>;

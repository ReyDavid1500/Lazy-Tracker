import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Business extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const BusinessSchema = SchemaFactory.createForClass(Business);
BusinessSchema.index({ slug: 1 }, { unique: true });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

/**
 * A product tracked in the inventory of a specific business.
 * Identified via Claude API vision from a photo scan.
 */
@Schema({ timestamps: true })
export class Product extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  })
  businessId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, default: null, trim: true })
  brand: string | null;

  @Prop({ type: String, default: null, trim: true })
  sku: string | null;

  @Prop({ type: Number, required: true, default: 3 })
  lowStockThreshold: number;

  @Prop({ type: Number, required: true, default: 0 })
  currentStock: number;

  @Prop({ type: String, default: null })
  imageUrl: string | null;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ businessId: 1, name: 1 });
ProductSchema.index({ businessId: 1, sku: 1 }, { unique: true, sparse: true });

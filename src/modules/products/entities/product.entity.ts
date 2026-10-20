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

  @Prop({ type: Number, required: true, default: 3 })
  lowStockThreshold: number;

  @Prop({ type: Number, required: true, default: 0 })
  currentStock: number;

  @Prop({ type: String, default: null })
  imageUrl: string | null;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  /**
   * Optional: manager-set number of days after which stock should be re-counted.
   * Null means no staleness tracking for this product.
   */
  @Prop({ type: Number, default: null })
  updateIntervalDays: number | null;

  /**
   * Timestamp of the last stock update (set whenever currentStock is written).
   * Used to compute staleness on the frontend.
   */
  @Prop({ type: Date, default: null })
  stockLastUpdatedAt: Date | null;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ businessId: 1, name: 1 }, { unique: true });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type UserRole = 'worker' | 'manager';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  })
  businessId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  /** Managers log in with email. Uniqueness is enforced by a partial index so null values don't conflict. */
  @Prop({ type: String, lowercase: true, trim: true, default: null })
  email: string | null;

  /** Workers log in with userName (auto-generated). Uniqueness is enforced by a partial index so null values don't conflict. */
  @Prop({ type: String, trim: true, default: null })
  userName: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ type: String, required: true, enum: ['worker', 'manager'] as const, default: 'worker' })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: String, default: null })
  pushToken: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
// Sparse indexes still index explicit nulls; a partial index on strings only allows many nulls.
UserSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
UserSchema.index({ userName: 1 }, { unique: true, partialFilterExpression: { userName: { $type: 'string' } } });

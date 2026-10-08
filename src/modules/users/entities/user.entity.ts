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

  /** Managers log in with email. Sparse so null values don't conflict. */
  @Prop({ type: String, unique: true, lowercase: true, trim: true, sparse: true, default: null })
  email: string | null;

  /** Workers log in with userName (auto-generated). Sparse so null values don't conflict. */
  @Prop({ type: String, unique: true, trim: true, sparse: true, default: null })
  userName: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, enum: ['worker', 'manager'] as const, default: 'worker' })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: String, default: null })
  pushToken: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

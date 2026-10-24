import mongoose, { Schema, Model } from 'mongoose';

export interface ICouponDocument {
  _id?: string;
  code: string;
  discountPercentage: number;
  discountAmount?: number;
  discountType?: 'percentage' | 'flat';
  maxDiscountAmount: number;
  minOrderAmount: number;
  validUntil?: string;
  isActive: boolean;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const CouponSchema = new Schema<ICouponDocument>(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    discountPercentage: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['percentage', 'flat'], default: 'percentage' },
    maxDiscountAmount: { type: Number, default: 5000 },
    minOrderAmount: { type: Number, default: 0 },
    validUntil: { type: String },
    isActive: { type: Boolean, default: true, index: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

export const CouponModel: Model<ICouponDocument> =
  mongoose.models.Coupon || mongoose.model<ICouponDocument>('Coupon', CouponSchema);

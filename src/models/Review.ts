import mongoose, { Schema, Model } from 'mongoose';

export interface IReviewDocument {
  _id?: string;
  productId: string;
  productName: string;
  userName: string;
  userEmail?: string;
  rating: number;
  headline: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReviewDocument>(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    productId: { type: String, required: true, index: true },
    productName: { type: String, default: '' },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, default: '', trim: true },
    rating: { type: Number, required: true, min: 1, max: 5, default: 5 },
    headline: { type: String, required: true, trim: true },
    comment: { type: String, required: true, trim: true },
    verifiedPurchase: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ReviewSchema.index({ productId: 1, createdAt: -1 });

export const ReviewModel: Model<IReviewDocument> =
  mongoose.models.Review || mongoose.model<IReviewDocument>('Review', ReviewSchema);

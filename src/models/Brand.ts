import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBrandDocument extends Document {
  name: string;
  slug: string;
  logo?: string;
  categoryTypes: ('appliances' | 'furniture')[];
  isFeatured: boolean;
}

const BrandSchema = new Schema<IBrandDocument>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    logo: { type: String },
    categoryTypes: [{ type: String, enum: ['appliances', 'furniture'] }],
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const BrandModel: Model<IBrandDocument> =
  mongoose.models.Brand || mongoose.model<IBrandDocument>('Brand', BrandSchema);

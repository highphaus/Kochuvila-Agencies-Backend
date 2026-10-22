import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICategoryDocument {
  _id?: string;
  name: string;
  slug: string;
  type: 'appliances' | 'furniture';
  image: string;
  description: string;
  subcategories: { name: string; slug: string; image?: string }[];
  isFeatured: boolean;
  displayOrder: number;
}

const CategorySchema = new Schema<ICategoryDocument>(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['appliances', 'furniture'], required: true, index: true },
    image: { type: String, required: true },
    description: { type: String, default: '' },
    subcategories: [
      {
        name: { type: String, required: true },
        slug: { type: String, required: true },
        image: { type: String },
      },
    ],
    isFeatured: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const CategoryModel: Model<ICategoryDocument> =
  mongoose.models.Category || mongoose.model<ICategoryDocument>('Category', CategorySchema);

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProductDocument extends Document {
  name: string;
  slug: string;
  brand: string;
  category: string;
  subcategory: string;
  description: string;
  images: string[];
  mrp: number;
  price: number;
  discountPercentage: number;
  stock: number;
  rating: number;
  reviewCount: number;
  sku: string;
  energyRating?: string;
  capacity?: string;
  warranty: string;
  features: string[];
  specifications: {
    groupName: string;
    items: { key: string; value: string }[];
  }[];
  dimensions?: string;
  weight?: string;
  deliveryInfo?: string;
  tags: string[];
  isFeatured: boolean;
  isDeal: boolean;
  dealTag?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProductDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    brand: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    subcategory: { type: String, required: true, index: true },
    description: { type: String, required: true },
    images: { type: [String], default: [] },
    mrp: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    discountPercentage: { type: Number, default: 0 },
    stock: { type: Number, required: true, default: 0 },
    rating: { type: Number, default: 5 },
    reviewCount: { type: Number, default: 0 },
    sku: { type: String, required: true, unique: true },
    energyRating: { type: String },
    capacity: { type: String },
    warranty: { type: String, default: '1 Year Manufacturer Warranty' },
    features: { type: [String], default: [] },
    specifications: [
      {
        groupName: { type: String, required: true },
        items: [
          {
            key: { type: String, required: true },
            value: { type: String, required: true },
          },
        ],
      },
    ],
    dimensions: { type: String },
    weight: { type: String },
    deliveryInfo: { type: String },
    tags: { type: [String], default: [], index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isDeal: { type: Boolean, default: false, index: true },
    dealTag: { type: String },
    isPublished: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const ProductModel: Model<IProductDocument> =
  mongoose.models.Product || mongoose.model<IProductDocument>('Product', ProductSchema);

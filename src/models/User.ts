import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserDocument {
  _id?: string;
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  role: 'customer' | 'admin' | 'manager';
  addresses: {
    fullName: string;
    phone: string;
    street: string;
    landmark?: string;
    city: string;
    district: string;
    state: string;
    pincode: string;
    isDefault?: boolean;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  street: { type: String, required: true },
  landmark: { type: String },
  city: { type: String, required: true },
  district: { type: String, required: true },
  state: { type: String, required: true, default: 'Kerala' },
  pincode: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
});

const UserSchema = new Schema<IUserDocument>(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    phone: { type: String },
    role: { type: String, enum: ['customer', 'admin', 'manager'], default: 'customer' },
    addresses: [AddressSchema],
  },
  { timestamps: true }
);

export const UserModel: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

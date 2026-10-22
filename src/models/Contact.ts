import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContactDocument {
  _id?: string;
  name: string;
  phone: string;
  email?: string;
  inquiryType: string;
  message: string;
  status: 'new' | 'contacted' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContactDocument>(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    inquiryType: { type: String, default: 'General Inquiry' },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ['new', 'contacted', 'resolved'], default: 'new' },
  },
  { timestamps: true }
);

export const ContactModel: Model<IContactDocument> =
  mongoose.models.Contact || mongoose.model<IContactDocument>('Contact', ContactSchema);

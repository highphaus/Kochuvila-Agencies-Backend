import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrderDocument extends Document {
  orderNumber: string;
  customer: {
    userId?: mongoose.Types.ObjectId;
    fullName: string;
    email: string;
    phone: string;
    address: {
      fullName: string;
      phone: string;
      street: string;
      landmark?: string;
      city: string;
      district: string;
      state: string;
      pincode: string;
    };
  };
  items: {
    productId: string;
    name: string;
    image: string;
    brand: string;
    price: number;
    mrp: number;
    quantity: number;
    sku: string;
  }[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  deliveryCharge: number;
  totalAmount: number;
  paymentMethod: 'online' | 'cod' | 'enquiry';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus:
    | 'Order Placed'
    | 'Confirmed'
    | 'Processing'
    | 'Packed'
    | 'Shipped'
    | 'Out for Delivery'
    | 'Delivered'
    | 'Cancelled';
  timeline: {
    status: string;
    timestamp: Date;
    notes?: string;
  }[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrderDocument>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customer: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      fullName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        street: { type: String, required: true },
        landmark: { type: String },
        city: { type: String, required: true },
        district: { type: String, required: true },
        state: { type: String, required: true, default: 'Kerala' },
        pincode: { type: String, required: true },
      },
    },
    items: [
      {
        productId: { type: String, required: true },
        name: { type: String, required: true },
        image: { type: String, required: true },
        brand: { type: String, required: true },
        price: { type: Number, required: true },
        mrp: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
        sku: { type: String, required: true },
      },
    ],
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0 },
    couponCode: { type: String },
    deliveryCharge: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['online', 'cod', 'enquiry'],
      default: 'cod',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    orderStatus: {
      type: String,
      enum: [
        'Order Placed',
        'Confirmed',
        'Processing',
        'Packed',
        'Shipped',
        'Out for Delivery',
        'Delivered',
        'Cancelled',
      ],
      default: 'Order Placed',
    },
    timeline: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String },
      },
    ],
    notes: { type: String },
  },
  { timestamps: true }
);

export const OrderModel: Model<IOrderDocument> =
  mongoose.models.Order || mongoose.model<IOrderDocument>('Order', OrderSchema);

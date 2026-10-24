export type Role = 'customer' | 'admin' | 'manager';

export interface UserAddress {
  _id?: string;
  fullName: string;
  phone: string;
  street: string;
  landmark?: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  addresses?: UserAddress[];
  createdAt?: string;
}

export interface SpecificationItem {
  key: string;
  value: string;
}

export interface SpecificationGroup {
  groupName: string;
  items: SpecificationItem[];
}

export interface ProductVariant {
  _id?: string;
  name: string;
  sku?: string;
  price: number;
  mrp?: number;
  stock: number;
  inStock?: boolean;
  image?: string;
}

export interface Product {
  _id: string;
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
  inStock?: boolean;
  variants?: ProductVariant[];
  rating: number;
  reviewCount: number;
  sku: string;
  energyRating?: string;
  capacity?: string;
  warranty: string;
  features: string[];
  specifications: SpecificationGroup[];
  dimensions?: string;
  weight?: string;
  deliveryInfo?: string;
  tags?: string[];
  isFeatured?: boolean;
  isDeal?: boolean;
  dealTag?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  type: 'appliances' | 'furniture';
  image: string;
  description: string;
  subcategories: {
    name: string;
    slug: string;
    image?: string;
  }[];
  isFeatured: boolean;
  displayOrder: number;
}

export interface Brand {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  categoryTypes: ('appliances' | 'furniture')[];
  isFeatured: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  brand: string;
  price: number;
  mrp: number;
  quantity: number;
  sku: string;
}

export type OrderStatus =
  | 'Order Placed'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export type PaymentMethod = 'online' | 'cod' | 'enquiry';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderTimeline {
  status: OrderStatus;
  timestamp: string;
  notes?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    userId?: string;
    fullName: string;
    email: string;
    phone: string;
    address: UserAddress;
  };
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  deliveryCharge: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  courierService?: string;
  trackingId?: string;
  trackingUrl?: string;
  timeline: OrderTimeline[];
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Coupon {
  _id: string;
  code: string;
  discountPercentage: number;
  discountAmount?: number;
  discountType?: 'percentage' | 'flat';
  maxDiscountAmount: number;
  minOrderAmount: number;
  validUntil: string;
  isActive: boolean;
  description?: string;
  createdAt?: string;
}

export interface ProductReview {
  _id: string;
  productId: string;
  productName?: string;
  userName: string;
  userEmail?: string;
  rating: number;
  headline: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
  updatedAt?: string;
}


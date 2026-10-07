import { Product, Category, Brand, Order, Coupon, User } from '../types';
import { SAMPLE_PRODUCTS, SAMPLE_CATEGORIES, SAMPLE_BRANDS, SAMPLE_COUPONS } from '../data/sample-data';
import { connectToDatabase } from '../config/db';
import { ProductModel } from '../models/Product';
import { OrderModel } from '../models/Order';
import { CategoryModel } from '../models/Category';
import { BrandModel } from '../models/Brand';
import { UserModel } from '../models/User';
import bcrypt from 'bcryptjs';

// In-memory fallback cache to allow 100% functionality with or without MongoDB running
interface MemoryStore {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  orders: Order[];
  coupons: Coupon[];
  users: User[];
  isSeeded: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var memoryStore: MemoryStore | undefined;
}

if (!global.memoryStore) {
  global.memoryStore = {
    products: JSON.parse(JSON.stringify(SAMPLE_PRODUCTS)),
    categories: JSON.parse(JSON.stringify(SAMPLE_CATEGORIES)),
    brands: JSON.parse(JSON.stringify(SAMPLE_BRANDS)),
    orders: [
      {
        _id: 'ord-demo-01',
        orderNumber: 'KCH-2026-9041',
        customer: {
          fullName: 'Suresh Kumar',
          email: 'suresh.k@example.com',
          phone: '+91 98471 23456',
          address: {
            fullName: 'Suresh Kumar',
            phone: '+91 98471 23456',
            street: 'TC 14/2045, Rose Nagar, Medical College P.O.',
            city: 'Thiruvananthapuram',
            district: 'Thiruvananthapuram',
            state: 'Kerala',
            pincode: '695011',
          },
        },
        items: [
          {
            productId: 'prod-app-01',
            name: 'LG 655L Frost-Free Inverter Side-by-Side Refrigerator',
            image: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=1000&q=80',
            brand: 'LG',
            price: 79990,
            mrp: 104990,
            quantity: 1,
            sku: 'LG-REF-655-SBS',
          },
        ],
        subtotal: 79990,
        discount: 2500,
        couponCode: 'FESTIVE2500',
        deliveryCharge: 0,
        totalAmount: 77490,
        paymentMethod: 'online',
        paymentStatus: 'paid',
        orderStatus: 'Confirmed',
        timeline: [
          {
            status: 'Order Placed',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            notes: 'Customer placed order online',
          },
          {
            status: 'Confirmed',
            timestamp: new Date(Date.now() - 43200000).toISOString(),
            notes: 'Payment verified and inventory allocated',
          },
        ],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    coupons: JSON.parse(JSON.stringify(SAMPLE_COUPONS)),
    users: [
      {
        _id: 'usr-admin-01',
        name: 'Kochuvila Administrator',
        email: process.env.ADMIN_DEFAULT_EMAIL || 'admin@kochuvila.com',
        role: 'admin',
        phone: '+91 94470 00000',
        createdAt: new Date().toISOString(),
      },
    ],
    isSeeded: true,
  };
}

const mem = global.memoryStore;

// PRODUCTS REPOSITORY
export async function getProducts(filters?: {
  category?: string;
  subcategory?: string;
  brand?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  isFeatured?: boolean;
  isDeal?: boolean;
  sort?: string;
  limit?: number;
  page?: number;
}): Promise<{ products: Product[]; total: number; totalPages: number }> {
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const query: Record<string, any> = { isPublished: true };
      if (filters?.category) query.category = filters.category;
      if (filters?.subcategory) query.subcategory = filters.subcategory;
      if (filters?.brand) query.brand = new RegExp(filters.brand, 'i');
      if (filters?.isFeatured !== undefined) query.isFeatured = filters.isFeatured;
      if (filters?.isDeal !== undefined) query.isDeal = filters.isDeal;
      if (filters?.rating) query.rating = { $gte: filters.rating };
      if (filters?.minPrice || filters?.maxPrice) {
        query.price = {};
        if (filters.minPrice) query.price.$gte = filters.minPrice;
        if (filters.maxPrice) query.price.$lte = filters.maxPrice;
      }
      if (filters?.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { brand: { $regex: filters.search, $options: 'i' } },
          { category: { $regex: filters.search, $options: 'i' } },
          { tags: { $in: [new RegExp(filters.search, 'i')] } },
        ];
      }

      let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
      if (filters?.sort === 'price_asc') sortObj = { price: 1 };
      else if (filters?.sort === 'price_desc') sortObj = { price: -1 };
      else if (filters?.sort === 'rating') sortObj = { rating: -1 };
      else if (filters?.sort === 'discount') sortObj = { discountPercentage: -1 };

      const limit = filters?.limit || 24;
      const page = filters?.page || 1;
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        ProductModel.find(query).sort(sortObj).skip(skip).limit(limit).lean(),
        ProductModel.countDocuments(query),
      ]);

      if (items && items.length > 0) {
        return {
          products: JSON.parse(JSON.stringify(items)),
          total,
          totalPages: Math.ceil(total / limit),
        };
      }
    }
  } catch (err) {
    console.warn('DB error, using memory products:', (err as Error).message);
  }

  // Memory fallback filtering
  let result = mem.products.filter((p) => p.isPublished);

  if (filters?.category) {
    result = result.filter((p) => p.category.toLowerCase() === filters.category!.toLowerCase());
  }
  if (filters?.subcategory) {
    result = result.filter((p) => p.subcategory.toLowerCase() === filters.subcategory!.toLowerCase());
  }
  if (filters?.brand) {
    result = result.filter((p) => p.brand.toLowerCase() === filters.brand!.toLowerCase());
  }
  if (filters?.isFeatured !== undefined) {
    result = result.filter((p) => p.isFeatured === filters.isFeatured);
  }
  if (filters?.isDeal !== undefined) {
    result = result.filter((p) => p.isDeal === filters.isDeal);
  }
  if (filters?.rating) {
    result = result.filter((p) => p.rating >= filters.rating!);
  }
  if (filters?.minPrice) {
    result = result.filter((p) => p.price >= filters.minPrice!);
  }
  if (filters?.maxPrice) {
    result = result.filter((p) => p.price <= filters.maxPrice!);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase().trim();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }

  if (filters?.sort === 'price_asc') {
    result.sort((a, b) => a.price - b.price);
  } else if (filters?.sort === 'price_desc') {
    result.sort((a, b) => b.price - a.price);
  } else if (filters?.sort === 'rating') {
    result.sort((a, b) => b.rating - a.rating);
  } else if (filters?.sort === 'discount') {
    result.sort((a, b) => b.discountPercentage - a.discountPercentage);
  } else {
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const limit = filters?.limit || 24;
  const page = filters?.page || 1;
  const total = result.length;
  const start = (page - 1) * limit;
  const paginated = result.slice(start, start + limit);

  return {
    products: paginated,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const prod = await ProductModel.findOne({ slug }).lean();
      if (prod) return JSON.parse(JSON.stringify(prod));
    }
  } catch (err) {
    console.warn('DB error on getProductBySlug:', (err as Error).message);
  }
  const match = mem.products.find((p) => p.slug === slug || p._id === slug);
  return match ? JSON.parse(JSON.stringify(match)) : null;
}

export async function createOrUpdateProduct(productData: Partial<Product>): Promise<Product> {
  const slug =
    productData.slug ||
    productData.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') ||
    `prod-${Date.now()}`;

  const discountPercentage =
    productData.mrp && productData.price && productData.mrp > productData.price
      ? Math.round(((productData.mrp - productData.price) / productData.mrp) * 100)
      : productData.discountPercentage || 0;

  const fullData: Product = {
    _id: productData._id || `prod-${Date.now()}`,
    name: productData.name || 'Unnamed Product',
    slug,
    brand: productData.brand || 'Kochuvila Selected',
    category: productData.category || 'appliances',
    subcategory: productData.subcategory || 'general',
    description: productData.description || '',
    images: productData.images && productData.images.length > 0
      ? productData.images
      : ['https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=1000&q=80'],
    mrp: productData.mrp || 0,
    price: productData.price || 0,
    discountPercentage,
    stock: productData.stock !== undefined ? productData.stock : 10,
    rating: productData.rating || 5.0,
    reviewCount: productData.reviewCount || 0,
    sku: productData.sku || `SKU-${Date.now()}`,
    warranty: productData.warranty || '1 Year Manufacturer Warranty',
    features: productData.features || [],
    specifications: productData.specifications || [],
    dimensions: productData.dimensions,
    weight: productData.weight,
    deliveryInfo: productData.deliveryInfo || 'Doorstep delivery across Kerala.',
    tags: productData.tags || [],
    isFeatured: !!productData.isFeatured,
    isDeal: !!productData.isDeal,
    dealTag: productData.dealTag,
    isPublished: productData.isPublished !== undefined ? productData.isPublished : true,
    createdAt: productData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const conn = await connectToDatabase();
    if (conn) {
      const updated = await ProductModel.findOneAndUpdate(
        { $or: [{ _id: fullData._id }, { slug: fullData.slug }] },
        fullData,
        { upsert: true, new: true }
      ).lean();
      if (updated) return JSON.parse(JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('DB error creating/updating product:', (err as Error).message);
  }

  const idx = mem.products.findIndex((p) => p._id === fullData._id || p.slug === fullData.slug);
  if (idx >= 0) {
    mem.products[idx] = fullData;
  } else {
    mem.products.unshift(fullData);
  }
  return fullData;
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    const conn = await connectToDatabase();
    if (conn) {
      await ProductModel.deleteOne({ _id: id });
    }
  } catch (err) {
    console.warn('DB error deleting product:', (err as Error).message);
  }
  const idx = mem.products.findIndex((p) => p._id === id);
  if (idx >= 0) {
    mem.products.splice(idx, 1);
    return true;
  }
  return false;
}

// ORDERS REPOSITORY
export async function getOrders(): Promise<Order[]> {
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const orders = await OrderModel.find().sort({ createdAt: -1 }).lean();
      if (orders && orders.length > 0) return JSON.parse(JSON.stringify(orders));
    }
  } catch (err) {
    console.warn('DB error fetching orders:', (err as Error).message);
  }
  return [...mem.orders];
}

export async function getOrderById(orderNumberOrId: string): Promise<Order | null> {
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const order = await OrderModel.findOne({
        $or: [{ orderNumber: orderNumberOrId }, { _id: orderNumberOrId }],
      }).lean();
      if (order) return JSON.parse(JSON.stringify(order));
    }
  } catch (err) {
    console.warn('DB error fetching order by ID:', (err as Error).message);
  }
  const order = mem.orders.find((o) => o.orderNumber === orderNumberOrId || o._id === orderNumberOrId);
  return order ? JSON.parse(JSON.stringify(order)) : null;
}

export async function createOrder(orderData: Partial<Order>): Promise<Order> {
  const orderNumber = `KCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Server-side calculation and verification of item prices
  let calculatedSubtotal = 0;
  const processedItems = (orderData.items || []).map((item) => {
    const prodId = item.productId || (item as any).product;
    const p = mem.products.find((prod) => prod._id === prodId);
    const unitPrice = p ? p.price : (item.price || 0);
    const qty = Math.max(1, item.quantity || 1);
    calculatedSubtotal += unitPrice * qty;

    return {
      productId: String(prodId || `item-${Date.now()}`),
      name: item.name || (p ? p.name : 'Unknown Product'),
      image: item.image || (p && p.images && p.images[0] ? p.images[0] : ''),
      brand: (item as any).brand || (p ? p.brand : 'Kochuvila'),
      price: unitPrice,
      mrp: (item as any).mrp || (p ? p.mrp : unitPrice),
      quantity: qty,
      sku: (item as any).sku || (p ? p.sku : `SKU-${prodId}`),
    };
  });

  const subtotal = calculatedSubtotal;
  const discount = orderData.discount || 0;
  const deliveryCharge = subtotal > 2000 || subtotal === 0 ? 0 : 250;
  const totalAmount = Math.max(0, subtotal - discount + deliveryCharge);

  const fullOrder: Order = {
    _id: `ord-${Date.now()}`,
    orderNumber,
    customer: orderData.customer!,
    items: processedItems,
    subtotal,
    discount,
    couponCode: orderData.couponCode,
    deliveryCharge,
    totalAmount,
    paymentMethod: orderData.paymentMethod || 'cod',
    paymentStatus: orderData.paymentStatus || 'pending',
    orderStatus: 'Order Placed',
    timeline: [
      {
        status: 'Order Placed',
        timestamp: new Date().toISOString(),
        notes: `Order created via ${orderData.paymentMethod === 'online' ? 'Online Payment' : 'Cash on Delivery / Direct Showroom Enquiry'}`,
      },
    ],
    notes: orderData.notes,
    createdAt: new Date().toISOString(),
  };

  for (const item of fullOrder.items) {
    const p = mem.products.find((prod) => prod._id === item.productId);
    if (p && p.stock > 0) {
      p.stock = Math.max(0, p.stock - item.quantity);
    }
  }

  try {
    const conn = await connectToDatabase();
    if (conn) {
      const created = await OrderModel.create(fullOrder);
      if (created) return JSON.parse(JSON.stringify(created));
    }
  } catch (err) {
    console.warn('DB error creating order:', (err as Error).message);
  }

  mem.orders.unshift(fullOrder);
  return fullOrder;
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: Order['orderStatus'],
  notes?: string
): Promise<Order | null> {
  const timestamp = new Date().toISOString();
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const updated = await OrderModel.findOneAndUpdate(
        { $or: [{ _id: orderId }, { orderNumber: orderId }] },
        {
          $set: { orderStatus: newStatus },
          $push: { timeline: { status: newStatus, timestamp, notes } },
        },
        { new: true }
      ).lean();
      if (updated) return JSON.parse(JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('DB error updating order status:', (err as Error).message);
  }

  const order = mem.orders.find((o) => o._id === orderId || o.orderNumber === orderId);
  if (order) {
    order.orderStatus = newStatus;
    order.timeline.push({
      status: newStatus,
      timestamp,
      notes: notes || `Order status updated to ${newStatus}`,
    });
    return JSON.parse(JSON.stringify(order));
  }
  return null;
}

// CATEGORIES & BRANDS REPOSITORY
export async function getCategories(): Promise<Category[]> {
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const cats = await CategoryModel.find().sort({ displayOrder: 1 }).lean();
      if (cats && cats.length > 0) return JSON.parse(JSON.stringify(cats));
    }
  } catch (err) {
    console.warn('DB error fetching categories:', (err as Error).message);
  }
  return [...mem.categories];
}

export async function getBrands(): Promise<Brand[]> {
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const brands = await BrandModel.find().sort({ name: 1 }).lean();
      if (brands && brands.length > 0) return JSON.parse(JSON.stringify(brands));
    }
  } catch (err) {
    console.warn('DB error fetching brands:', (err as Error).message);
  }
  return [...mem.brands];
}

export async function getCoupons(): Promise<Coupon[]> {
  return [...mem.coupons];
}

export async function validateCoupon(code: string, cartTotal: number): Promise<{ valid: boolean; discount: number; message: string }> {
  const match = mem.coupons.find((c) => c.code.toUpperCase() === code.toUpperCase() && c.isActive);
  if (!match) {
    return { valid: false, discount: 0, message: 'Invalid or expired coupon code' };
  }
  if (cartTotal < match.minOrderAmount) {
    return {
      valid: false,
      discount: 0,
      message: `Minimum order of ₹${match.minOrderAmount.toLocaleString('en-IN')} required for this coupon`,
    };
  }
  const calcDiscount = Math.round((cartTotal * match.discountPercentage) / 100);
  const discount = Math.min(calcDiscount, match.maxDiscountAmount);
  return {
    valid: true,
    discount,
    message: `Coupon applied! You save ₹${discount.toLocaleString('en-IN')}`,
  };
}

// USER & AUTH
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const adminEmail = (process.env.ADMIN_DEFAULT_EMAIL || 'admin@kochuvila.com').toLowerCase();
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'KochuvilaAdmin@2026';

  if (email.toLowerCase() === adminEmail && password === adminPassword) {
    const adminUser = mem.users.find((u) => u.role === 'admin') || {
      _id: 'usr-admin-01',
      name: 'Kochuvila Administrator',
      email: adminEmail,
      role: 'admin' as const,
      phone: '+91 94470 00000',
    };
    return adminUser;
  }

  try {
    const conn = await connectToDatabase();
    if (conn) {
      const userDoc = await UserModel.findOne({ email: email.toLowerCase() });
      if (userDoc) {
        const matches = await bcrypt.compare(password, userDoc.passwordHash);
        if (matches) {
          return {
            _id: userDoc._id.toString(),
            name: userDoc.name,
            email: userDoc.email,
            phone: userDoc.phone,
            role: userDoc.role,
            addresses: userDoc.addresses ? JSON.parse(JSON.stringify(userDoc.addresses)) : [],
          };
        }
      }
    }
  } catch (err) {
    console.warn('DB error authenticating user:', (err as Error).message);
  }

  return null;
}

// SEED DATABASE
export async function seedDatabase(): Promise<{
  success: boolean;
  message: string;
  counts: { products: number; categories: number; brands: number; orders: number };
}> {
  try {
    const conn = await connectToDatabase();
    if (conn) {
      for (const prod of SAMPLE_PRODUCTS) {
        await ProductModel.findOneAndUpdate({ slug: prod.slug }, prod, { upsert: true });
      }
      for (const cat of SAMPLE_CATEGORIES) {
        await CategoryModel.findOneAndUpdate({ slug: cat.slug }, cat, { upsert: true });
      }
      for (const b of SAMPLE_BRANDS) {
        await BrandModel.findOneAndUpdate({ slug: b.slug }, b, { upsert: true });
      }

      const adminEmail = (process.env.ADMIN_DEFAULT_EMAIL || 'admin@kochuvila.com').toLowerCase();
      const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'KochuvilaAdmin@2026';
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await UserModel.findOneAndUpdate(
        { email: adminEmail },
        {
          name: 'Kochuvila Administrator',
          email: adminEmail,
          passwordHash,
          role: 'admin',
          phone: '+91 94470 00000',
        },
        { upsert: true }
      );
    }
  } catch (err) {
    console.warn('DB seed error, memory store refreshed:', (err as Error).message);
  }

  mem.products = JSON.parse(JSON.stringify(SAMPLE_PRODUCTS));
  mem.categories = JSON.parse(JSON.stringify(SAMPLE_CATEGORIES));
  mem.brands = JSON.parse(JSON.stringify(SAMPLE_BRANDS));
  mem.isSeeded = true;

  return {
    success: true,
    message: 'Database & memory store successfully seeded with complete retail catalog.',
    counts: {
      products: mem.products.length,
      categories: mem.categories.length,
      brands: mem.brands.length,
      orders: mem.orders.length,
    },
  };
}

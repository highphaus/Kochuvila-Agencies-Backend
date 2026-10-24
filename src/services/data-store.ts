import { Product, Category, Brand, Order, Coupon, User, UserAddress, Role, ProductReview } from '../types';
import { SAMPLE_PRODUCTS, SAMPLE_CATEGORIES, SAMPLE_BRANDS, SAMPLE_COUPONS } from '../data/sample-data';
import { connectToDatabase } from '../config/db';
import { ProductModel } from '../models/Product';
import { OrderModel } from '../models/Order';
import { CategoryModel } from '../models/Category';
import { BrandModel } from '../models/Brand';
import { UserModel } from '../models/User';
import { CouponModel } from '../models/Coupon';
import { ReviewModel } from '../models/Review';
import bcrypt from 'bcryptjs';

// In-memory fallback cache to allow 100% functionality with or without MongoDB running
interface MemoryStore {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  orders: Order[];
  coupons: Coupon[];
  users: (User & { passwordHash?: string })[];
  reviews: ProductReview[];
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
    reviews: [
      {
        _id: 'rev-01',
        productId: 'prod-app-01',
        productName: 'LG 655L Frost-Free Inverter Side-by-Side Refrigerator',
        userName: 'Mathew Thomas',
        userEmail: 'mathew.t@example.com',
        rating: 5,
        headline: 'Outstanding quality and very smooth delivery in Kerala',
        comment:
          'Purchased from Kochuvila Agencies. The delivery team was punctual, unboxed the unit with utmost care, and gave a complete demonstration. Genuine product with manufacturer warranty.',
        verifiedPurchase: true,
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
      },
      {
        _id: 'rev-02',
        productId: 'prod-app-02',
        productName: 'Sony Bravia 55-inch 4K Google TV',
        userName: 'Priya Rajagopal',
        userEmail: 'priya.r@example.com',
        rating: 5,
        headline: 'Worth every rupee, exceeded our expectations',
        comment:
          'Visited their local showroom to check it out before ordering online. The finish, build quality, and performance are first-rate. Very happy with the purchase.',
        verifiedPurchase: true,
        createdAt: new Date(Date.now() - 86400000 * 38).toISOString(),
      },
      {
        _id: 'rev-03',
        productId: 'prod-fur-01',
        productName: 'Kerala Heritage Teakwood 6-Seater Dining Set',
        userName: 'Arun Varma',
        userEmail: 'arun.v@example.com',
        rating: 4,
        headline: 'Great product, prompt delivery and support',
        comment:
          'Got it delivered within 2 days to Kochi. Excellent packaging and 0% EMI process through credit card was completely hassle-free.',
        verifiedPurchase: true,
        createdAt: new Date(Date.now() - 86400000 * 54).toISOString(),
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
          products: items as unknown as Product[],
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

export async function getProductBySlug(slugOrId: string): Promise<Product | null> {
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const prod = await ProductModel.findOne({
        $or: [{ slug: slugOrId }, { _id: slugOrId }],
      }).lean();
      if (prod) return JSON.parse(JSON.stringify(prod));
    }
  } catch (err) {
    console.warn('DB error on getProductBySlug:', (err as Error).message);
  }
  const match = mem.products.find((p) => p.slug === slugOrId || p._id === slugOrId);
  return match ? JSON.parse(JSON.stringify(match)) : null;
}

export async function createOrUpdateProduct(productData: Partial<Product>): Promise<Product> {
  let existing: any = null;
  try {
    const conn = await connectToDatabase();
    if (conn) {
      if (productData._id) {
        existing = await ProductModel.findOne({ $or: [{ _id: productData._id }, { slug: productData._id }] }).lean();
      }
      if (!existing && productData.slug) {
        existing = await ProductModel.findOne({ slug: productData.slug }).lean();
      }
    }
  } catch (err) {
    console.warn('DB check error during createOrUpdateProduct:', (err as Error).message);
  }

  if (!existing) {
    existing = mem.products.find(
      (p) =>
        (productData._id && (p._id === productData._id || p.slug === productData._id)) ||
        (productData.slug && p.slug === productData.slug)
    );
  }

  const slug =
    productData.slug ||
    existing?.slug ||
    productData.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') ||
    `prod-${Date.now()}`;

  const discountPercentage =
    productData.mrp && productData.price && productData.mrp > productData.price
      ? Math.round(((productData.mrp - productData.price) / productData.mrp) * 100)
      : productData.discountPercentage || 0;

  const targetId = existing?._id || productData._id || `prod-${Date.now()}`;

  const fullData: Product = {
    _id: targetId,
    name: productData.name || existing?.name || 'Unnamed Product',
    slug,
    brand: productData.brand || existing?.brand || 'Kochuvila Selected',
    category: productData.category || existing?.category || 'appliances',
    subcategory: productData.subcategory || existing?.subcategory || 'general',
    description: productData.description !== undefined ? productData.description : (existing?.description || ''),
    images:
      productData.images && productData.images.length > 0
        ? productData.images
        : (existing?.images && existing.images.length > 0
            ? existing.images
            : ['https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=1000&q=80']),
    mrp: productData.mrp !== undefined ? productData.mrp : (existing?.mrp || 0),
    price: productData.price !== undefined ? productData.price : (existing?.price || 0),
    discountPercentage,
    stock: productData.stock !== undefined ? productData.stock : (existing?.stock !== undefined ? existing.stock : 10),
    inStock:
      productData.inStock !== undefined
        ? productData.inStock
        : (productData.stock !== undefined ? productData.stock > 0 : (existing?.inStock !== undefined ? existing.inStock : true)),
    variants: productData.variants || existing?.variants || [],
    rating: productData.rating !== undefined ? productData.rating : (existing?.rating || 5.0),
    reviewCount: productData.reviewCount !== undefined ? productData.reviewCount : (existing?.reviewCount || 0),
    sku: productData.sku || existing?.sku || `SKU-${Date.now().toString().slice(-6)}`,
    energyRating: productData.energyRating || existing?.energyRating,
    capacity: productData.capacity || existing?.capacity,
    warranty: productData.warranty || existing?.warranty || '1 Year Manufacturer Warranty',
    features: productData.features || existing?.features || [],
    specifications: productData.specifications || existing?.specifications || [],
    dimensions: productData.dimensions || existing?.dimensions,
    weight: productData.weight || existing?.weight,
    deliveryInfo: productData.deliveryInfo || existing?.deliveryInfo || 'Doorstep delivery across Kerala.',
    tags: productData.tags || existing?.tags || [],
    isFeatured: productData.isFeatured !== undefined ? !!productData.isFeatured : (existing?.isFeatured || false),
    isDeal: productData.isDeal !== undefined ? !!productData.isDeal : (existing?.isDeal || false),
    dealTag: productData.dealTag || existing?.dealTag,
    isPublished: productData.isPublished !== undefined ? productData.isPublished : (existing?.isPublished !== undefined ? existing.isPublished : true),
    createdAt: existing?.createdAt || productData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const conn = await connectToDatabase();
    if (conn) {
      const { _id, ...rest } = fullData;
      const updated = await ProductModel.findOneAndUpdate(
        { $or: [{ _id }, { slug: fullData.slug }] },
        { $set: rest, $setOnInsert: { _id } },
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

export async function deleteProduct(idOrSlug: string): Promise<boolean> {
  let dbDeleted = false;
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const res = await ProductModel.deleteOne({ $or: [{ _id: idOrSlug }, { slug: idOrSlug }] });
      if (res && res.deletedCount > 0) dbDeleted = true;
    }
  } catch (err) {
    console.warn('DB error deleting product:', (err as Error).message);
  }
  const idx = mem.products.findIndex((p) => p._id === idOrSlug || p.slug === idOrSlug);
  if (idx >= 0) {
    mem.products.splice(idx, 1);
    return true;
  }
  return dbDeleted;
}

// REVIEWS REPOSITORY
export async function getReviews(productId?: string): Promise<ProductReview[]> {
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const filter: Record<string, any> = {};
      if (productId) {
        filter.productId = productId;
      }
      const reviews = await ReviewModel.find(filter).sort({ createdAt: -1 }).lean();
      if (reviews && reviews.length > 0) {
        return JSON.parse(JSON.stringify(reviews));
      }
    }
  } catch (err) {
    console.warn('DB error fetching reviews:', (err as Error).message);
  }
  if (productId) {
    return mem.reviews.filter((r) => r.productId === productId);
  }
  return [...mem.reviews];
}

export async function getReviewById(id: string): Promise<ProductReview | null> {
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const rev = await ReviewModel.findById(id).lean();
      if (rev) return JSON.parse(JSON.stringify(rev));
    }
  } catch (err) {
    console.warn('DB error fetching review by ID:', (err as Error).message);
  }
  const match = mem.reviews.find((r) => r._id === id);
  return match ? JSON.parse(JSON.stringify(match)) : null;
}

export async function createOrUpdateReview(
  data: Partial<ProductReview>
): Promise<ProductReview> {
  const targetId = data._id || `rev-${Date.now()}`;
  const fullReview: ProductReview = {
    _id: targetId,
    productId: data.productId || 'prod-app-01',
    productName: data.productName || 'Kochuvila Selected Item',
    userName: data.userName || 'Verified Customer',
    userEmail: data.userEmail || '',
    rating: data.rating !== undefined ? Number(data.rating) : 5,
    headline: data.headline || 'Excellent Product',
    comment: data.comment || '',
    verifiedPurchase: data.verifiedPurchase !== false,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const conn = await connectToDatabase();
    if (conn) {
      const { _id, ...rest } = fullReview;
      const updated = await ReviewModel.findOneAndUpdate(
        { _id },
        { $set: rest, $setOnInsert: { _id } },
        { upsert: true, new: true }
      ).lean();
      if (updated) {
        // Also keep memory store in sync
        const idx = mem.reviews.findIndex((r) => r._id === targetId);
        if (idx >= 0) mem.reviews[idx] = JSON.parse(JSON.stringify(updated));
        else mem.reviews.unshift(JSON.parse(JSON.stringify(updated)));
        return JSON.parse(JSON.stringify(updated));
      }
    }
  } catch (err) {
    console.warn('DB error saving review:', (err as Error).message);
  }

  const idx = mem.reviews.findIndex((r) => r._id === fullReview._id);
  if (idx >= 0) {
    mem.reviews[idx] = fullReview;
  } else {
    mem.reviews.unshift(fullReview);
  }
  return fullReview;
}

export async function deleteReview(id: string): Promise<boolean> {
  let dbDeleted = false;
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const res = await ReviewModel.deleteOne({ _id: id });
      if (res && res.deletedCount > 0) dbDeleted = true;
    }
  } catch (err) {
    console.warn('DB error deleting review:', (err as Error).message);
  }
  const idx = mem.reviews.findIndex((r) => r._id === id);
  if (idx >= 0) {
    mem.reviews.splice(idx, 1);
    return true;
  }
  return dbDeleted;
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
  newStatusOrPayload: Order['orderStatus'] | {
    status?: Order['orderStatus'];
    orderStatus?: Order['orderStatus'];
    notes?: string;
    courierService?: string;
    trackingId?: string;
    trackingUrl?: string;
  },
  legacyNotes?: string
): Promise<Order | null> {
  const timestamp = new Date().toISOString();
  let status: Order['orderStatus'] | undefined;
  let notes: string | undefined = legacyNotes;
  let courierService: string | undefined;
  let trackingId: string | undefined;
  let trackingUrl: string | undefined;

  if (typeof newStatusOrPayload === 'string') {
    status = newStatusOrPayload;
  } else if (newStatusOrPayload && typeof newStatusOrPayload === 'object') {
    status = newStatusOrPayload.status || newStatusOrPayload.orderStatus;
    notes = newStatusOrPayload.notes || legacyNotes;
    courierService = newStatusOrPayload.courierService;
    trackingId = newStatusOrPayload.trackingId;
    trackingUrl = newStatusOrPayload.trackingUrl;
  }

  // Auto-generate courier tracking URL if not explicitly provided
  if (trackingId && !trackingUrl && courierService) {
    const cs = courierService.toLowerCase();
    if (cs.includes('delhivery')) {
      trackingUrl = `https://www.delhivery.com/track/package/${encodeURIComponent(trackingId)}`;
    } else if (cs.includes('blue dart') || cs.includes('bluedart')) {
      trackingUrl = `https://www.bluedart.com/tracking?trackNumber=${encodeURIComponent(trackingId)}`;
    } else if (cs.includes('dtdc')) {
      trackingUrl = `https://www.dtdc.in/tracking/shipment-tracking.asp?strCnno=${encodeURIComponent(trackingId)}`;
    } else if (cs.includes('speed post') || cs.includes('india post')) {
      trackingUrl = `https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx`;
    }
  }

  const setFields: Record<string, any> = { updatedAt: timestamp };
  if (status) setFields.orderStatus = status;
  if (courierService !== undefined) setFields.courierService = courierService;
  if (trackingId !== undefined) setFields.trackingId = trackingId;
  if (trackingUrl !== undefined) setFields.trackingUrl = trackingUrl;

  const timelineNote =
    notes ||
    (courierService && trackingId
      ? `Dispatched via ${courierService} (Tracking ID: ${trackingId})`
      : status
      ? `Order status updated to ${status}`
      : 'Order tracking details updated');

  try {
    const conn = await connectToDatabase();
    if (conn) {
      const updateQuery: any = { $set: setFields };
      if (status || courierService || trackingId) {
        updateQuery.$push = {
          timeline: {
            status: status || 'Shipped',
            timestamp,
            notes: timelineNote,
          },
        };
      }

      const updated = await OrderModel.findOneAndUpdate(
        { $or: [{ _id: orderId }, { orderNumber: orderId }] },
        updateQuery,
        { new: true }
      ).lean();
      if (updated) return JSON.parse(JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('DB error updating order status/tracking:', (err as Error).message);
  }

  const order = mem.orders.find((o) => o._id === orderId || o.orderNumber === orderId);
  if (order) {
    if (status) order.orderStatus = status;
    if (courierService !== undefined) order.courierService = courierService;
    if (trackingId !== undefined) order.trackingId = trackingId;
    if (trackingUrl !== undefined) order.trackingUrl = trackingUrl;
    order.timeline.push({
      status: (status || order.orderStatus) as any,
      timestamp,
      notes: timelineNote,
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
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const dbCoupons = await CouponModel.find().sort({ createdAt: -1 }).lean();
      if (dbCoupons && dbCoupons.length > 0) return JSON.parse(JSON.stringify(dbCoupons));
    }
  } catch (err) {
    console.warn('DB error fetching coupons:', (err as Error).message);
  }
  return [...mem.coupons];
}

export async function validateCoupon(
  code: string,
  cartTotal: number
): Promise<{ valid: boolean; discount: number; message: string }> {
  const cleanCode = code.toUpperCase().trim();
  let match: Coupon | null = null;

  try {
    const conn = await connectToDatabase();
    if (conn) {
      const cDoc = await CouponModel.findOne({ code: cleanCode, isActive: true }).lean();
      if (cDoc) match = JSON.parse(JSON.stringify(cDoc));
    }
  } catch (err) {
    console.warn('DB error validating coupon:', (err as Error).message);
  }

  if (!match) {
    const memMatch = mem.coupons.find((c) => c.code.toUpperCase() === cleanCode && c.isActive);
    if (memMatch) match = memMatch;
  }

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

  let discount = 0;
  if (match.discountType === 'flat' && match.discountAmount) {
    discount = Math.min(match.discountAmount, cartTotal);
  } else {
    const calcDiscount = Math.round((cartTotal * (match.discountPercentage || 10)) / 100);
    discount = Math.min(calcDiscount, match.maxDiscountAmount || 5000);
  }

  return {
    valid: true,
    discount,
    message: `Coupon applied! You save ₹${discount.toLocaleString('en-IN')}`,
  };
}

export async function createOrUpdateCoupon(couponData: Partial<Coupon>): Promise<Coupon> {
  const code = (couponData.code || `OFFER${Math.floor(100 + Math.random() * 900)}`).toUpperCase().trim();
  const fullCoupon: Coupon = {
    _id: couponData._id || `cpn-${Date.now()}`,
    code,
    discountPercentage: couponData.discountPercentage || 0,
    discountAmount: couponData.discountAmount || 0,
    discountType: couponData.discountType || (couponData.discountAmount ? 'flat' : 'percentage'),
    maxDiscountAmount: couponData.maxDiscountAmount || 5000,
    minOrderAmount: couponData.minOrderAmount || 0,
    validUntil: couponData.validUntil || new Date(Date.now() + 30 * 86400000).toISOString(),
    isActive: couponData.isActive !== undefined ? couponData.isActive : true,
    description:
      couponData.description ||
      (couponData.discountAmount
        ? `₹${couponData.discountAmount} Flat Off on minimum purchase of ₹${couponData.minOrderAmount || 0}`
        : `${couponData.discountPercentage || 10}% Off on store purchases`),
    createdAt: couponData.createdAt || new Date().toISOString(),
  };

  try {
    const conn = await connectToDatabase();
    if (conn) {
      const { _id, ...rest } = fullCoupon;
      const updated = await CouponModel.findOneAndUpdate(
        { code },
        { $set: rest, $setOnInsert: { _id } },
        { upsert: true, new: true }
      ).lean();
      if (updated) return JSON.parse(JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('DB error saving coupon:', (err as Error).message);
  }

  const idx = mem.coupons.findIndex((c) => c.code.toUpperCase() === code);
  if (idx !== -1) {
    mem.coupons[idx] = fullCoupon;
  } else {
    mem.coupons.push(fullCoupon);
  }
  return fullCoupon;
}

export async function deleteCoupon(idOrCode: string): Promise<boolean> {
  const clean = idOrCode.toUpperCase().trim();
  try {
    const conn = await connectToDatabase();
    if (conn) {
      await CouponModel.deleteOne({ $or: [{ _id: idOrCode }, { code: clean }] });
    }
  } catch (err) {
    console.warn('DB error deleting coupon:', (err as Error).message);
  }
  mem.coupons = mem.coupons.filter((c) => c._id !== idOrCode && c.code.toUpperCase() !== clean);
  return true;
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const users = await UserModel.find({}, { passwordHash: 0 }).sort({ createdAt: -1 }).lean();
      if (users && users.length > 0) {
        return users.map((u) => ({
          _id: u._id.toString(),
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          addresses: u.addresses ? JSON.parse(JSON.stringify(u.addresses)) : [],
          createdAt: u.createdAt ? u.createdAt.toISOString() : undefined,
        }));
      }
    }
  } catch (err) {
    console.warn('DB error getAllUsers:', (err as Error).message);
  }
  return mem.users.map(({ passwordHash: _, ...safe }) => safe);
}

export async function updateUserRole(userIdOrEmail: string, role: Role): Promise<User | null> {
  const clean = userIdOrEmail.trim();
  const cleanEmail = clean.toLowerCase();

  try {
    const conn = await connectToDatabase();
    if (conn) {
      const updated = await UserModel.findOneAndUpdate(
        { $or: [{ _id: clean }, { email: cleanEmail }] },
        { $set: { role } },
        { new: true }
      ).lean();
      if (updated) {
        return {
          _id: updated._id.toString(),
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          role: updated.role,
          addresses: updated.addresses ? JSON.parse(JSON.stringify(updated.addresses)) : [],
          createdAt: updated.createdAt ? updated.createdAt.toISOString() : undefined,
        };
      }
    }
  } catch (err) {
    console.warn('DB error updateUserRole:', (err as Error).message);
  }

  const memUser = mem.users.find((u) => u._id === clean || u.email.toLowerCase() === cleanEmail);
  if (memUser) {
    memUser.role = role;
    const { passwordHash: _, ...safe } = memUser;
    return safe;
  }
  return null;
}

// USER & AUTH
export async function findUserByEmail(email: string): Promise<User | null> {
  const cleanEmail = email.toLowerCase().trim();
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const userDoc = await UserModel.findOne({ email: cleanEmail });
      if (userDoc) {
        return {
          _id: userDoc._id.toString(),
          name: userDoc.name,
          email: userDoc.email,
          phone: userDoc.phone,
          role: userDoc.role,
          addresses: userDoc.addresses ? JSON.parse(JSON.stringify(userDoc.addresses)) : [],
          createdAt: userDoc.createdAt ? userDoc.createdAt.toISOString() : undefined,
        };
      }
    }
  } catch (err) {
    console.warn('DB error findUserByEmail:', (err as Error).message);
  }

  const memUser = mem.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (memUser) {
    const { passwordHash: _, ...safeUser } = memUser;
    return safeUser;
  }
  return null;
}

export async function createUser(data: {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role?: 'customer' | 'admin';
}): Promise<User> {
  const cleanEmail = data.email.toLowerCase().trim();
  const passwordHash = data.password
    ? await bcrypt.hash(data.password, 10)
    : await bcrypt.hash('Kochuvila@Otp2026', 10);
  const role = data.role || (cleanEmail.includes('admin') ? 'admin' : 'customer');
  const phone = data.phone || '+91 97451 11141';

  try {
    const conn = await connectToDatabase();
    if (conn) {
      const existing = await UserModel.findOne({ email: cleanEmail });
      if (existing) {
        if (data.name) existing.name = data.name.trim();
        if (data.password) existing.passwordHash = passwordHash;
        if (data.phone) existing.phone = data.phone;
        await existing.save();
        return {
          _id: existing._id.toString(),
          name: existing.name,
          email: existing.email,
          phone: existing.phone,
          role: existing.role,
          addresses: existing.addresses ? JSON.parse(JSON.stringify(existing.addresses)) : [],
          createdAt: existing.createdAt ? existing.createdAt.toISOString() : undefined,
        };
      }

      const created = await UserModel.create({
        name: data.name.trim(),
        email: cleanEmail,
        passwordHash,
        phone,
        role,
        addresses: [],
      });
      return {
        _id: created._id.toString(),
        name: created.name,
        email: created.email,
        phone: created.phone,
        role: created.role,
        addresses: [],
        createdAt: created.createdAt ? created.createdAt.toISOString() : undefined,
      };
    }
  } catch (err) {
    console.warn('DB error creating user:', (err as Error).message);
  }

  // Memory Store fallback
  const existingIdx = mem.users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
  if (existingIdx !== -1) {
    if (data.name) mem.users[existingIdx].name = data.name.trim();
    if (data.password) mem.users[existingIdx].passwordHash = passwordHash;
    if (data.phone) mem.users[existingIdx].phone = data.phone;
    const { passwordHash: _, ...safeUser } = mem.users[existingIdx];
    return safeUser;
  }

  const newUser: User & { passwordHash: string } = {
    _id: `usr-${Date.now()}`,
    name: data.name.trim(),
    email: cleanEmail,
    passwordHash,
    role,
    phone,
    addresses: [],
    createdAt: new Date().toISOString(),
  };
  mem.users.push(newUser);
  const { passwordHash: _, ...safeUser } = newUser;
  return safeUser;
}

export async function updateUserPassword(email: string, newPassword: string): Promise<boolean> {
  const cleanEmail = email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(newPassword, 10);
  try {
    const conn = await connectToDatabase();
    if (conn) {
      const res = await UserModel.updateOne({ email: cleanEmail }, { $set: { passwordHash } });
      if (res.modifiedCount > 0) return true;
    }
  } catch (err) {
    console.warn('DB error updating password:', (err as Error).message);
  }

  const memUser = mem.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (memUser) {
    memUser.passwordHash = passwordHash;
    return true;
  }
  return false;
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const cleanEmail = email.toLowerCase().trim();
  const adminEmail = (process.env.ADMIN_DEFAULT_EMAIL || 'admin@kochuvila.com').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'KochuvilaAdmin@2026';

  if (cleanEmail === adminEmail && password === adminPassword) {
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
      const userDoc = await UserModel.findOne({ email: cleanEmail });
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
            createdAt: userDoc.createdAt ? userDoc.createdAt.toISOString() : undefined,
          };
        }
      }
    }
  } catch (err) {
    console.warn('DB error authenticating user:', (err as Error).message);
  }

  // Memory fallback
  const memUser = mem.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (memUser && memUser.passwordHash) {
    const matches = await bcrypt.compare(password, memUser.passwordHash);
    if (matches) {
      const { passwordHash: _, ...safeUser } = memUser;
      return safeUser;
    }
  }

  return null;
}

export async function updateUserProfile(
  identifier: string,
  updates: { name?: string; phone?: string }
): Promise<User | null> {
  const cleanId = identifier.trim();
  const cleanEmail = cleanId.toLowerCase();

  try {
    const conn = await connectToDatabase();
    if (conn) {
      const updated = await UserModel.findOneAndUpdate(
        { $or: [{ _id: cleanId }, { email: cleanEmail }] },
        { $set: updates },
        { new: true }
      ).lean();
      if (updated) {
        return {
          _id: updated._id.toString(),
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          role: updated.role,
          addresses: updated.addresses ? JSON.parse(JSON.stringify(updated.addresses)) : [],
          createdAt: updated.createdAt ? updated.createdAt.toISOString() : undefined,
        };
      }
    }
  } catch (err) {
    console.warn('DB error updateUserProfile:', (err as Error).message);
  }

  const memUser = mem.users.find((u) => u._id === cleanId || u.email.toLowerCase() === cleanEmail);
  if (memUser) {
    if (updates.name) memUser.name = updates.name.trim();
    if (updates.phone) memUser.phone = updates.phone.trim();
    const { passwordHash: _, ...safeUser } = memUser;
    return safeUser;
  }
  return null;
}

export async function addUserAddress(
  identifier: string,
  address: UserAddress
): Promise<User | null> {
  const cleanId = identifier.trim();
  const cleanEmail = cleanId.toLowerCase();
  const newAddr = {
    ...address,
    _id: address._id || `addr-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
  };

  try {
    const conn = await connectToDatabase();
    if (conn) {
      const user = await UserModel.findOne({ $or: [{ _id: cleanId }, { email: cleanEmail }] });
      if (user) {
        if (newAddr.isDefault || user.addresses.length === 0) {
          user.addresses.forEach((a: any) => { a.isDefault = false; });
          newAddr.isDefault = true;
        }
        user.addresses.push(newAddr as any);
        await user.save();
        return {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          addresses: JSON.parse(JSON.stringify(user.addresses)),
          createdAt: user.createdAt ? user.createdAt.toISOString() : undefined,
        };
      }
    }
  } catch (err) {
    console.warn('DB error addUserAddress:', (err as Error).message);
  }

  const memUser = mem.users.find((u) => u._id === cleanId || u.email.toLowerCase() === cleanEmail);
  if (memUser) {
    if (!memUser.addresses) memUser.addresses = [];
    if (newAddr.isDefault || memUser.addresses.length === 0) {
      memUser.addresses.forEach((a) => { a.isDefault = false; });
      newAddr.isDefault = true;
    }
    memUser.addresses.push(newAddr);
    const { passwordHash: _, ...safeUser } = memUser;
    return safeUser;
  }
  return null;
}

export async function updateUserAddress(
  identifier: string,
  addressId: string,
  addressUpdates: Partial<UserAddress>
): Promise<User | null> {
  const cleanId = identifier.trim();
  const cleanEmail = cleanId.toLowerCase();

  try {
    const conn = await connectToDatabase();
    if (conn) {
      const user = await UserModel.findOne({ $or: [{ _id: cleanId }, { email: cleanEmail }] });
      if (user) {
        if (addressUpdates.isDefault) {
          user.addresses.forEach((a: any) => { a.isDefault = false; });
        }
        const target = user.addresses.find((a: any) => a._id?.toString() === addressId);
        if (target) {
          Object.assign(target, addressUpdates);
          await user.save();
          return {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            addresses: JSON.parse(JSON.stringify(user.addresses)),
            createdAt: user.createdAt ? user.createdAt.toISOString() : undefined,
          };
        }
      }
    }
  } catch (err) {
    console.warn('DB error updateUserAddress:', (err as Error).message);
  }

  const memUser = mem.users.find((u) => u._id === cleanId || u.email.toLowerCase() === cleanEmail);
  if (memUser && memUser.addresses) {
    if (addressUpdates.isDefault) {
      memUser.addresses.forEach((a) => { a.isDefault = false; });
    }
    const target = memUser.addresses.find((a) => a._id === addressId);
    if (target) {
      Object.assign(target, addressUpdates);
      const { passwordHash: _, ...safeUser } = memUser;
      return safeUser;
    }
  }
  return null;
}

export async function deleteUserAddress(
  identifier: string,
  addressId: string
): Promise<User | null> {
  const cleanId = identifier.trim();
  const cleanEmail = cleanId.toLowerCase();

  try {
    const conn = await connectToDatabase();
    if (conn) {
      const user = await UserModel.findOne({ $or: [{ _id: cleanId }, { email: cleanEmail }] });
      if (user) {
        user.addresses = user.addresses.filter((a: any) => a._id?.toString() !== addressId) as any;
        if (user.addresses.length > 0 && !user.addresses.some((a: any) => a.isDefault)) {
          user.addresses[0].isDefault = true;
        }
        await user.save();
        return {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          addresses: JSON.parse(JSON.stringify(user.addresses)),
          createdAt: user.createdAt ? user.createdAt.toISOString() : undefined,
        };
      }
    }
  } catch (err) {
    console.warn('DB error deleteUserAddress:', (err as Error).message);
  }

  const memUser = mem.users.find((u) => u._id === cleanId || u.email.toLowerCase() === cleanEmail);
  if (memUser && memUser.addresses) {
    memUser.addresses = memUser.addresses.filter((a) => a._id !== addressId);
    if (memUser.addresses.length > 0 && !memUser.addresses.some((a) => a.isDefault)) {
      memUser.addresses[0].isDefault = true;
    }
    const { passwordHash: _, ...safeUser } = memUser;
    return safeUser;
  }
  return null;
}

// SEED DATABASE
export async function seedDatabase(): Promise<{
  success: boolean;
  message: string;
  counts: { products: number; categories: number; brands: number; orders: number; users: number };
}> {
  const customerPasswordHash = await bcrypt.hash('Kochuvila@2026', 10);
  const adminEmail = (process.env.ADMIN_DEFAULT_EMAIL || 'admin@kochuvila.com').toLowerCase();
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'KochuvilaAdmin@2026';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const sampleUsers = [
    {
      _id: 'usr-admin-01',
      name: 'Kochuvila Administrator',
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: 'admin' as const,
      phone: '+91 94470 00000',
      addresses: [
        {
          _id: 'addr-admin-hq',
          fullName: 'Kochuvila Agencies HQ',
          phone: '+91 94470 00000',
          street: 'Kochuvila Buildings, Pangode Junction',
          landmark: 'Opposite Pangode Police Station',
          city: 'Pangode',
          district: 'Thiruvananthapuram',
          state: 'Kerala',
          pincode: '695609',
          isDefault: true,
        },
      ],
    },
    {
      _id: 'usr-verified-01',
      name: 'Kochuvila Customer',
      email: 'kochuvilapgd1141@gmail.com',
      passwordHash: customerPasswordHash,
      role: 'customer' as const,
      phone: '+91 97451 11141',
      addresses: [
        {
          _id: 'addr-cust-01',
          fullName: 'Kochuvila Customer',
          phone: '+91 97451 11141',
          street: 'Kochuvila Buildings, Pangode Junction',
          landmark: 'Opposite Pangode Police Station',
          city: 'Pangode',
          district: 'Thiruvananthapuram',
          state: 'Kerala',
          pincode: '695609',
          isDefault: true,
        },
      ],
    },
    {
      _id: 'usr-demo-customer',
      name: 'Suresh Kumar',
      email: 'customer@kochuvila.com',
      passwordHash: customerPasswordHash,
      role: 'customer' as const,
      phone: '+91 98471 23456',
      addresses: [
        {
          _id: 'addr-suresh-01',
          fullName: 'Suresh Kumar',
          phone: '+91 98471 23456',
          street: 'TC 14/2045, Rose Nagar, Medical College P.O.',
          landmark: 'Near Medical College',
          city: 'Thiruvananthapuram',
          district: 'Thiruvananthapuram',
          state: 'Kerala',
          pincode: '695011',
          isDefault: true,
        },
      ],
    },
  ];

  const sampleOrders: Order[] = [
    {
      _id: 'ord-demo-01',
      orderNumber: 'KCH-2026-9041',
      customer: {
        userId: 'usr-demo-customer',
        fullName: 'Suresh Kumar',
        email: 'customer@kochuvila.com',
        phone: '+91 98471 23456',
        address: {
          fullName: 'Suresh Kumar',
          phone: '+91 98471 23456',
          street: 'TC 14/2045, Rose Nagar, Medical College P.O.',
          landmark: 'Near Medical College',
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
      orderStatus: 'Shipped',
      timeline: [
        {
          status: 'Order Placed',
          timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
          notes: 'Customer placed order online',
        },
        {
          status: 'Confirmed',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          notes: 'Payment verified and inventory allocated',
        },
        {
          status: 'Shipped',
          timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
          notes: 'Dispatched from Trivandrum central warehouse via specialized appliance carrier',
        },
      ],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      _id: 'ord-demo-02',
      orderNumber: 'KCH-2026-8812',
      customer: {
        userId: 'usr-verified-01',
        fullName: 'Kochuvila Customer',
        email: 'kochuvilapgd1141@gmail.com',
        phone: '+91 97451 11141',
        address: {
          fullName: 'Kochuvila Customer',
          phone: '+91 97451 11141',
          street: 'Kochuvila Buildings, Pangode Junction',
          landmark: 'Opposite Pangode Police Station',
          city: 'Pangode',
          district: 'Thiruvananthapuram',
          state: 'Kerala',
          pincode: '695609',
        },
      },
      items: [
        {
          productId: 'prod-fur-01',
          name: 'Royal Kerala Solid Teakwood Living Room 3-Seater Sofa',
          image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=80',
          brand: 'Royal Teak',
          price: 48900,
          mrp: 65000,
          quantity: 1,
          sku: 'FUR-TK-SOFA-01',
        },
        {
          productId: 'prod-app-04',
          name: 'Sony Bravia 55 inch 4K Ultra HD Smart OLED Google TV',
          image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=1000&q=80',
          brand: 'Sony',
          price: 114990,
          mrp: 149900,
          quantity: 1,
          sku: 'SNY-TV-55-OLED',
        },
      ],
      subtotal: 163890,
      discount: 5000,
      couponCode: 'FESTIVAL5',
      deliveryCharge: 0,
      totalAmount: 158890,
      paymentMethod: 'online',
      paymentStatus: 'paid',
      orderStatus: 'Processing',
      timeline: [
        {
          status: 'Order Placed',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          notes: 'Customer placed order online',
        },
        {
          status: 'Confirmed',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          notes: 'Payment confirmed via UPI',
        },
        {
          status: 'Processing',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          notes: 'Furniture inspected by master carpenter; electronics prepared for white-glove transport',
        },
      ],
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ];

  try {
    const conn = await connectToDatabase();
    if (conn) {
      // 1. Seed Products
      for (const prod of SAMPLE_PRODUCTS) {
        const { _id, ...prodRest } = prod;
        await ProductModel.findOneAndUpdate(
          { slug: prod.slug },
          { $set: prodRest, $setOnInsert: { _id } },
          { upsert: true, new: true }
        );
      }
      // 2. Seed Categories
      for (const cat of SAMPLE_CATEGORIES) {
        const { _id, ...catRest } = cat;
        await CategoryModel.findOneAndUpdate(
          { slug: cat.slug },
          { $set: catRest, $setOnInsert: { _id } },
          { upsert: true, new: true }
        );
      }
      // 3. Seed Brands
      for (const b of SAMPLE_BRANDS) {
        const { _id, ...brandRest } = b;
        await BrandModel.findOneAndUpdate(
          { slug: b.slug },
          { $set: brandRest, $setOnInsert: { _id } },
          { upsert: true, new: true }
        );
      }
      // 4. Seed Users
      for (const u of sampleUsers) {
        const { _id, ...userRest } = u;
        await UserModel.findOneAndUpdate(
          { email: u.email.toLowerCase() },
          { $set: userRest, $setOnInsert: { _id } },
          { upsert: true, new: true }
        );
      }
      // 5. Seed Orders
      for (const ord of sampleOrders) {
        const { _id, ...orderRest } = ord;
        await OrderModel.findOneAndUpdate(
          { orderNumber: ord.orderNumber },
          { $set: orderRest, $setOnInsert: { _id } },
          { upsert: true, new: true }
        );
      }
      // 6. Seed Coupons
      for (const cpn of SAMPLE_COUPONS) {
        const { _id, ...cpnRest } = cpn;
        await CouponModel.findOneAndUpdate(
          { code: cpn.code.toUpperCase() },
          { $set: cpnRest, $setOnInsert: { _id } },
          { upsert: true, new: true }
        );
      }
    }
  } catch (err) {
    console.warn('DB seed error, memory store refreshed:', (err as Error).message);
  }

  mem.products = JSON.parse(JSON.stringify(SAMPLE_PRODUCTS));
  mem.categories = JSON.parse(JSON.stringify(SAMPLE_CATEGORIES));
  mem.brands = JSON.parse(JSON.stringify(SAMPLE_BRANDS));
  mem.orders = JSON.parse(JSON.stringify(sampleOrders));
  mem.users = JSON.parse(JSON.stringify(sampleUsers));
  mem.coupons = JSON.parse(JSON.stringify(SAMPLE_COUPONS));
  mem.isSeeded = true;

  return {
    success: true,
    message: 'Database & memory store successfully seeded with complete retail catalog, users, orders, and coupons.',
    counts: {
      products: mem.products.length,
      categories: mem.categories.length,
      brands: mem.brands.length,
      orders: mem.orders.length,
      users: mem.users.length,
    },
  };
}

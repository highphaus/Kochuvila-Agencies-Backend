import { Router, Request, Response } from 'express';
import {
  getProducts,
  getProductBySlug,
  createOrUpdateProduct,
  deleteProduct,
} from '../services/data-store';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      category,
      subcategory,
      brand,
      search,
      minPrice,
      maxPrice,
      rating,
      isFeatured,
      isDeal,
      sort,
      page,
      limit,
    } = req.query;

    const data = await getProducts({
      category: category as string,
      subcategory: subcategory as string,
      brand: brand as string,
      search: search as string,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      rating: rating ? Number(rating) : undefined,
      isFeatured: isFeatured === 'true' ? true : undefined,
      isDeal: isDeal === 'true' ? true : undefined,
      sort: sort as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 24,
    });

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products', message: (error as Error).message });
  }
});

router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const product = await getProductBySlug(req.params.slug);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product', message: (error as Error).message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.name || !body.price || !body.category) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }
    const created = await createOrUpdateProduct(body);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product', message: (error as Error).message });
  }
});

router.put('/:slug', async (req: Request, res: Response) => {
  try {
    const existing = await getProductBySlug(req.params.slug);
    const updated = await createOrUpdateProduct({
      ...(existing || {}),
      ...req.body,
      _id: existing?._id || req.body._id,
      slug: req.body.slug || existing?.slug || (req.params.slug.startsWith('prod-') ? undefined : req.params.slug),
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product', message: (error as Error).message });
  }
});

router.delete('/:slug', async (req: Request, res: Response) => {
  try {
    const product = await getProductBySlug(req.params.slug);
    const idToDelete = product ? product._id : req.params.slug;
    await deleteProduct(idToDelete);
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product', message: (error as Error).message });
  }
});

router.patch('/:slug/stock', async (req: Request, res: Response) => {
  try {
    const { inStock, stock } = req.body;
    const product = await getProductBySlug(req.params.slug);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const updated = await createOrUpdateProduct({
      ...product,
      inStock: inStock !== undefined ? inStock : (stock !== undefined ? stock > 0 : product.inStock),
      stock: stock !== undefined ? stock : (inStock === false ? 0 : (product.stock || 5)),
    });
    res.json({ success: true, product: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock', message: (error as Error).message });
  }
});

export default router;

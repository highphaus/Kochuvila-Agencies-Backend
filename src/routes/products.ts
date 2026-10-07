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
    const updated = await createOrUpdateProduct({ ...req.body, slug: req.params.slug });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product', message: (error as Error).message });
  }
});

router.delete('/:slug', async (req: Request, res: Response) => {
  try {
    const product = await getProductBySlug(req.params.slug);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    await deleteProduct(product._id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product', message: (error as Error).message });
  }
});

export default router;

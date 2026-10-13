import { Router, Request, Response } from 'express';
import { getCategories } from '../services/data-store';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await getCategories();
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories', message: (error as Error).message });
  }
});

export default router;

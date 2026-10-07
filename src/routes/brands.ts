import { Router, Request, Response } from 'express';
import { getBrands } from '../services/data-store';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const brands = await getBrands();
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch brands', message: (error as Error).message });
  }
});

export default router;

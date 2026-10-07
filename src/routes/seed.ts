import { Router, Request, Response } from 'express';
import { seedDatabase } from '../services/data-store';

const router = Router();

router.post('/', async (_req: Request, res: Response) => {
  try {
    const result = await seedDatabase();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to seed database', message: (error as Error).message });
  }
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await seedDatabase();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to seed database', message: (error as Error).message });
  }
});

export default router;

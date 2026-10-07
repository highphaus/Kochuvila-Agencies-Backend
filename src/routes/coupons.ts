import { Router, Request, Response } from 'express';
import { getCoupons, validateCoupon } from '../services/data-store';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const coupons = await getCoupons();
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coupons', message: (error as Error).message });
  }
});

router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { code, cartTotal } = req.body;
    if (!code || typeof cartTotal !== 'number') {
      return res.status(400).json({ error: 'Code and cartTotal are required' });
    }
    const result = await validateCoupon(code, cartTotal);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate coupon', message: (error as Error).message });
  }
});

export default router;

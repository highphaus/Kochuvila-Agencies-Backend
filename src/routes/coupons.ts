import { Router, Request, Response } from 'express';
import {
  getCoupons,
  validateCoupon,
  createOrUpdateCoupon,
  deleteCoupon,
} from '../services/data-store';

const router = Router();

// GET all coupons
router.get('/', async (_req: Request, res: Response) => {
  try {
    const coupons = await getCoupons();
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coupons', message: (error as Error).message });
  }
});

// POST validate coupon
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

// POST create or update coupon
router.post('/', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }
    const saved = await createOrUpdateCoupon(req.body);
    res.status(201).json({ success: true, coupon: saved, message: 'Coupon saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save coupon', message: (error as Error).message });
  }
});

// PATCH toggle or update coupon status
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const saved = await createOrUpdateCoupon({ ...req.body, _id: id });
    res.json({ success: true, coupon: saved, message: 'Coupon updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update coupon', message: (error as Error).message });
  }
});

// DELETE coupon
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteCoupon(id);
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete coupon', message: (error as Error).message });
  }
});

export default router;

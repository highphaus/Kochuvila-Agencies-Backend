import { Router, Request, Response } from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
} from '../services/data-store';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const orders = await getOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders', message: (error as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order', message: (error as Error).message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.customer || !body.customer.fullName || !body.customer.phone) {
      return res.status(400).json({ error: 'Customer name and phone number are required' });
    }
    if (!body.items || body.items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    const created = await createOrder(body);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order', message: (error as Error).message });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { status, notes } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updated = await updateOrderStatus(req.params.id, status, notes);
    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status', message: (error as Error).message });
  }
});

export default router;

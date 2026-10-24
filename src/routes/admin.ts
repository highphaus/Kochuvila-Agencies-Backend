import { Router, Request, Response } from 'express';
import {
  getAllUsers,
  updateUserRole,
  getProducts,
  getOrders,
  getCoupons,
} from '../services/data-store';
import { Role } from '../types';

const router = Router();

// GET all registered users with their roles
router.get('/users', async (_req: Request, res: Response) => {
  try {
    const users = await getAllUsers();
    res.json({ success: true, users, count: users.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users', message: (error as Error).message });
  }
});

// PATCH change user role (customer <-> admin <-> manager)
router.patch('/users/:userId/role', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['customer', 'admin', 'manager'].includes(role)) {
      return res.status(400).json({ error: 'Valid role is required (customer, admin, manager)' });
    }

    const updated = await updateUserRole(userId, role as Role);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: updated,
      message: `User role updated to ${role} successfully`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user role', message: (error as Error).message });
  }
});

// GET admin dashboard overview stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [prodsData, ordersList, couponsList, usersList] = await Promise.all([
      getProducts({ limit: 500 }),
      getOrders(),
      getCoupons(),
      getAllUsers(),
    ]);

    const products = prodsData.products || [];
    const totalRevenue = ordersList.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const outOfStockCount = products.filter((p) => p.stock <= 0 || p.inStock === false).length;
    const adminCount = usersList.filter((u) => u.role === 'admin').length;
    const customerCount = usersList.filter((u) => u.role !== 'admin').length;

    res.json({
      success: true,
      stats: {
        totalRevenue,
        ordersCount: ordersList.length,
        productsCount: products.length,
        outOfStockCount,
        couponsCount: couponsList.length,
        activeCouponsCount: couponsList.filter((c) => c.isActive).length,
        usersCount: usersList.length,
        adminCount,
        customerCount,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin stats', message: (error as Error).message });
  }
});

export default router;

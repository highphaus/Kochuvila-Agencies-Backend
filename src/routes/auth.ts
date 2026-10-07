import { Router, Request, Response } from 'express';
import { authenticateUser } from '../services/data-store';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'kochuvila_super_secure_jwt_secret_key_retail_2026_dev';

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed', message: (error as Error).message });
  }
});

export default router;

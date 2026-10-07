import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToDatabase } from './config/db';

import productsRouter from './routes/products';
import categoriesRouter from './routes/categories';
import brandsRouter from './routes/brands';
import ordersRouter from './routes/orders';
import couponsRouter from './routes/coupons';
import authRouter from './routes/auth';
import seedRouter from './routes/seed';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json());

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'Kochuvila Agencies REST API Backend',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/brands', brandsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/auth', authRouter);
app.use('/api/seed', seedRouter);

// Start server
async function startServer() {
  await connectToDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 Kochuvila Agencies Backend running at http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`📦 Products API: http://localhost:${PORT}/api/products`);
  });
}

startServer();

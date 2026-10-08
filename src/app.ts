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

// Root Route & Health Check
app.get('/', (req: Request, res: Response) => {
  if (req.accepts('html')) {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Kochuvila Agencies API</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 520px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
            .badge { display: inline-flex; align-items: center; gap: 6px; background: #064e3b; color: #34d399; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
            .dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; }
            h1 { font-size: 24px; margin: 0 0 8px 0; color: #ffffff; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0; }
            .endpoints { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
            .endpoints a { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #0f172a; border: 1px solid #334155; border-radius: 10px; color: #38bdf8; text-decoration: none; font-size: 13px; font-family: monospace; transition: all 0.2s; }
            .endpoints a:hover { border-color: #38bdf8; background: #1e293b; transform: translateY(-1px); }
            .tag { color: #94a3b8; font-size: 11px; font-family: sans-serif; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge"><span class="dot"></span> Online & Operational</div>
            <h1>Kochuvila Agencies Backend</h1>
            <p>The REST API service is actively serving requests. Access the available endpoints below:</p>
            <div class="endpoints">
              <a href="/api/health" target="_blank"><span>GET /api/health</span><span class="tag">System Health</span></a>
              <a href="/api/products" target="_blank"><span>GET /api/products</span><span class="tag">Product Catalog</span></a>
              <a href="/api/categories" target="_blank"><span>GET /api/categories</span><span class="tag">Categories</span></a>
              <a href="/api/brands" target="_blank"><span>GET /api/brands</span><span class="tag">Brand Partners</span></a>
              <a href="/api/coupons" target="_blank"><span>GET /api/coupons</span><span class="tag">Promotions</span></a>
            </div>
          </div>
        </body>
      </html>
    `);
    return;
  }

  res.json({
    status: 'online',
    service: 'Kochuvila Agencies REST API Backend',
    message: 'Welcome to Kochuvila Agencies API',
    endpoints: {
      health: '/api/health',
      products: '/api/products',
      categories: '/api/categories',
      brands: '/api/brands',
      coupons: '/api/coupons',
    },
  });
});

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

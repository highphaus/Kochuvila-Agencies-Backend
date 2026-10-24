import { Router, Request, Response } from 'express';
import {
  getReviews,
  getReviewById,
  createOrUpdateReview,
  deleteReview,
} from '../services/data-store';

const router = Router();

// GET all reviews or reviews for a specific product
router.get('/', async (req: Request, res: Response) => {
  try {
    const { productId } = req.query;
    const reviews = await getReviews(productId ? String(productId) : undefined);
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews', message: (error as Error).message });
  }
});

// GET review by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const review = await getReviewById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch review', message: (error as Error).message });
  }
});

// POST create new review
router.post('/', async (req: Request, res: Response) => {
  try {
    const { productId, userName, rating, headline, comment } = req.body;
    if (!userName || !comment) {
      return res.status(400).json({ error: 'Reviewer name and review comment are required' });
    }

    const created = await createOrUpdateReview({
      productId: productId || 'prod-app-01',
      productName: req.body.productName,
      userName: userName.trim(),
      userEmail: req.body.userEmail ? req.body.userEmail.trim() : undefined,
      rating: rating !== undefined ? Number(rating) : 5,
      headline: (headline || 'Customer Review').trim(),
      comment: comment.trim(),
      verifiedPurchase: req.body.verifiedPurchase !== false,
    });

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create review', message: (error as Error).message });
  }
});

// PUT update existing review
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const updated = await createOrUpdateReview({
      ...req.body,
      _id: req.params.id,
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update review', message: (error as Error).message });
  }
});

// DELETE remove review
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const success = await deleteReview(req.params.id);
    res.json({ success, message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete review', message: (error as Error).message });
  }
});

export default router;

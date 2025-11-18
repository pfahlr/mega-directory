/**
 * Admin review moderation routes
 * Handles review approval, rejection, and flagging
 */
import express = require('express');
import { Request, Response } from 'express';
import { ReviewStatus } from '@prisma/client';
import { asyncHandler } from '../../middleware/asyncHandler';
import {
  getReviewsByStatus,
  getReviewById,
  moderateReview,
} from '../../services/reviewService';

const router = express.Router();

/**
 * GET /v1/admin/reviews
 * Get reviews with optional status filter
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as ReviewStatus | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    // Validate status
    if (status && !Object.values(ReviewStatus).includes(status)) {
      res.status(400).json({
        error: 'Invalid status',
        valid_statuses: Object.values(ReviewStatus),
      });
      return;
    }

    try {
      const result = await getReviewsByStatus(status, limit, offset);

      res.json({
        reviews: result.reviews.map((review) => ({
          id: review.id,
          listing_id: review.listingId,
          rating: review.rating,
          text: review.text,
          status: review.status,
          created_at: review.createdAt,
          updated_at: review.updatedAt,
          user: {
            id: review.user.id,
            username: review.user.username,
            display_name: review.user.displayName,
          },
          images: review.images.map((img) => ({
            id: img.id,
            url: img.url,
            width: img.width,
            height: img.height,
          })),
        })),
        total: result.total,
        limit,
        offset,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  })
);

/**
 * GET /v1/admin/reviews/:id
 * Get single review with full details including spam score
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const reviewId = parseInt(req.params.id, 10);

    if (isNaN(reviewId)) {
      res.status(400).json({ error: 'Invalid review ID' });
      return;
    }

    try {
      const review = await getReviewById(reviewId);

      if (!review) {
        res.status(404).json({ error: 'Review not found' });
        return;
      }

      // Include full details for admin
      res.json({
        review: {
          id: review.id,
          listing_id: review.listingId,
          rating: review.rating,
          text: review.text,
          status: review.status,
          spam_score: review.spamScore,
          spam_details: review.spamDetails,
          created_at: review.createdAt,
          updated_at: review.updatedAt,
          user: {
            id: review.user.id,
            username: review.user.username,
            display_name: review.user.displayName,
          },
          images: review.images.map((img) => ({
            id: img.id,
            url: img.url,
            width: img.width,
            height: img.height,
          })),
        },
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  })
);

/**
 * PUT /v1/admin/reviews/:id
 * Moderate review (approve, reject, or flag)
 */
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const reviewId = parseInt(req.params.id, 10);

    if (isNaN(reviewId)) {
      res.status(400).json({ error: 'Invalid review ID' });
      return;
    }

    // Get admin user ID from auth middleware
    // TODO: Replace with actual admin auth middleware
    const adminId = (req as any).user?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Admin authentication required' });
      return;
    }

    const { status } = req.body;

    // Validate status
    if (!status || !Object.values(ReviewStatus).includes(status)) {
      res.status(400).json({
        error: 'status is required',
        valid_statuses: Object.values(ReviewStatus),
      });
      return;
    }

    try {
      const review = await moderateReview(reviewId, adminId, {
        status,
      });

      res.json({
        review: {
          id: review.id,
          listing_id: review.listingId,
          rating: review.rating,
          text: review.text,
          status: review.status,
          created_at: review.createdAt,
          updated_at: review.updatedAt,
          user: {
            id: review.user.id,
            username: review.user.username,
            display_name: review.user.displayName,
          },
          images: review.images.map((img) => ({
            id: img.id,
            url: img.url,
            width: img.width,
            height: img.height,
          })),
        },
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  })
);

export default router;

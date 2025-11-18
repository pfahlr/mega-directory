/**
 * Review routes
 * Handles review CRUD with image uploads
 */
import express = require('express');
import { Request, Response } from 'express';
import multer from 'multer';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, optionalAuth } from '../../middleware/userAuth';
import { requireValidCaptcha } from '../../utils/hcaptchaVerification';
import {
  createReview,
  getReviewsForListing,
  getReviewById,
  updateReview,
  deleteReview,
  getReviewStats,
} from '../../services/reviewService';
import { ReviewStatus } from '@prisma/client';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 512 * 1024, // 512KB max per file
    files: 5, // Max 5 files
  },
  fileFilter: (_req, file, cb) => {
    // Accept only images
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and AVIF allowed.'));
    }
  },
});

/**
 * POST /v1/reviews
 * Create a new review with optional images
 */
router.post(
  '/',
  requireAuth,
  upload.array('images', 5),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { listing_id, rating, text, h_captcha_response } = req.body;

    // Validate listing_id
    const listingId = parseInt(listing_id, 10);
    if (isNaN(listingId)) {
      res.status(400).json({ error: 'listing_id is required and must be a number' });
      return;
    }

    // Validate text
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    // Validate rating (optional)
    let validatedRating: number | null = null;
    if (rating !== undefined && rating !== null && rating !== '') {
      validatedRating = parseInt(rating, 10);
      if (isNaN(validatedRating)) {
        res.status(400).json({ error: 'rating must be a number' });
        return;
      }
    }

    // Verify CAPTCHA
    const ipAddress = (req.ip || req.socket.remoteAddress || '').replace('::ffff:', '');

    try {
      await requireValidCaptcha(h_captcha_response, ipAddress);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Process uploaded images
    const files = req.files as Express.Multer.File[] | undefined;
    const images = files?.map((file) => ({
      buffer: file.buffer,
      originalFilename: file.originalname,
    }));

    // Get site setting for auto-approve (default: false = pre-moderation)
    // TODO: Read from site settings table when implemented
    const autoApprove = false;

    try {
      const review = await createReview({
        userId: req.user.id,
        listingId,
        rating: validatedRating,
        text,
        images,
        ipAddress,
        autoApprove,
      });

      res.status(201).json({
        review: {
          id: review.id,
          listing_id: review.listingId,
          rating: review.rating,
          text: review.text,
          status: review.status,
          created_at: review.createdAt,
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
      if (error.message.includes('already reviewed')) {
        res.status(409).json({ error: error.message });
        return;
      }
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  })
);

/**
 * GET /v1/reviews/:id
 * Get a single review by ID
 */
router.get(
  '/:id',
  optionalAuth,
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
      res.status(400).json({ error: error.message });
    }
  })
);

/**
 * PUT /v1/reviews/:id
 * Update a review (text and rating only, no image updates)
 */
router.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const reviewId = parseInt(req.params.id, 10);

    if (isNaN(reviewId)) {
      res.status(400).json({ error: 'Invalid review ID' });
      return;
    }

    const { rating, text } = req.body;

    // Validate rating if provided
    let validatedRating: number | null | undefined = undefined;
    if (rating !== undefined) {
      if (rating === null || rating === '') {
        validatedRating = null;
      } else {
        validatedRating = parseInt(rating, 10);
        if (isNaN(validatedRating)) {
          res.status(400).json({ error: 'rating must be a number' });
          return;
        }
      }
    }

    try {
      const review = await updateReview(reviewId, req.user.id, {
        rating: validatedRating,
        text,
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
      if (error.message.includes('Not authorized')) {
        res.status(403).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  })
);

/**
 * DELETE /v1/reviews/:id
 * Delete a review
 */
router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const reviewId = parseInt(req.params.id, 10);

    if (isNaN(reviewId)) {
      res.status(400).json({ error: 'Invalid review ID' });
      return;
    }

    try {
      await deleteReview(reviewId, req.user.id);

      res.json({ success: true });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message.includes('Not authorized')) {
        res.status(403).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  })
);

/**
 * GET /v1/listings/:listing_id/reviews
 * Get all reviews for a listing
 */
router.get(
  '/listings/:listing_id',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const listingId = parseInt(req.params.listing_id, 10);

    if (isNaN(listingId)) {
      res.status(400).json({ error: 'Invalid listing ID' });
      return;
    }

    try {
      // Only show approved reviews to public
      // TODO: Show user's own review regardless of status
      const reviews = await getReviewsForListing(listingId, [ReviewStatus.APPROVED]);
      const stats = await getReviewStats(listingId);

      res.json({
        reviews: reviews.map((review) => ({
          id: review.id,
          listing_id: review.listingId,
          rating: review.rating,
          text: review.text,
          created_at: review.createdAt,
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
        stats: {
          total_reviews: stats.totalReviews,
          total_ratings: stats.totalRatings,
          average_rating: stats.averageRating,
          rating_distribution: stats.ratingDistribution,
        },
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  })
);

export default router;

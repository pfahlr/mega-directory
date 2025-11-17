import express, { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import * as listingService from '../../services/listingService';
import { BadRequestError } from '../../errors';

const router = express.Router();

/**
 * POST /v1/crawler/listings
 * Bulk create listings from crawler
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { listings } = req.body;

    if (!Array.isArray(listings)) {
      throw new BadRequestError('listings must be an array');
    }

    const created = [];
    const errors = [];

    for (const listingData of listings) {
      try {
        const { title, slug, websiteUrl, summary, addresses, categoryIds } = listingData;

        if (!title || !slug) {
          errors.push({ listing: listingData, error: 'title and slug are required' });
          continue;
        }

        const listing = await listingService.createListing({
          title,
          slug,
          websiteUrl,
          summary,
          addresses: addresses || [],
          categoryIds,
          status: 'PENDING', // Crawler submissions start as PENDING
        });

        created.push(listing);
      } catch (error: any) {
        console.error('[crawler] Failed to create listing:', error);
        errors.push({
          listing: listingData,
          error: error.code === 'P2002' ? 'Duplicate slug' : 'Creation failed',
        });
      }
    }

    res.status(201).json({
      data: {
        created: created.length,
        errors: errors.length,
        listings: created,
        failedListings: errors,
      },
    });
  })
);

/**
 * POST /v1/crawler/ping
 * Ping endpoint to verify crawler authentication
 */
router.post('/ping', (req, res) => {
  res.json({ status: 'crawler-ok' });
});

export default router;

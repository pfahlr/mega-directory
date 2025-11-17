import express, { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validateBody } from '../../middleware/validation';
import { createListingSchema, updateListingSchema } from '../../validation/schemas/listing';
import * as listingService from '../../services/listingService';
import { BadRequestError } from '../../errors';

const router = express.Router();

/**
 * GET /v1/admin/listings
 * Get all listings
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const listings = await listingService.getAllListings();
    res.json({ data: listings });
  })
);

/**
 * GET /v1/admin/listings/:id
 * Get listing by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const listing = await listingService.getListingById(id);
    res.json({ data: listing });
  })
);

/**
 * POST /v1/admin/listings
 * Create new listing
 */
router.post(
  '/',
  validateBody(createListingSchema),
  asyncHandler(async (req, res) => {
    const listing = await listingService.createListing(req.body);
    res.status(201).json({ data: listing });
  })
);

/**
 * PUT /v1/admin/listings/:id
 * Update listing
 */
router.put(
  '/:id',
  validateBody(updateListingSchema),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const listing = await listingService.updateListing(id, req.body);
    res.json({ data: listing });
  })
);

/**
 * DELETE /v1/admin/listings/:id
 * Delete listing
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await listingService.deleteListing(id);
    res.status(204).json({});
  })
);

/**
 * POST /v1/admin/listings/review
 * Batch update listings
 */
router.post(
  '/review',
  asyncHandler(async (req, res) => {
    if (!req.body.listings || !Array.isArray(req.body.listings)) {
      throw new BadRequestError('listings must be an array');
    }

    const updates = req.body.listings.map((entry: any) => ({
      id: entry.id,
      status: entry.status,
      title: entry.businessName || entry.title,
      websiteUrl: entry.website !== undefined ? entry.website : entry.websiteUrl,
      notes: entry.notes,
    }));

    const result = await listingService.batchUpdateListings(updates);

    res.json({
      data: {
        delivered: result.delivered,
        skipped: result.failed.length,
        failures: result.failed.map(f => ({
          id: f.id,
          reason: f.reason,
        })),
      },
    });
  })
);

export default router;

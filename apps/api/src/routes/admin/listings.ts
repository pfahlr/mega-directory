import express, { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validateBody } from '../../middleware/validation';
import { createListingSchema, updateListingSchema } from '../../validation/schemas/listing';
import * as listingService from '../../services/listingService';
import { BadRequestError } from '../../errors';

const router = express.Router();

/**
 * GET /v1/admin/listings
 * Get all listings (paginated)

 * @openapi
 * /v1/admin/listings:
 *   get:
 *     tags:
 *       - Admin - Listings
 *     summary: Get all listings
 *     description: Retrieve all listings with their addresses and categories
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Listing'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const result = await listingService.getAllListings({ page, limit });
    res.json(result);
  })
);

/**
 * @openapi
 * /v1/admin/listings/{id}:
 *   get:
 *     tags:
 *       - Admin - Listings
 *     summary: Get listing by ID
 *     description: Retrieve a single listing with all its addresses and categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Listing ID
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Listing'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Listing not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @openapi
 * /v1/admin/listings:
 *   post:
 *     tags:
 *       - Admin - Listings
 *     summary: Create new listing
 *     description: Create a new business listing with addresses and category associations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - slug
 *               - addresses
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 example: Acme Professional Services
 *               slug:
 *                 type: string
 *                 pattern: ^[a-z0-9-]+$
 *                 maxLength: 80
 *                 example: acme-professional-services
 *               websiteUrl:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *               contactEmail:
 *                 type: string
 *                 format: email
 *                 nullable: true
 *               contactPhone:
 *                 type: string
 *                 maxLength: 50
 *                 nullable: true
 *               summary:
 *                 type: string
 *                 maxLength: 1000
 *                 nullable: true
 *               description:
 *                 type: string
 *                 maxLength: 5000
 *                 nullable: true
 *               status:
 *                 type: string
 *                 enum: [PENDING, APPROVED, REJECTED]
 *                 default: PENDING
 *               addresses:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 10
 *                 items:
 *                   $ref: '#/components/schemas/Address'
 *               categoryIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 default: []
 *     responses:
 *       201:
 *         description: Listing created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Listing'
 *       400:
 *         description: Bad request - validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Conflict - slug already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @openapi
 * /v1/admin/listings/{id}:
 *   put:
 *     tags:
 *       - Admin - Listings
 *     summary: Update listing
 *     description: Update an existing listing's details, addresses, and categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Listing ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               slug:
 *                 type: string
 *                 pattern: ^[a-z0-9-]+$
 *                 maxLength: 80
 *               websiteUrl:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *               contactEmail:
 *                 type: string
 *                 format: email
 *                 nullable: true
 *               contactPhone:
 *                 type: string
 *                 maxLength: 50
 *                 nullable: true
 *               summary:
 *                 type: string
 *                 maxLength: 1000
 *                 nullable: true
 *               description:
 *                 type: string
 *                 maxLength: 5000
 *                 nullable: true
 *               status:
 *                 type: string
 *                 enum: [PENDING, APPROVED, REJECTED]
 *               addresses:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 10
 *                 items:
 *                   $ref: '#/components/schemas/Address'
 *               categoryIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Listing updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Listing'
 *       400:
 *         description: Bad request - validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Listing not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Conflict - slug already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @openapi
 * /v1/admin/listings/{id}:
 *   delete:
 *     tags:
 *       - Admin - Listings
 *     summary: Delete listing
 *     description: Permanently delete a listing and all its associated data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Listing ID
 *     responses:
 *       204:
 *         description: Listing deleted successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Listing not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @openapi
 * /v1/admin/listings/review:
 *   post:
 *     tags:
 *       - Admin - Listings
 *     summary: Batch update listings
 *     description: Update multiple listings in a single request, useful for batch review operations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - listings
 *             properties:
 *               listings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: Listing ID
 *                     status:
 *                       type: string
 *                       enum: [PENDING, APPROVED, REJECTED]
 *                     title:
 *                       type: string
 *                       maxLength: 200
 *                     businessName:
 *                       type: string
 *                       maxLength: 200
 *                       description: Alternative to title field
 *                     websiteUrl:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                     website:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                       description: Alternative to websiteUrl field
 *                     notes:
 *                       type: string
 *     responses:
 *       200:
 *         description: Batch update completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     delivered:
 *                       type: integer
 *                       description: Number of successfully updated listings
 *                     skipped:
 *                       type: integer
 *                       description: Number of failed updates
 *                     failures:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           reason:
 *                             type: string
 *       400:
 *         description: Bad request - listings must be an array
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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

import express = require('express');
import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import * as listingService from '../../services/listingService';
import { BadRequestError } from '../../errors';

const router = express.Router();

/**
 * @openapi
 * /v1/crawler/listings:
 *   post:
 *     tags:
 *       - Crawler
 *     summary: Bulk create listings
 *     description: Submit multiple listings from automated crawler for processing
 *     security:
 *       - crawlerToken: []
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
 *                     - title
 *                     - slug
 *                   properties:
 *                     title:
 *                       type: string
 *                       maxLength: 200
 *                       example: Acme Professional Services
 *                     slug:
 *                       type: string
 *                       pattern: ^[a-z0-9-]+$
 *                       example: acme-professional-services
 *                     websiteUrl:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                     summary:
 *                       type: string
 *                       maxLength: 1000
 *                       nullable: true
 *                     addresses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           addressLine1:
 *                             type: string
 *                           addressLine2:
 *                             type: string
 *                             nullable: true
 *                           city:
 *                             type: string
 *                             nullable: true
 *                           region:
 *                             type: string
 *                             nullable: true
 *                           postalCode:
 *                             type: string
 *                             nullable: true
 *                           country:
 *                             type: string
 *                             nullable: true
 *                     categoryIds:
 *                       type: array
 *                       items:
 *                         type: integer
 *     responses:
 *       201:
 *         description: Bulk creation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     created:
 *                       type: integer
 *                       description: Number of successfully created listings
 *                     errors:
 *                       type: integer
 *                       description: Number of failed listings
 *                     listings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Listing'
 *                     failedListings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           listing:
 *                             type: object
 *                           error:
 *                             type: string
 *       400:
 *         description: Bad request - listings must be an array
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid crawler token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @openapi
 * /v1/crawler/ping:
 *   post:
 *     tags:
 *       - Crawler
 *     summary: Verify crawler authentication
 *     description: Ping endpoint to verify that crawler authentication is working
 *     security:
 *       - crawlerToken: []
 *     responses:
 *       200:
 *         description: Authentication verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: crawler-ok
 *       401:
 *         description: Unauthorized - invalid crawler token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/ping', (_req: Request, res: Response) => {
  res.json({ status: 'crawler-ok' });
});

export default router;

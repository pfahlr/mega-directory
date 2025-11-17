import * as express from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validateBody } from '../../middleware/validation';
import { addressSchema } from '../../validation/schemas/listing';
import * as listingService from '../../services/listingService';
import { BadRequestError } from '../../errors';

const router = express.Router();

/**
 * GET /v1/admin/addresses
 * Get all addresses (paginated)
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const result = await listingService.getAllAddresses({ page, limit });
    res.json(result);
  })
);

/**
 * GET /v1/admin/addresses/:id
 * Get address by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const address = await listingService.getAddressById(id);
    res.json({ data: address });
  })
);

/**
 * POST /v1/admin/addresses
 * Create new address for a listing
 */
router.post(
  '/',
  validateBody(addressSchema),
  asyncHandler(async (req, res) => {
    if (!req.body.listingId) {
      throw new BadRequestError('listingId is required');
    }

    const address = await listingService.createAddress(req.body.listingId, req.body);
    res.status(201).json({ data: address });
  })
);

/**
 * PUT /v1/admin/addresses/:id
 * Update address
 */
router.put(
  '/:id',
  validateBody(addressSchema),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const address = await listingService.updateAddress(id, req.body);
    res.json({ data: address });
  })
);

/**
 * DELETE /v1/admin/addresses/:id
 * Delete address
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await listingService.deleteAddress(id);
    res.status(204).end();
  })
);

export default router;

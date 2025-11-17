import express, { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validateBody } from '../../middleware/validation';
import { addressSchema } from '../../validation/schemas/listing';
import * as listingService from '../../services/listingService';
import { BadRequestError } from '../../errors';

const router = express.Router();

/**
 * GET /v1/admin/addresses
 * Get all addresses (paginated)

 * @openapi
 * /v1/admin/addresses:
 *   get:
 *     tags:
 *       - Admin - Addresses
 *     summary: Get all addresses
 *     description: Retrieve all listing addresses in the system
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
 *                     $ref: '#/components/schemas/Address'
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
    const result = await listingService.getAllAddresses({ page, limit });
    res.json(result);
  })
);

/**
 * @openapi
 * /v1/admin/addresses/{id}:
 *   get:
 *     tags:
 *       - Admin - Addresses
 *     summary: Get address by ID
 *     description: Retrieve a single address by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Address ID
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Address'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Address not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @openapi
 * /v1/admin/addresses:
 *   post:
 *     tags:
 *       - Admin - Addresses
 *     summary: Create new address
 *     description: Add a new address to an existing listing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/Address'
 *               - type: object
 *                 required:
 *                   - listingId
 *                 properties:
 *                   listingId:
 *                     type: integer
 *                     description: ID of the listing this address belongs to
 *     responses:
 *       201:
 *         description: Address created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Address'
 *       400:
 *         description: Bad request - validation failed or listingId missing
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
 * @openapi
 * /v1/admin/addresses/{id}:
 *   put:
 *     tags:
 *       - Admin - Addresses
 *     summary: Update address
 *     description: Update an existing address's details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Address ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Address'
 *     responses:
 *       200:
 *         description: Address updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Address'
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
 *         description: Address not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @openapi
 * /v1/admin/addresses/{id}:
 *   delete:
 *     tags:
 *       - Admin - Addresses
 *     summary: Delete address
 *     description: Permanently delete an address from a listing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Address ID
 *     responses:
 *       204:
 *         description: Address deleted successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Address not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await listingService.deleteAddress(id);
    res.status(204).json({});
  })
);

export default router;

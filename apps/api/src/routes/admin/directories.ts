import express = require('express');
import { asyncHandler } from '../../middleware/asyncHandler';
import { validateBody } from '../../middleware/validation';
import { createDirectorySchema, updateDirectorySchema } from '../../validation/schemas/directory';
import * as directoryService from '../../services/directoryService';

const router = express.Router();

/**
 * GET /v1/admin/directories
 * Get all directories (paginated)

 * @openapi
 * /v1/admin/directories:
 *   get:
 *     tags:
 *       - Admin - Directories
 *     summary: Get all directories
 *     description: Retrieve all directories in the system with their category and location details
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
 *                     $ref: '#/components/schemas/Directory'
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
    const result = await directoryService.getAllDirectories({ page, limit });
    res.json(result);
  })
);

/**
 * @openapi
 * /v1/admin/directories/{id}:
 *   get:
 *     tags:
 *       - Admin - Directories
 *     summary: Get directory by ID
 *     description: Retrieve a single directory by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Directory ID
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Directory'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Directory not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const directory = await directoryService.getDirectoryById(id);
    res.json({ data: directory });
  })
);

/**
 * @openapi
 * /v1/admin/directories:
 *   post:
 *     tags:
 *       - Admin - Directories
 *     summary: Create new directory
 *     description: Create a new directory page for a category and location combination
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
 *               - subdomain
 *               - subdirectory
 *               - categoryId
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 example: NYC Professional Services Directory
 *               slug:
 *                 type: string
 *                 pattern: ^[a-z0-9-]+$
 *                 maxLength: 80
 *                 example: nyc-professional-services
 *               subdomain:
 *                 type: string
 *                 pattern: ^[a-z0-9-]+$
 *                 maxLength: 63
 *                 nullable: true
 *                 example: nyc-professional
 *               subdirectory:
 *                 type: string
 *                 pattern: ^[a-z0-9-/]+$
 *                 maxLength: 100
 *                 nullable: true
 *                 example: nyc/professional-services
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 nullable: true
 *               categoryId:
 *                 type: integer
 *                 example: 1
 *               cityId:
 *                 type: integer
 *                 example: 1
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED, ARCHIVED]
 *                 default: DRAFT
 *     responses:
 *       201:
 *         description: Directory created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Directory'
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
 *         description: Conflict - slug or subdomain already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/',
  validateBody(createDirectorySchema),
  asyncHandler(async (req, res) => {
    const directory = await directoryService.createDirectory(req.body);
    res.status(201).json({ data: directory });
  })
);

/**
 * @openapi
 * /v1/admin/directories/{id}:
 *   put:
 *     tags:
 *       - Admin - Directories
 *     summary: Update directory
 *     description: Update an existing directory's details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Directory ID
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
 *               subdomain:
 *                 type: string
 *                 pattern: ^[a-z0-9-]+$
 *                 maxLength: 63
 *                 nullable: true
 *               subdirectory:
 *                 type: string
 *                 pattern: ^[a-z0-9-/]+$
 *                 maxLength: 100
 *                 nullable: true
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 nullable: true
 *               categoryId:
 *                 type: integer
 *               cityId:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED, ARCHIVED]
 *     responses:
 *       200:
 *         description: Directory updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Directory'
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
 *         description: Directory not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Conflict - slug or subdomain already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  '/:id',
  validateBody(updateDirectorySchema),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const directory = await directoryService.updateDirectory(id, req.body);
    res.json({ data: directory });
  })
);

/**
 * @openapi
 * /v1/admin/directories/{id}:
 *   delete:
 *     tags:
 *       - Admin - Directories
 *     summary: Delete directory
 *     description: Permanently delete a directory
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Directory ID
 *     responses:
 *       204:
 *         description: Directory deleted successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Directory not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await directoryService.deleteDirectory(id);
    res.status(204).json({});
  })
);

export default router;

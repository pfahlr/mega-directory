/**
 * Public list routes
 * Handles user list CRUD, items, and exports
 */
import express = require('express');
import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth, optionalAuth } from '../../middleware/userAuth';
import {
  getUserLists,
  getListById,
  getListByUsernameAndSlug,
  createList,
  updateList,
  deleteList,
  addListItem,
  updateListItem,
  removeListItem,
  reorderListItems,
} from '../../services/listService';
import {
  generateCsv,
  formatAddress,
  formatCategories,
  type ListingExportData,
} from '../../utils/exporters/csvExporter';
import { generateKml, type KmlDocumentData, type KmlPlacemarkData } from '../../utils/exporters/kmlExporter';
import { generateGpx, type GpxDocumentData, type GpxWaypointData } from '../../utils/exporters/gpxExporter';

const router = express.Router();

/**
 * GET /v1/lists
 * Get all lists for current user
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const includeUnlisted = req.query.include_unlisted !== 'false';
    const lists = await getUserLists(req.user.id, includeUnlisted);

    res.json({ lists });
  })
);

/**
 * GET /v1/lists/:id
 * Get single list with all items
 */
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const listId = parseInt(req.params.id, 10);

    if (isNaN(listId)) {
      res.status(400).json({ error: 'Invalid list ID' });
      return;
    }

    const list = await getListById(listId, req.user?.id);

    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }

    res.json({ list });
  })
);

/**
 * GET /v1/lists/by-slug/:username/:slug
 * Get list by username and slug (for public URLs)
 */
router.get(
  '/by-slug/:username/:slug',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { username, slug } = req.params;

    const list = await getListByUsernameAndSlug(username, slug, req.user?.id);

    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }

    res.json({ list });
  })
);

/**
 * POST /v1/lists
 * Create new list
 */
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { title, description, url_slug, unlisted, location_agnostic } = req.body;

    if (!title || typeof title !== 'string') {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    try {
      const list = await createList({
        userId: req.user.id,
        title,
        description,
        urlSlug: url_slug,
        unlisted,
        locationAgnostic: location_agnostic,
      });

      res.status(201).json({ list });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  })
);

/**
 * PUT /v1/lists/:id
 * Update list metadata
 */
router.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const listId = parseInt(req.params.id, 10);

    if (isNaN(listId)) {
      res.status(400).json({ error: 'Invalid list ID' });
      return;
    }

    const { title, description, unlisted, location_agnostic } = req.body;

    try {
      const list = await updateList(listId, req.user.id, {
        title,
        description,
        unlisted,
        locationAgnostic: location_agnostic,
      });

      res.json({ list });
    } catch (error: any) {
      if (error.message === 'List not found') {
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
 * DELETE /v1/lists/:id
 * Delete list and all items
 */
router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const listId = parseInt(req.params.id, 10);

    if (isNaN(listId)) {
      res.status(400).json({ error: 'Invalid list ID' });
      return;
    }

    try {
      await deleteList(listId, req.user.id);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message === 'List not found') {
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
 * POST /v1/lists/:id/items
 * Add listing to list
 */
router.post(
  '/:id/items',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const listId = parseInt(req.params.id, 10);

    if (isNaN(listId)) {
      res.status(400).json({ error: 'Invalid list ID' });
      return;
    }

    const { listing_id, position, notes } = req.body;

    if (!listing_id || typeof listing_id !== 'number') {
      res.status(400).json({ error: 'listing_id is required and must be a number' });
      return;
    }

    try {
      const item = await addListItem({
        listId,
        listingId: listing_id,
        position,
        notes,
      });

      res.status(201).json({ item });
    } catch (error: any) {
      if (error.message.includes('full') || error.message.includes('already in')) {
        res.status(409).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: error.message });
    }
  })
);

/**
 * PUT /v1/lists/:id/items/:listing_id
 * Update item position or notes
 */
router.put(
  '/:id/items/:listing_id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const listId = parseInt(req.params.id, 10);
    const listingId = parseInt(req.params.listing_id, 10);

    if (isNaN(listId) || isNaN(listingId)) {
      res.status(400).json({ error: 'Invalid ID' });
      return;
    }

    const { position, notes } = req.body;

    try {
      const item = await updateListItem(listId, listingId, req.user.id, {
        position,
        notes,
      });

      res.json({ item });
    } catch (error: any) {
      if (error.message.includes('Not found')) {
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
 * DELETE /v1/lists/:id/items/:listing_id
 * Remove listing from list
 */
router.delete(
  '/:id/items/:listing_id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const listId = parseInt(req.params.id, 10);
    const listingId = parseInt(req.params.listing_id, 10);

    if (isNaN(listId) || isNaN(listingId)) {
      res.status(400).json({ error: 'Invalid ID' });
      return;
    }

    try {
      await removeListItem(listId, listingId, req.user.id);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message.includes('Not found')) {
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
 * POST /v1/lists/:id/reorder
 * Bulk reorder list items
 */
router.post(
  '/:id/reorder',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const listId = parseInt(req.params.id, 10);

    if (isNaN(listId)) {
      res.status(400).json({ error: 'Invalid list ID' });
      return;
    }

    const { item_ids } = req.body;

    if (!Array.isArray(item_ids)) {
      res.status(400).json({ error: 'item_ids must be an array' });
      return;
    }

    try {
      await reorderListItems(listId, req.user.id, item_ids);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message.includes('Not found')) {
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
 * GET /v1/lists/:id/export
 * Export list in specified format (CSV, KML, GPX)
 */
router.get(
  '/:id/export',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const listId = parseInt(req.params.id, 10);
    const format = req.query.format as string;

    if (isNaN(listId)) {
      res.status(400).json({ error: 'Invalid list ID' });
      return;
    }

    if (!format || !['csv', 'kml', 'gpx'].includes(format.toLowerCase())) {
      res.status(400).json({ error: 'Invalid format. Must be csv, kml, or gpx' });
      return;
    }

    // Get list with items
    const list = await getListById(listId, req.user?.id);

    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }

    // Get today's date for filename
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `${list.urlSlug}-${today}.${format}`;

    // Generate export based on format
    try {
      if (format.toLowerCase() === 'csv') {
        // Prepare CSV data
        const csvData: ListingExportData[] = list.items.map((item) => {
          const listing = item.listing;
          const primaryAddress = listing.addresses && listing.addresses[0];

          return {
            name: listing.title,
            description: listing.description,
            address: formatAddress(listing.addresses),
            latitude: primaryAddress?.latitude,
            longitude: primaryAddress?.longitude,
            website: listing.websiteUrl,
            phone: listing.contactPhone,
            categories: formatCategories(listing.categories),
            notes: item.notes,
          };
        });

        const csvContent = generateCsv(csvData);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
      } else if (format.toLowerCase() === 'kml') {
        // Prepare KML data
        const placemarks: KmlPlacemarkData[] = list.items
          .filter((item) => {
            const addr = item.listing.addresses && item.listing.addresses[0];
            return addr && addr.latitude != null && addr.longitude != null;
          })
          .map((item) => {
            const listing = item.listing;
            const primaryAddress = listing.addresses[0];

            return {
              name: listing.title,
              description: listing.description || item.notes || '',
              latitude: primaryAddress.latitude!,
              longitude: primaryAddress.longitude!,
              notes: item.notes,
            };
          });

        const kmlData: KmlDocumentData = {
          title: list.title,
          description: list.description,
          placemarks,
        };

        const kmlContent = generateKml(kmlData);

        res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(kmlContent);
      } else if (format.toLowerCase() === 'gpx') {
        // Prepare GPX data
        const waypoints: GpxWaypointData[] = list.items
          .filter((item) => {
            const addr = item.listing.addresses && item.listing.addresses[0];
            return addr && addr.latitude != null && addr.longitude != null;
          })
          .map((item) => {
            const listing = item.listing;
            const primaryAddress = listing.addresses[0];
            const primaryCategory = listing.categories && listing.categories[0];

            return {
              name: listing.title,
              description: listing.description,
              latitude: primaryAddress.latitude!,
              longitude: primaryAddress.longitude!,
              type: primaryCategory?.category?.name,
              notes: item.notes,
            };
          });

        const gpxData: GpxDocumentData = {
          title: list.title,
          description: list.description,
          creator: 'Mega Directory',
          waypoints,
        };

        const gpxContent = generateGpx(gpxData);

        res.setHeader('Content-Type', 'application/gpx+xml; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(gpxContent);
      }
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to generate export', message: error.message });
    }
  })
);

export default router;

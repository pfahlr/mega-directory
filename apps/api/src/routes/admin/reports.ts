/**
 * Admin report moderation routes
 * Handles report review and moderation
 */
import express = require('express');
import { Request, Response } from 'express';
import { ReportStatus, ReportReason } from '@prisma/client';
import { asyncHandler } from '../../middleware/asyncHandler';
import {
  getReports,
  getReportById,
  updateReport,
  deleteListingFromReport,
  getReportStats,
} from '../../services/reportService';

const router = express.Router();

/**
 * GET /v1/admin/reports
 * Get all reports with filters
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as ReportStatus | undefined;
    const reason = req.query.reason as ReportReason | undefined;
    const listingId = req.query.listing_id ? parseInt(req.query.listing_id as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;

    // Validate status
    if (status && !Object.values(ReportStatus).includes(status)) {
      res.status(400).json({
        error: 'Invalid status',
        valid_statuses: Object.values(ReportStatus),
      });
      return;
    }

    // Validate reason
    if (reason && !Object.values(ReportReason).includes(reason)) {
      res.status(400).json({
        error: 'Invalid reason',
        valid_reasons: Object.values(ReportReason),
      });
      return;
    }

    try {
      const result = await getReports(
        { status, reason, listingId },
        { page, limit }
      );

      res.json({
        reports: result.reports.map((report) => ({
          id: report.id,
          listing_id: report.listingId,
          reason: report.reason,
          details: report.details,
          status: report.status,
          admin_notes: report.adminNotes,
          created_at: report.createdAt,
          resolved_at: report.resolvedAt,
          user: report.user ? {
            id: report.user.id,
            username: report.user.username,
          } : null,
          resolver: report.resolver ? {
            id: report.resolver.id,
            username: report.resolver.username,
          } : null,
          listing: {
            id: report.listing.id,
            title: report.listing.title,
            status: report.listing.status,
          },
        })),
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  })
);

/**
 * GET /v1/admin/reports/stats
 * Get report statistics
 */
router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const stats = await getReportStats();

      res.json({
        stats: {
          by_status: stats.byStatus,
          by_reason: stats.byReason,
          recent_count: stats.recentCount,
        },
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  })
);

/**
 * GET /v1/admin/reports/:id
 * Get single report with details and similar reports
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const reportId = parseInt(req.params.id, 10);

    if (isNaN(reportId)) {
      res.status(400).json({ error: 'Invalid report ID' });
      return;
    }

    try {
      const report = await getReportById(reportId);

      if (!report) {
        res.status(404).json({ error: 'Report not found' });
        return;
      }

      res.json({
        report: {
          id: report.id,
          listing_id: report.listingId,
          reason: report.reason,
          details: report.details,
          status: report.status,
          admin_notes: report.adminNotes,
          created_at: report.createdAt,
          resolved_at: report.resolvedAt,
          ip_address: report.ipAddress,
          user: report.user ? {
            id: report.user.id,
            username: report.user.username,
            display_name: report.user.displayName,
          } : null,
          resolver: report.resolver ? {
            id: report.resolver.id,
            username: report.resolver.username,
            display_name: report.resolver.displayName,
          } : null,
          listing: {
            id: report.listing.id,
            title: report.listing.title,
            description: report.listing.description,
            status: report.listing.status,
          },
          similar_reports: report.similarReports.map((sr) => ({
            id: sr.id,
            reason: sr.reason,
            status: sr.status,
            created_at: sr.createdAt,
          })),
        },
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  })
);

/**
 * PUT /v1/admin/reports/:id
 * Update report status and admin notes
 */
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const reportId = parseInt(req.params.id, 10);

    if (isNaN(reportId)) {
      res.status(400).json({ error: 'Invalid report ID' });
      return;
    }

    // Get admin user ID from auth middleware
    // TODO: Replace with actual admin auth middleware
    const adminId = (req as any).user?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Admin authentication required' });
      return;
    }

    const { status, admin_notes } = req.body;

    // Validate status
    if (status && !Object.values(ReportStatus).includes(status)) {
      res.status(400).json({
        error: 'Invalid status',
        valid_statuses: Object.values(ReportStatus),
      });
      return;
    }

    try {
      const report = await updateReport(reportId, adminId, {
        status,
        adminNotes: admin_notes,
      });

      res.json({
        report: {
          id: report.id,
          listing_id: report.listingId,
          reason: report.reason,
          details: report.details,
          status: report.status,
          admin_notes: report.adminNotes,
          created_at: report.createdAt,
          resolved_at: report.resolvedAt,
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

/**
 * POST /v1/admin/reports/:id/delete-listing
 * Delete/reject listing from report
 */
router.post(
  '/:id/delete-listing',
  asyncHandler(async (req: Request, res: Response) => {
    const reportId = parseInt(req.params.id, 10);

    if (isNaN(reportId)) {
      res.status(400).json({ error: 'Invalid report ID' });
      return;
    }

    // Get admin user ID from auth middleware
    // TODO: Replace with actual admin auth middleware
    const adminId = (req as any).user?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Admin authentication required' });
      return;
    }

    try {
      const report = await deleteListingFromReport(reportId, adminId);

      if (!report) {
        res.status(404).json({ error: 'Report not found' });
        return;
      }

      res.json({
        success: true,
        report: {
          id: report.id,
          listing_id: report.listingId,
          status: report.status,
          listing_status: report.listing.status,
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

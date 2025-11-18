/**
 * Report routes
 * Handles report submissions
 */
import express = require('express');
import { Request, Response } from 'express';
import { ReportReason } from '@prisma/client';
import { asyncHandler } from '../../middleware/asyncHandler';
import { optionalAuth } from '../../middleware/userAuth';
import { requireValidCaptcha } from '../../utils/hcaptchaVerification';
import { createReport } from '../../services/reportService';

const router = express.Router();

/**
 * POST /v1/reports
 * Submit a report for a listing
 */
router.post(
  '/',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { listing_id, reason, details, h_captcha_response } = req.body;

    // Validate listing_id
    if (!listing_id || typeof listing_id !== 'number') {
      res.status(400).json({ error: 'listing_id is required and must be a number' });
      return;
    }

    // Validate reason
    if (!reason || typeof reason !== 'string') {
      res.status(400).json({ error: 'reason is required' });
      return;
    }

    const validReasons = Object.values(ReportReason);
    if (!validReasons.includes(reason as ReportReason)) {
      res.status(400).json({
        error: 'Invalid reason',
        valid_reasons: validReasons,
      });
      return;
    }

    // Verify CAPTCHA
    const ipAddress = (req.ip || req.socket.remoteAddress || '').replace('::ffff:', '');

    try {
      await requireValidCaptcha(h_captcha_response, ipAddress);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Get user ID (optional - can be anonymous)
    const userId = req.user?.id || null;

    try {
      const report = await createReport({
        userId,
        listingId: listing_id,
        reason: reason as ReportReason,
        details,
        ipAddress,
      });

      res.status(201).json({
        report: {
          id: report.id,
          listing_id: report.listingId,
          reason: report.reason,
          status: report.status,
          created_at: report.createdAt,
        },
      });
    } catch (error: any) {
      if (error.message.includes('already reported')) {
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

export default router;

/**
 * Public user authentication routes
 * Handles anonymous user creation, session management, and logout
 */
import express = require('express');
import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { requireAuth } from '../../middleware/userAuth';
import {
  createAnonymousUser,
  getUserById,
  deleteSession,
  upgradeUserWithEmail,
} from '../../services/userService';

const router = express.Router();

/**
 * POST /v1/auth/anonymous
 * Create an anonymous user account
 */
router.post(
  '/anonymous',
  asyncHandler(async (_req: Request, res: Response) => {
    // Create anonymous user
    const result = await createAnonymousUser();

    // Set auth cookie
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: result.expiresAt,
    });

    // Return user and token
    res.json({
      user: result.user,
      token: result.token,
      csrfToken: result.csrfToken,
    });
  })
);

/**
 * GET /v1/auth/session
 * Get current user session info
 */
router.get(
  '/session',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Get full user data
    const user = await getUserById(req.user.id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  })
);

/**
 * POST /v1/auth/upgrade
 * Upgrade anonymous account with email
 */
router.post(
  '/upgrade',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    // Upgrade user with email
    const result = await upgradeUserWithEmail(req.user.id, email);

    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }

    res.json({
      success: true,
      message: result.message,
    });
  })
);

/**
 * DELETE /v1/auth/session
 * Logout (destroy session)
 */
router.delete(
  '/session',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.tokenPayload) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Delete session
    await deleteSession(req.user.id, req.tokenPayload.jti);

    // Clear auth cookie
    res.clearCookie('auth_token');

    res.json({ success: true });
  })
);

export default router;

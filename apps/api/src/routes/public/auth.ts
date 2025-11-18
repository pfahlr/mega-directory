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
  createMagicLink,
  verifyMagicLink,
  loginWithPassword,
  setUserPassword,
  changeUserPassword,
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

/**
 * POST /v1/auth/magic-link
 * Request a magic link email for authentication
 */
router.post(
  '/magic-link',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, returnUrl } = req.body;

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

    // Get IP address for rate limiting
    const ipAddress = (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                      (req.headers?.['x-real-ip'] as string) ||
                      'unknown';

    // Create magic link (this handles user creation, code generation, and email sending)
    await createMagicLink(email, returnUrl, ipAddress);

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: `If this email exists, we sent a magic link to ${email}`,
    });
  })
);

/**
 * GET /v1/auth/magic-link/verify
 * Verify magic link code and create session
 */
router.get(
  '/magic-link/verify',
  asyncHandler(async (req: Request, res: Response) => {
    const { code, return_url } = req.query;

    if (!code || typeof code !== 'string' || code.length !== 12) {
      // Redirect to login with error
      res.redirect('/login?error=invalid_code');
      return;
    }

    try {
      // Verify magic link and create session
      const result = await verifyMagicLink(code);

      if (!result) {
        res.redirect('/login?error=invalid_code');
        return;
      }

      // Set auth cookie
      res.cookie('auth_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: result.expiresAt,
      });

      // Redirect to return URL or dashboard
      const redirectUrl = return_url && typeof return_url === 'string'
        ? return_url
        : '/dashboard';
      res.redirect(redirectUrl);
    } catch (error) {
      res.redirect('/login?error=invalid_code');
    }
  })
);

/**
 * POST /v1/auth/login
 * Login with email and password
 */
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    try {
      const result = await loginWithPassword(email, password);

      if (!result) {
        res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect',
        });
        return;
      }

      // Set auth cookie
      res.cookie('auth_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: result.expiresAt,
      });

      res.json({
        success: true,
        user: result.user,
        token: result.token,
      });
    } catch (error: any) {
      if (error.message === 'No password set, use magic link') {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  })
);

/**
 * POST /v1/auth/password
 * Set password for first time (requires authentication)
 */
router.post(
  '/password',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { password, confirm_password } = req.body;

    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    if (password !== confirm_password) {
      res.status(400).json({ error: 'Passwords do not match' });
      return;
    }

    await setUserPassword(req.user.id, password);

    res.json({
      success: true,
      message: 'Password set successfully',
    });
  })
);

/**
 * PUT /v1/auth/password
 * Change existing password (requires authentication)
 */
router.put(
  '/password',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { current_password, new_password, confirm_new_password } = req.body;

    if (!current_password || typeof current_password !== 'string') {
      res.status(400).json({ error: 'Current password is required' });
      return;
    }

    if (!new_password || typeof new_password !== 'string') {
      res.status(400).json({ error: 'New password is required' });
      return;
    }

    if (new_password.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters' });
      return;
    }

    if (new_password !== confirm_new_password) {
      res.status(400).json({ error: 'New passwords do not match' });
      return;
    }

    try {
      await changeUserPassword(req.user.id, current_password, new_password);

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error: any) {
      if (error.message === 'Invalid current password') {
        res.status(401).json({ error: error.message });
        return;
      }
      if (error.message === 'No password set') {
        res.status(400).json({ error: 'No password is currently set. Use POST /password instead.' });
        return;
      }
      throw error;
    }
  })
);

/**
 * POST /v1/auth/password/reset
 * Request password reset (sends magic link)
 */
router.post(
  '/password/reset',
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Get IP address
    const ipAddress = (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                      (req.headers?.['x-real-ip'] as string) ||
                      'unknown';

    // Create magic link (same as login magic link)
    await createMagicLink(email, '/settings/security', ipAddress);

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: `If this email exists, we sent a reset link to ${email}`,
    });
  })
);

export default router;

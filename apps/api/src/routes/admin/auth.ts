import * as express from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { generateAdminToken, type AuthConfig } from '../../middleware/auth';
import { BadRequestError, UnauthorizedError, InternalServerError } from '../../errors';

const router = express.Router();

const DEFAULT_ADMIN_TOKEN_TTL_SECONDS = 60 * 15;

/**
 * POST /v1/admin/auth
 * Authenticate admin user
 */
export function createAuthRouter(config: AuthConfig) {
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const { email, passcode } = req.body;

      if (!email || typeof email !== 'string') {
        throw new BadRequestError('email is required');
      }

      if (!passcode || typeof passcode !== 'string') {
        throw new BadRequestError('passcode is required');
      }

      const expectedEmail = process.env.ADMIN_LOGIN_EMAIL?.toLowerCase();
      const expectedPasscode = process.env.ADMIN_LOGIN_PASSCODE;

      if (!expectedEmail || !expectedPasscode) {
        throw new InternalServerError('Admin authentication is not configured');
      }

      const normalizedEmail = email.toLowerCase().trim();

      if (normalizedEmail !== expectedEmail || passcode !== expectedPasscode) {
        throw new UnauthorizedError('Invalid admin credentials');
      }

      const expiresIn =
        typeof config.adminTokenTtlSeconds === 'number' && config.adminTokenTtlSeconds > 0
          ? config.adminTokenTtlSeconds
          : DEFAULT_ADMIN_TOKEN_TTL_SECONDS;

      const token = generateAdminToken(normalizedEmail, config, expiresIn);

      res.json({
        token,
        tokenType: 'Bearer',
        expiresIn,
      });
    })
  );

  return router;
}

/**
 * GET /v1/admin/ping
 * Ping endpoint to verify admin authentication
 */
router.get(
  '/ping',
  asyncHandler(async (req, res) => {
    res.json({ status: 'admin-ok' });
  })
);

export default router;

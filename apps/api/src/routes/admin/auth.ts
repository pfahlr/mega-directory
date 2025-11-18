import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { generateAdminToken, type AuthConfig } from '../../middleware/auth';
import { BadRequestError, UnauthorizedError, InternalServerError } from '../../errors';
import { authRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

const DEFAULT_ADMIN_TOKEN_TTL_SECONDS = 60 * 15;

/**
 * @openapi
 * /v1/admin/auth:
 *   post:
 *     tags:
 *       - Admin - Auth
 *     summary: Authenticate admin user
 *     description: Authenticate admin user with email and passcode to receive a JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - passcode
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Admin email address
 *                 example: admin@example.com
 *               passcode:
 *                 type: string
 *                 description: Admin passcode
 *                 example: your-secure-passcode
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token for authentication
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 tokenType:
 *                   type: string
 *                   example: Bearer
 *                 expiresIn:
 *                   type: integer
 *                   description: Token expiration time in seconds
 *                   example: 900
 *       400:
 *         description: Bad request - email or passcode missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error - authentication not configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export function createAuthRouter(config: AuthConfig) {
  router.post(
    '/',
    authRateLimiter,
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
 * @openapi
 * /v1/admin/auth/ping:
 *   get:
 *     tags:
 *       - Admin - Auth
 *     summary: Verify admin authentication
 *     description: Ping endpoint to verify that admin authentication is working
 *     security:
 *       - bearerAuth: []
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
 *                   example: admin-ok
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/ping',
  asyncHandler(async (_req, res) => {
    res.json({ status: 'admin-ok' });
  })
);

export default router;

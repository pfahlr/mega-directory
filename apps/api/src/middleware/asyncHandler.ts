import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrapper function that catches async errors and passes them to Express error handler
 *
 * This eliminates the need for try-catch blocks in every async route handler.
 * Any errors thrown or promises rejected inside the handler will be automatically
 * caught and forwarded to the error handling middleware.
 *
 * @example
 * // Before:
 * app.get('/users/:id', async (req, res) => {
 *   try {
 *     const user = await User.findById(req.params.id);
 *     if (!user) return res.status(404).json({ error: 'Not found' });
 *     res.json(user);
 *   } catch (error) {
 *     res.status(500).json({ error: 'Internal error' });
 *   }
 * });
 *
 * // After:
 * app.get('/users/:id', asyncHandler(async (req, res) => {
 *   const user = await User.findById(req.params.id);
 *   if (!user) throw new NotFoundError('User', req.params.id);
 *   res.json(user);
 * }));
 */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

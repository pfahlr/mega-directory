import request from 'supertest';
import jwt from 'jsonwebtoken';

export const TEST_ADMIN_TOKEN = jwt.sign(
  { isAdmin: true, userId: 1 },
  process.env.ADMIN_SECRET || 'test-admin-secret',
  { expiresIn: '1h' }
);

export function createAuthenticatedRequest(app: Express.Application) {
  return {
    get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${TEST_ADMIN_TOKEN}`),
    post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${TEST_ADMIN_TOKEN}`),
    put: (url: string) => request(app).put(url).set('Authorization', `Bearer ${TEST_ADMIN_TOKEN}`),
    delete: (url: string) => request(app).delete(url).set('Authorization', `Bearer ${TEST_ADMIN_TOKEN}`)
  };
}

export function createUnauthenticatedRequest(app: Express.Application) {
  return request(app);
}

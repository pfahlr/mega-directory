import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../src/middleware/asyncHandler';

describe('asyncHandler', () => {
  it('should call the wrapped function', async () => {
    const mockFn = vi.fn(async (req, res) => {
      res.json({ success: true });
    });

    const mockReq = {} as Request;
    const mockRes = {
      json: vi.fn()
    } as unknown as Response;
    const mockNext = vi.fn() as NextFunction;

    const handler = asyncHandler(mockFn);
    await handler(mockReq, mockRes, mockNext);

    expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true });
  });

  it('should catch synchronous errors and pass to next', async () => {
    const error = new Error('Test error');
    const mockFn = vi.fn(() => {
      throw error;
    });

    const mockReq = {} as Request;
    const mockRes = {} as Response;
    const mockNext = vi.fn() as NextFunction;

    const handler = asyncHandler(mockFn);
    await handler(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it('should catch async errors and pass to next', async () => {
    const error = new Error('Async error');
    const mockFn = vi.fn(async () => {
      throw error;
    });

    const mockReq = {} as Request;
    const mockRes = {} as Response;
    const mockNext = vi.fn() as NextFunction;

    const handler = asyncHandler(mockFn);
    await handler(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it('should catch rejected promises and pass to next', async () => {
    const error = new Error('Rejected promise');
    const mockFn = vi.fn(async () => {
      return Promise.reject(error);
    });

    const mockReq = {} as Request;
    const mockRes = {} as Response;
    const mockNext = vi.fn() as NextFunction;

    const handler = asyncHandler(mockFn);
    await handler(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it('should not call next if no error occurs', async () => {
    const mockFn = vi.fn(async (req, res) => {
      res.json({ success: true });
    });

    const mockReq = {} as Request;
    const mockRes = {
      json: vi.fn()
    } as unknown as Response;
    const mockNext = vi.fn() as NextFunction;

    const handler = asyncHandler(mockFn);
    await handler(mockReq, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should preserve request, response, and next parameters', async () => {
    const mockFn = vi.fn(async (req, res, next) => {
      expect(req).toBeDefined();
      expect(res).toBeDefined();
      expect(next).toBeDefined();
    });

    const mockReq = { params: { id: '123' } } as unknown as Request;
    const mockRes = {} as Response;
    const mockNext = vi.fn() as NextFunction;

    const handler = asyncHandler(mockFn);
    await handler(mockReq, mockRes, mockNext);

    expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
  });
});

# Error Handling Guide

This document explains how error handling works in the Mega Directory API and how to use it effectively.

## Overview

The API uses a centralized error handling system that provides:
- **Consistent error responses** across all endpoints
- **Type-safe error classes** for different error scenarios
- **Automatic error catching** with `asyncHandler`
- **Prisma error mapping** to appropriate HTTP status codes
- **Production-safe error messages** (no stack traces leaked)

## Architecture

### Components

1. **Custom Error Classes** (`src/errors/AppError.ts`)
   - Base `AppError` class for operational errors
   - Specific error classes for different scenarios

2. **Async Handler** (`src/middleware/asyncHandler.ts`)
   - Wrapper that catches async errors
   - Eliminates need for try-catch blocks

3. **Error Handler Middleware** (`src/middleware/errorHandler.ts`)
   - Centralized error processing
   - Maps errors to HTTP responses
   - Handles Prisma and Zod errors

## Error Classes

### AppError (Base Class)

Base class for all operational errors:

```typescript
class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;
}
```

### NotFoundError (404)

Used when a resource doesn't exist:

```typescript
// With ID
throw new NotFoundError('Listing', 123);
// Response: "Listing with id 123 not found"

// Without ID
throw new NotFoundError('Category');
// Response: "Category not found"
```

### BadRequestError (400)

Used for invalid client requests:

```typescript
throw new BadRequestError('Invalid slug format');

// With custom code
throw new BadRequestError('Invalid input', 'INVALID_SLUG');
```

### UnauthorizedError (401)

Used when authentication is missing or invalid:

```typescript
// Default message
throw new UnauthorizedError();
// Response: "Authentication required"

// Custom message
throw new UnauthorizedError('Invalid token');

// With custom code
throw new UnauthorizedError('Token expired', 'TOKEN_EXPIRED');
```

### ForbiddenError (403)

Used when user lacks permissions:

```typescript
throw new ForbiddenError();
// Response: "Access denied"

throw new ForbiddenError('Admin access required');
```

### ConflictError (409)

Used for duplicate resources:

```typescript
throw new ConflictError('Email already exists', 'email');

// Response includes field name for client-side highlighting
```

### ValidationError (422)

Used for validation failures (usually handled by validation middleware):

```typescript
throw new ValidationError('Validation failed', [
  { field: 'email', message: 'Invalid email format' },
  { field: 'age', message: 'Must be at least 18' }
]);
```

### InternalServerError (500)

Used for unexpected server errors:

```typescript
throw new InternalServerError('Database connection failed');

// Note: isOperational = false (programming error)
```

## Using Error Handling in Routes

### Before (with try-catch)

```typescript
app.get('/listings/:id', async (req, res) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json({ data: listing });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### After (with asyncHandler)

```typescript
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError } from '../errors';

app.get('/listings/:id', asyncHandler(async (req, res) => {
  const listing = await prisma.listing.findUnique({
    where: { id: parseInt(req.params.id) }
  });

  if (!listing) {
    throw new NotFoundError('Listing', req.params.id);
  }

  res.json({ data: listing });
}));
```

## Automatic Error Handling

### Prisma Errors

Prisma errors are automatically mapped to appropriate HTTP status codes:

| Prisma Code | HTTP Status | Description |
|-------------|-------------|-------------|
| P2002 | 409 Conflict | Unique constraint violation |
| P2025 | 404 Not Found | Record not found |
| P2003 | 400 Bad Request | Foreign key constraint failed |
| P2014 | 409 Conflict | Dependent records exist |
| P2012 | 400 Bad Request | Required field missing |
| P2000 | 400 Bad Request | Value too long |
| P2006 | 400 Bad Request | Invalid value type |

Example:

```typescript
// Trying to create duplicate slug
await prisma.listing.create({
  data: { slug: 'existing-slug', ... }
});

// Automatically returns:
// 409 Conflict
// {
//   "error": "Unique constraint violation",
//   "message": "A record with this slug already exists",
//   "code": "DUPLICATE",
//   "field": "slug"
// }
```

### Validation Errors

Zod validation errors (from validation middleware) are automatically formatted:

```typescript
// Invalid request body
POST /listings
{
  "title": "",  // Too short
  "slug": "Invalid Slug!"  // Invalid format
}

// Automatically returns:
// 400 Bad Request
// {
//   "error": "Validation failed",
//   "details": [
//     { "field": "title", "message": "Title is required" },
//     { "field": "slug", "message": "Slug must be lowercase alphanumeric with hyphens" }
//   ]
// }
```

## Error Response Format

All errors follow a consistent JSON format:

### Minimal Error
```json
{
  "error": "Listing with id 123 not found",
  "code": "NOT_FOUND"
}
```

### Error with Field
```json
{
  "error": "Unique constraint violation",
  "message": "A record with this email already exists",
  "code": "DUPLICATE",
  "field": "email"
}
```

### Validation Error
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "invalid_string"
    }
  ]
}
```

### Development Mode Error
```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "stack": "Error: Something went wrong\n    at ...",
  "details": { ... }
}
```

## Best Practices

### 1. Use Specific Error Classes

```typescript
// ✅ Good
throw new NotFoundError('Listing', listingId);

// ❌ Bad
throw new AppError(404, 'Not found');
```

### 2. Wrap All Async Handlers

```typescript
// ✅ Good
app.get('/listings', asyncHandler(async (req, res) => {
  // ...
}));

// ❌ Bad
app.get('/listings', async (req, res) => {
  try {
    // ...
  } catch (error) {
    // Manual error handling
  }
});
```

### 3. Let Middleware Handle Responses

```typescript
// ✅ Good
if (!listing) {
  throw new NotFoundError('Listing', id);
}

// ❌ Bad
if (!listing) {
  return res.status(404).json({ error: 'Not found' });
}
```

### 4. Use Appropriate Error Types

- **404**: Resource doesn't exist → `NotFoundError`
- **400**: Invalid input → `BadRequestError`
- **401**: Not authenticated → `UnauthorizedError`
- **403**: Not authorized → `ForbiddenError`
- **409**: Duplicate/conflict → `ConflictError`
- **422**: Validation failed → `ValidationError`
- **500**: Server error → `InternalServerError`

### 5. Provide Context

```typescript
// ✅ Good
throw new NotFoundError('Listing', listingId);
throw new ConflictError('Email already in use', 'email');

// ❌ Bad
throw new NotFoundError('Resource');
throw new ConflictError('Conflict');
```

## Setup in server.ts

The error handler must be registered as the **last middleware**:

```typescript
import { errorHandler } from './middleware/errorHandler';

// ... all routes ...

// Error handler MUST be last
app.use(errorHandler);
```

## Testing Error Handling

```typescript
import { describe, it, expect } from 'vitest';
import { NotFoundError } from '../src/errors';

describe('Error handling', () => {
  it('should throw NotFoundError', () => {
    expect(() => {
      throw new NotFoundError('User', 123);
    }).toThrow(NotFoundError);
  });

  it('should have correct status code', () => {
    const error = new NotFoundError('User', 123);
    expect(error.statusCode).toBe(404);
  });
});
```

## Common Patterns

### Check and Throw
```typescript
const listing = await prisma.listing.findUnique({ where: { id } });
if (!listing) {
  throw new NotFoundError('Listing', id);
}
```

### Validate and Throw
```typescript
if (!isValidEmail(email)) {
  throw new BadRequestError('Invalid email format', 'INVALID_EMAIL');
}
```

### Check Permission
```typescript
if (listing.userId !== req.user.id) {
  throw new ForbiddenError('You can only edit your own listings');
}
```

### Handle Conflicts
```typescript
const existing = await prisma.listing.findUnique({ where: { slug } });
if (existing) {
  throw new ConflictError('A listing with this slug already exists', 'slug');
}
```

## Troubleshooting

### Stack traces in production

If stack traces are appearing in production responses:
- Check `NODE_ENV` is set to `'production'`
- Error handler checks this to hide sensitive information

### Errors not being caught

- Ensure `asyncHandler` wraps all async route handlers
- Verify error handler is registered as last middleware
- Check error is being thrown (not returned)

### Custom errors not formatted correctly

- Ensure error extends `AppError`
- Call `Object.setPrototypeOf` in constructor
- Use proper `instanceof` checks

## References

- [Express Error Handling](https://expressjs.com/en/guide/error-handling.html)
- [Prisma Error Reference](https://www.prisma.io/docs/reference/api-reference/error-reference)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)

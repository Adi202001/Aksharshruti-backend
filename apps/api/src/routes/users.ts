import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { rateLimits } from '../middleware/rate-limit';
import type { Env } from '../index';

export const userRoutes = new Hono<{ Bindings: Env }>();

// GET /v1/users/me - Get current user profile
userRoutes.get('/me', requireAuth, rateLimits.read.standard, async (c) => {
  const userId = c.get('userId');

  return c.json({
    success: true,
    data: {
      message: 'Get current user endpoint - To be implemented',
      userId,
    },
  });
});

// PATCH /v1/users/me - Update current user profile
userRoutes.patch('/me', requireAuth, rateLimits.write.update, async (c) => {
  const userId = c.get('userId');

  return c.json({
    success: true,
    data: {
      message: 'Update user profile endpoint - To be implemented',
      userId,
    },
  });
});

// DELETE /v1/users/me - Delete current user account
userRoutes.delete('/me', requireAuth, async (c) => {
  const userId = c.get('userId');

  return c.json({
    success: true,
    data: {
      message: 'Delete user account endpoint - To be implemented',
      userId,
    },
  });
});

// GET /v1/users/:userId - Get user by ID
userRoutes.get('/:userId', rateLimits.read.standard, async (c) => {
  const userId = c.req.param('userId');

  return c.json({
    success: true,
    data: {
      message: 'Get user by ID endpoint - To be implemented',
      userId,
    },
  });
});

// GET /v1/users/:userId/stats - Get user stats
userRoutes.get('/:userId/stats', rateLimits.read.standard, async (c) => {
  const userId = c.req.param('userId');

  return c.json({
    success: true,
    data: {
      message: 'Get user stats endpoint - To be implemented',
      userId,
    },
  });
});

// GET /v1/users/username/:username - Get user by username
userRoutes.get('/username/:username', rateLimits.read.standard, async (c) => {
  const username = c.req.param('username');

  return c.json({
    success: true,
    data: {
      message: 'Get user by username endpoint - To be implemented',
      username,
    },
  });
});

// POST /v1/users/me/avatar - Upload avatar
userRoutes.post('/me/avatar', requireAuth, rateLimits.media.upload, async (c) => {
  const userId = c.get('userId');

  return c.json({
    success: true,
    data: {
      message: 'Upload avatar endpoint - To be implemented',
      userId,
    },
  });
});

// DELETE /v1/users/me/avatar - Delete avatar
userRoutes.delete('/me/avatar', requireAuth, async (c) => {
  const userId = c.get('userId');

  return c.json({
    success: true,
    data: {
      message: 'Delete avatar endpoint - To be implemented',
      userId,
    },
  });
});

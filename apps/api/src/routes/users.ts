import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { updateProfileSchema, updatePreferencesSchema, updateSettingsSchema } from '@aksharshruti/validation';
import { requireAuth } from '../middleware/auth';
import { rateLimits } from '../middleware/rate-limit';
import { getDb } from '../services/db.service';
import { UserService } from '../services/user.service';
import type { Env } from '../index';

export const userRoutes = new Hono<{ Bindings: Env }>();

// GET /v1/users/me - Get current user profile
userRoutes.get('/me', requireAuth, rateLimits.read.standard, async (c) => {
  try {
    const userId = c.get('userId');
    const db = getDb(c.env);
    const userService = new UserService(db);

    const user = await userService.getUserWithStats(userId);

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      }, 404);
    }

    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          penName: user.penName,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          location: user.location,
          website: user.website,
          isVerified: user.isVerified,
          joinedDate: user.joinedDate,
          lastActive: user.lastActive,
        },
        stats: user.stats,
        preferences: user.preferences,
        settings: user.settings,
      },
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    return c.json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch user profile',
      },
    }, 500);
  }
});

// PATCH /v1/users/me - Update current user profile
userRoutes.patch(
  '/me',
  requireAuth,
  rateLimits.write.update,
  zValidator('json', updateProfileSchema),
  async (c) => {
    try {
      const userId = c.get('userId');
      const input = c.req.valid('json');
      const db = getDb(c.env);
      const userService = new UserService(db);

      const updatedUser = await userService.updateUser(userId, input);

      return c.json({
        success: true,
        data: {
          user: updatedUser,
        },
      });
    } catch (error) {
      console.error('Update user profile error:', error);
      return c.json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update user profile',
        },
      }, 500);
    }
  }
);

// DELETE /v1/users/me - Delete current user account
userRoutes.delete('/me', requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const db = getDb(c.env);
    const userService = new UserService(db);

    await userService.deleteUser(userId);

    return c.json({
      success: true,
      data: {
        message: 'Account deleted successfully',
      },
    });
  } catch (error) {
    console.error('Delete user account error:', error);
    return c.json({
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: 'Failed to delete account',
      },
    }, 500);
  }
});

// GET /v1/users/:userId - Get user by ID
userRoutes.get('/:userId', rateLimits.read.standard, async (c) => {
  try {
    const userId = c.req.param('userId');
    const db = getDb(c.env);
    const userService = new UserService(db);

    const user = await userService.getUserById(userId);

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      }, 404);
    }

    // Don't return private information for other users
    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          penName: user.penName,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          location: user.location,
          website: user.website,
          isVerified: user.isVerified,
          joinedDate: user.joinedDate,
        },
      },
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    return c.json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch user',
      },
    }, 500);
  }
});

// GET /v1/users/:userId/stats - Get user stats
userRoutes.get('/:userId/stats', rateLimits.read.standard, async (c) => {
  try {
    const userId = c.req.param('userId');
    const db = getDb(c.env);
    const userService = new UserService(db);

    const stats = await userService.getUserStats(userId);

    if (!stats) {
      return c.json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      }, 404);
    }

    return c.json({
      success: true,
      data: {
        stats,
      },
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    return c.json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch user stats',
      },
    }, 500);
  }
});

// GET /v1/users/username/:username - Get user by username
userRoutes.get('/username/:username', rateLimits.read.standard, async (c) => {
  try {
    const username = c.req.param('username');
    const db = getDb(c.env);
    const userService = new UserService(db);

    const user = await userService.getUserByUsername(username);

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      }, 404);
    }

    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          penName: user.penName,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          location: user.location,
          website: user.website,
          isVerified: user.isVerified,
          joinedDate: user.joinedDate,
        },
      },
    });
  } catch (error) {
    console.error('Get user by username error:', error);
    return c.json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch user',
      },
    }, 500);
  }
});

// GET /v1/users/me/preferences - Get user preferences
userRoutes.get('/me/preferences', requireAuth, rateLimits.read.standard, async (c) => {
  try {
    const userId = c.get('userId');
    const db = getDb(c.env);
    const userService = new UserService(db);

    const preferences = await userService.getUserPreferences(userId);

    return c.json({
      success: true,
      data: {
        preferences,
      },
    });
  } catch (error) {
    console.error('Get user preferences error:', error);
    return c.json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch preferences',
      },
    }, 500);
  }
});

// PATCH /v1/users/me/preferences - Update user preferences
userRoutes.patch(
  '/me/preferences',
  requireAuth,
  rateLimits.write.update,
  zValidator('json', updatePreferencesSchema),
  async (c) => {
    try {
      const userId = c.get('userId');
      const input = c.req.valid('json');
      const db = getDb(c.env);
      const userService = new UserService(db);

      const updated = await userService.updateUserPreferences(userId, input);

      return c.json({
        success: true,
        data: {
          preferences: updated,
        },
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      return c.json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update preferences',
        },
      }, 500);
    }
  }
);

// GET /v1/users/me/settings - Get user settings
userRoutes.get('/me/settings', requireAuth, rateLimits.read.standard, async (c) => {
  try {
    const userId = c.get('userId');
    const db = getDb(c.env);
    const userService = new UserService(db);

    const settings = await userService.getUserSettings(userId);

    return c.json({
      success: true,
      data: {
        settings,
      },
    });
  } catch (error) {
    console.error('Get user settings error:', error);
    return c.json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch settings',
      },
    }, 500);
  }
});

// PATCH /v1/users/me/settings - Update user settings
userRoutes.patch(
  '/me/settings',
  requireAuth,
  rateLimits.write.update,
  zValidator('json', updateSettingsSchema),
  async (c) => {
    try {
      const userId = c.get('userId');
      const input = c.req.valid('json');
      const db = getDb(c.env);
      const userService = new UserService(db);

      const updated = await userService.updateUserSettings(userId, input);

      return c.json({
        success: true,
        data: {
          settings: updated,
        },
      });
    } catch (error) {
      console.error('Update settings error:', error);
      return c.json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update settings',
        },
      }, 500);
    }
  }
);

// POST /v1/users/me/avatar - Upload avatar
userRoutes.post('/me/avatar', requireAuth, rateLimits.media.upload, async (c) => {
  try {
    const userId = c.get('userId');

    // TODO: Implement S3 presigned URL generation
    // For now, return placeholder

    return c.json({
      success: true,
      data: {
        message: 'Avatar upload endpoint - S3 integration pending',
        uploadUrl: null,
      },
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    return c.json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: 'Failed to upload avatar',
      },
    }, 500);
  }
});

// DELETE /v1/users/me/avatar - Delete avatar
userRoutes.delete('/me/avatar', requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const db = getDb(c.env);
    const userService = new UserService(db);

    await userService.updateUser(userId, { avatarUrl: null });

    return c.json({
      success: true,
      data: {
        message: 'Avatar deleted successfully',
      },
    });
  } catch (error) {
    console.error('Delete avatar error:', error);
    return c.json({
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: 'Failed to delete avatar',
      },
    }, 500);
  }
});

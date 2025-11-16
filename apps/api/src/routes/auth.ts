import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@aksharshruti/validation';
import { rateLimits } from '../middleware/rate-limit';
import { requireAuth } from '../middleware/auth';
import { getDb } from '../services/db.service';
import { UserService } from '../services/user.service';
import { TokenService } from '../services/token.service';
import { generateTokenPair, verifyToken } from '../utils/jwt';
import type { Env } from '../index';

export const authRoutes = new Hono<{ Bindings: Env }>();

// POST /v1/auth/register
authRoutes.post(
  '/register',
  rateLimits.auth.register,
  zValidator('json', registerSchema),
  async (c) => {
    try {
      const input = c.req.valid('json');
      const db = getDb(c.env);
      const userService = new UserService(db);
      const tokenService = new TokenService(db);

      // Create user
      const user = await userService.createUser(input);

      // Generate tokens
      const tokens = await generateTokenPair(
        user.id,
        user.email,
        'user',
        c.env.JWT_SECRET
      );

      // Save refresh token to database
      const refreshTokenData = await verifyToken(tokens.refreshToken, c.env.JWT_SECRET);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await tokenService.saveRefreshToken(
        user.id,
        refreshTokenData.tokenId!,
        tokens.refreshToken,
        expiresAt
      );

      return c.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            isVerified: user.isVerified,
          },
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            tokenType: 'Bearer',
          },
        },
      }, 201);
    } catch (error) {
      console.error('Registration error:', error);

      if (error instanceof Error) {
        if (error.message === 'EMAIL_ALREADY_EXISTS') {
          return c.json({
            success: false,
            error: {
              code: 'EMAIL_ALREADY_EXISTS',
              message: 'An account with this email already exists',
            },
          }, 409);
        }

        if (error.message === 'USERNAME_ALREADY_EXISTS') {
          return c.json({
            success: false,
            error: {
              code: 'USERNAME_ALREADY_EXISTS',
              message: 'This username is already taken',
            },
          }, 409);
        }
      }

      return c.json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Failed to create account. Please try again.',
        },
      }, 500);
    }
  }
);

// POST /v1/auth/login
authRoutes.post(
  '/login',
  rateLimits.auth.login,
  zValidator('json', loginSchema),
  async (c) => {
    try {
      const { email, password } = c.req.valid('json');
      const db = getDb(c.env);
      const userService = new UserService(db);
      const tokenService = new TokenService(db);

      // Verify credentials
      const user = await userService.verifyPassword(email, password);

      if (!user) {
        return c.json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        }, 401);
      }

      // Check if account is active
      if (user.accountStatus !== 'active') {
        return c.json({
          success: false,
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'Your account has been suspended or deleted',
          },
        }, 403);
      }

      // Generate tokens
      const tokens = await generateTokenPair(
        user.id,
        user.email,
        'user',
        c.env.JWT_SECRET
      );

      // Save refresh token
      const refreshTokenData = await verifyToken(tokens.refreshToken, c.env.JWT_SECRET);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await tokenService.saveRefreshToken(
        user.id,
        refreshTokenData.tokenId!,
        tokens.refreshToken,
        expiresAt
      );

      // Update last active
      await userService.updateLastActive(user.id);

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
            isVerified: user.isVerified,
          },
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            tokenType: 'Bearer',
          },
        },
      });
    } catch (error) {
      console.error('Login error:', error);

      return c.json({
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: 'Login failed. Please try again.',
        },
      }, 500);
    }
  }
);

// POST /v1/auth/logout
authRoutes.post('/logout', requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7); // Remove 'Bearer '

    if (token) {
      // Verify and get token ID
      const payload = await verifyToken(token, c.env.JWT_SECRET);

      if (payload.tokenId) {
        const db = getDb(c.env);
        const tokenService = new TokenService(db);
        await tokenService.revokeRefreshToken(payload.tokenId);
      }
    }

    return c.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  } catch (error) {
    console.error('Logout error:', error);

    return c.json({
      success: false,
      error: {
        code: 'LOGOUT_FAILED',
        message: 'Logout failed. Please try again.',
      },
    }, 500);
  }
});

// POST /v1/auth/refresh-token
authRoutes.post(
  '/refresh-token',
  rateLimits.auth.refreshToken,
  zValidator('json', refreshTokenSchema),
  async (c) => {
    try {
      const { refreshToken } = c.req.valid('json');

      // Verify refresh token
      const payload = await verifyToken(refreshToken, c.env.JWT_SECRET);

      if (payload.type !== 'refresh' || !payload.tokenId) {
        return c.json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid refresh token',
          },
        }, 401);
      }

      // Check if token is valid in database
      const db = getDb(c.env);
      const tokenService = new TokenService(db);

      const isValid = await tokenService.verifyRefreshToken(
        payload.tokenId,
        refreshToken
      );

      if (!isValid) {
        return c.json({
          success: false,
          error: {
            code: 'TOKEN_REVOKED',
            message: 'Refresh token has been revoked or expired',
          },
        }, 401);
      }

      // Revoke old refresh token
      await tokenService.revokeRefreshToken(payload.tokenId);

      // Generate new token pair
      const tokens = await generateTokenPair(
        payload.userId,
        payload.email,
        payload.role,
        c.env.JWT_SECRET
      );

      // Save new refresh token
      const newRefreshTokenData = await verifyToken(tokens.refreshToken, c.env.JWT_SECRET);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await tokenService.saveRefreshToken(
        payload.userId,
        newRefreshTokenData.tokenId!,
        tokens.refreshToken,
        expiresAt
      );

      return c.json({
        success: true,
        data: {
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            tokenType: 'Bearer',
          },
        },
      });
    } catch (error) {
      console.error('Token refresh error:', error);

      return c.json({
        success: false,
        error: {
          code: 'REFRESH_FAILED',
          message: 'Failed to refresh token. Please login again.',
        },
      }, 401);
    }
  }
);

// POST /v1/auth/forgot-password
authRoutes.post(
  '/forgot-password',
  rateLimits.auth.forgotPassword,
  zValidator('json', forgotPasswordSchema),
  async (c) => {
    try {
      const { email } = c.req.valid('json');

      // TODO: Implement password reset email
      // For now, return success to prevent email enumeration

      return c.json({
        success: true,
        data: {
          message: 'If an account exists with this email, you will receive password reset instructions.',
        },
      });
    } catch (error) {
      console.error('Forgot password error:', error);

      return c.json({
        success: false,
        error: {
          code: 'REQUEST_FAILED',
          message: 'Failed to process request. Please try again.',
        },
      }, 500);
    }
  }
);

// POST /v1/auth/reset-password
authRoutes.post(
  '/reset-password',
  zValidator('json', resetPasswordSchema),
  async (c) => {
    try {
      const { token, password } = c.req.valid('json');

      // TODO: Implement password reset logic
      // Verify reset token, update password

      return c.json({
        success: true,
        data: {
          message: 'Password reset successfully',
        },
      });
    } catch (error) {
      console.error('Reset password error:', error);

      return c.json({
        success: false,
        error: {
          code: 'RESET_FAILED',
          message: 'Failed to reset password. Please try again.',
        },
      }, 500);
    }
  }
);

// POST /v1/auth/verify-email
authRoutes.post('/verify-email', async (c) => {
  try {
    // TODO: Implement email verification
    // Verify token, update user.isVerified

    return c.json({
      success: true,
      data: {
        message: 'Email verified successfully',
      },
    });
  } catch (error) {
    console.error('Email verification error:', error);

    return c.json({
      success: false,
      error: {
        code: 'VERIFICATION_FAILED',
        message: 'Failed to verify email. Please try again.',
      },
    }, 500);
    }
  }
);

// Social OAuth endpoints (placeholders for future implementation)
authRoutes.post('/social/google', async (c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Google OAuth not yet implemented',
    },
  }, 501);
});

authRoutes.post('/social/facebook', async (c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Facebook OAuth not yet implemented',
    },
  }, 501);
});

authRoutes.post('/social/apple', async (c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Apple OAuth not yet implemented',
    },
  }, 501);
});

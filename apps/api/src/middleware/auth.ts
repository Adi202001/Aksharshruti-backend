import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as jose from 'jose';
import type { Env } from '../index';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

// Extend Hono context to include user data
declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    userEmail: string;
    userRole: string;
  }
}

export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  try {
    // Get token from Authorization header
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HTTPException(401, { message: 'Unauthorized - No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);

    // Check token type
    if (payload.type !== 'access') {
      throw new HTTPException(401, { message: 'Invalid token type' });
    }

    // Set user data in context
    c.set('userId', payload.userId as string);
    c.set('userEmail', payload.email as string);
    c.set('userRole', payload.role as string);

    await next();
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      throw new HTTPException(401, { message: 'Token expired' });
    }
    if (error instanceof jose.errors.JWTInvalid) {
      throw new HTTPException(401, { message: 'Invalid token' });
    }
    throw error;
  }
}

// Optional auth - doesn't fail if no token
export async function optionalAuth(c: Context<{ Bindings: Env }>, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const secret = new TextEncoder().encode(c.env.JWT_SECRET);
      const { payload } = await jose.jwtVerify(token, secret);

      if (payload.type === 'access') {
        c.set('userId', payload.userId as string);
        c.set('userEmail', payload.email as string);
        c.set('userRole', payload.role as string);
      }
    }
  } catch (error) {
    // Silently fail for optional auth
    console.log('Optional auth failed:', error);
  }

  await next();
}

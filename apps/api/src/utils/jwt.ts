import * as jose from 'jose';
import { nanoid } from 'nanoid';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  tokenId?: string; // For refresh tokens
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

export async function generateAccessToken(
  userId: string,
  email: string,
  role: string,
  secret: string
): Promise<string> {
  const payload: JWTPayload = {
    userId,
    email,
    role,
    type: 'access',
  };

  const secretKey = new TextEncoder().encode(secret);

  const token = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secretKey);

  return token;
}

export async function generateRefreshToken(
  userId: string,
  email: string,
  role: string,
  secret: string
): Promise<{ token: string; tokenId: string }> {
  const tokenId = nanoid(32);

  const payload: JWTPayload = {
    userId,
    email,
    role,
    type: 'refresh',
    tokenId,
  };

  const secretKey = new TextEncoder().encode(secret);

  const token = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(secretKey);

  return { token, tokenId };
}

export async function generateTokenPair(
  userId: string,
  email: string,
  role: string,
  secret: string
): Promise<TokenPair> {
  const accessToken = await generateAccessToken(userId, email, role, secret);
  const { token: refreshToken } = await generateRefreshToken(userId, email, role, secret);

  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  };
}

export async function verifyToken(token: string, secret: string): Promise<JWTPayload> {
  const secretKey = new TextEncoder().encode(secret);
  const { payload } = await jose.jwtVerify(token, secretKey);
  return payload as JWTPayload;
}

export async function hashTokenForStorage(token: string): Promise<string> {
  // Hash the token for secure storage in database
  const encoder = new TextEncoder();
  const data = encoder.encode(token);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

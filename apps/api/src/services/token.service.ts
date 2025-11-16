import { DbClient, schema } from '@aksharshruti/database';
import { eq, and, gt } from 'drizzle-orm';
import { hashTokenForStorage } from '../utils/jwt';

export class TokenService {
  constructor(private db: DbClient) {}

  async saveRefreshToken(userId: string, tokenId: string, token: string, expiresAt: Date) {
    const tokenHash = await hashTokenForStorage(token);

    await this.db.insert(schema.refreshTokens).values({
      id: tokenId,
      userId,
      tokenHash,
      expiresAt,
      isRevoked: false,
    });
  }

  async verifyRefreshToken(tokenId: string, token: string): Promise<boolean> {
    const tokenHash = await hashTokenForStorage(token);

    const storedToken = await this.db.query.refreshTokens.findFirst({
      where: and(
        eq(schema.refreshTokens.id, tokenId),
        eq(schema.refreshTokens.tokenHash, tokenHash),
        eq(schema.refreshTokens.isRevoked, false),
        gt(schema.refreshTokens.expiresAt, new Date())
      ),
    });

    return !!storedToken;
  }

  async revokeRefreshToken(tokenId: string) {
    await this.db
      .update(schema.refreshTokens)
      .set({ isRevoked: true })
      .where(eq(schema.refreshTokens.id, tokenId));
  }

  async revokeAllUserTokens(userId: string) {
    await this.db
      .update(schema.refreshTokens)
      .set({ isRevoked: true })
      .where(eq(schema.refreshTokens.userId, userId));
  }

  async cleanupExpiredTokens() {
    // Delete expired tokens (for background cleanup job)
    await this.db
      .delete(schema.refreshTokens)
      .where(gt(new Date(), schema.refreshTokens.expiresAt));
  }
}

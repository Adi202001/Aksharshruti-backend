import { DbClient, schema } from '@aksharshruti/database';
import { eq, and, sql } from 'drizzle-orm';

export class LikeService {
  constructor(private db: DbClient) {}

  async likePost(userId: string, postId: string) {
    // Check if already liked
    const existingLike = await this.db.query.likes.findFirst({
      where: and(
        eq(schema.likes.userId, userId),
        eq(schema.likes.postId, postId)
      ),
    });

    if (existingLike) {
      throw new Error('ALREADY_LIKED');
    }

    // Check if post exists
    const post = await this.db.query.posts.findFirst({
      where: eq(schema.posts.id, postId),
    });

    if (!post) {
      throw new Error('POST_NOT_FOUND');
    }

    // Create like
    const [like] = await this.db
      .insert(schema.likes)
      .values({
        userId,
        postId,
      })
      .returning();

    // Increment post likes count
    await this.db
      .update(schema.posts)
      .set({
        likesCount: sql`${schema.posts.likesCount} + 1`,
      })
      .where(eq(schema.posts.id, postId));

    return like;
  }

  async unlikePost(userId: string, postId: string) {
    // Find the like
    const like = await this.db.query.likes.findFirst({
      where: and(
        eq(schema.likes.userId, userId),
        eq(schema.likes.postId, postId)
      ),
    });

    if (!like) {
      throw new Error('NOT_LIKED');
    }

    // Delete like
    await this.db
      .delete(schema.likes)
      .where(eq(schema.likes.id, like.id));

    // Decrement post likes count
    await this.db
      .update(schema.posts)
      .set({
        likesCount: sql`GREATEST(0, ${schema.posts.likesCount} - 1)`,
      })
      .where(eq(schema.posts.id, postId));
  }

  async hasUserLikedPost(userId: string, postId: string): Promise<boolean> {
    const like = await this.db.query.likes.findFirst({
      where: and(
        eq(schema.likes.userId, userId),
        eq(schema.likes.postId, postId)
      ),
    });

    return !!like;
  }

  async getPostLikes(postId: string, limit = 20, offset = 0) {
    const likes = await this.db.query.likes.findMany({
      where: eq(schema.likes.postId, postId),
      limit,
      offset,
      orderBy: (likes, { desc }) => [desc(likes.createdAt)],
    });

    // Fetch user details for likes
    if (likes.length === 0) {
      return [];
    }

    const userIds = likes.map(l => l.userId);
    const users = await this.db.query.users.findMany({
      where: sql`${schema.users.id} = ANY(${userIds})`,
      columns: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isVerified: true,
      },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    return likes.map(like => ({
      id: like.id,
      user: userMap.get(like.userId),
      createdAt: like.createdAt,
    }));
  }

  async getUserLikedPosts(userId: string, limit = 20, offset = 0) {
    const likes = await this.db.query.likes.findMany({
      where: eq(schema.likes.userId, userId),
      limit,
      offset,
      orderBy: (likes, { desc }) => [desc(likes.createdAt)],
    });

    if (likes.length === 0) {
      return [];
    }

    // Fetch posts
    const postIds = likes.map(l => l.postId);
    const posts = await this.db.query.posts.findMany({
      where: sql`${schema.posts.id} = ANY(${postIds}) AND ${schema.posts.status} = 'published' AND ${schema.posts.deletedAt} IS NULL`,
    });

    const postMap = new Map(posts.map(p => [p.id, p]));

    return likes
      .map(like => ({
        likedAt: like.createdAt,
        post: postMap.get(like.postId),
      }))
      .filter(item => item.post !== undefined);
  }
}

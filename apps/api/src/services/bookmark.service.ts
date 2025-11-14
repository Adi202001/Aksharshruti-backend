import { DbClient, schema } from '@aksharshruti/database';
import { eq, and, sql } from 'drizzle-orm';

export class BookmarkService {
  constructor(private db: DbClient) {}

  async bookmarkPost(userId: string, postId: string) {
    // Check if already bookmarked
    const existingBookmark = await this.db.query.bookmarks.findFirst({
      where: and(
        eq(schema.bookmarks.userId, userId),
        eq(schema.bookmarks.postId, postId)
      ),
    });

    if (existingBookmark) {
      throw new Error('ALREADY_BOOKMARKED');
    }

    // Check if post exists
    const post = await this.db.query.posts.findFirst({
      where: eq(schema.posts.id, postId),
    });

    if (!post) {
      throw new Error('POST_NOT_FOUND');
    }

    // Create bookmark
    const [bookmark] = await this.db
      .insert(schema.bookmarks)
      .values({
        userId,
        postId,
      })
      .returning();

    // Increment post bookmarks count
    await this.db
      .update(schema.posts)
      .set({
        bookmarksCount: sql`${schema.posts.bookmarksCount} + 1`,
      })
      .where(eq(schema.posts.id, postId));

    return bookmark;
  }

  async unbookmarkPost(userId: string, postId: string) {
    // Find the bookmark
    const bookmark = await this.db.query.bookmarks.findFirst({
      where: and(
        eq(schema.bookmarks.userId, userId),
        eq(schema.bookmarks.postId, postId)
      ),
    });

    if (!bookmark) {
      throw new Error('NOT_BOOKMARKED');
    }

    // Delete bookmark
    await this.db
      .delete(schema.bookmarks)
      .where(eq(schema.bookmarks.id, bookmark.id));

    // Decrement post bookmarks count
    await this.db
      .update(schema.posts)
      .set({
        bookmarksCount: sql`GREATEST(0, ${schema.posts.bookmarksCount} - 1)`,
      })
      .where(eq(schema.posts.id, postId));
  }

  async hasUserBookmarkedPost(userId: string, postId: string): Promise<boolean> {
    const bookmark = await this.db.query.bookmarks.findFirst({
      where: and(
        eq(schema.bookmarks.userId, userId),
        eq(schema.bookmarks.postId, postId)
      ),
    });

    return !!bookmark;
  }

  async getUserBookmarks(userId: string, limit = 20, offset = 0) {
    const bookmarks = await this.db.query.bookmarks.findMany({
      where: eq(schema.bookmarks.userId, userId),
      limit,
      offset,
      orderBy: (bookmarks, { desc }) => [desc(bookmarks.createdAt)],
    });

    if (bookmarks.length === 0) {
      return [];
    }

    // Fetch posts
    const postIds = bookmarks.map(b => b.postId);
    const posts = await this.db.query.posts.findMany({
      where: sql`${schema.posts.id} = ANY(${postIds}) AND ${schema.posts.status} = 'published' AND ${schema.posts.deletedAt} IS NULL`,
    });

    // Fetch authors for posts
    const authorIds = [...new Set(posts.map(p => p.userId))];
    const authors = await this.db.query.users.findMany({
      where: sql`${schema.users.id} = ANY(${authorIds})`,
      columns: {
        id: true,
        username: true,
        displayName: true,
        penName: true,
        avatarUrl: true,
        isVerified: true,
      },
    });

    const authorMap = new Map(authors.map(a => [a.id, a]));
    const postMap = new Map(posts.map(p => [p.id, { ...p, author: authorMap.get(p.userId) }]));

    return bookmarks
      .map(bookmark => ({
        id: bookmark.id,
        bookmarkedAt: bookmark.createdAt,
        post: postMap.get(bookmark.postId),
      }))
      .filter(item => item.post !== undefined);
  }
}

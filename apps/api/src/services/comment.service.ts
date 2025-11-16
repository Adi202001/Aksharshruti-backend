import { DbClient, schema } from '@aksharshruti/database';
import { eq, and, desc, asc, isNull, sql } from 'drizzle-orm';
import type { CreateCommentInput, UpdateCommentInput, CommentFilters } from '@aksharshruti/validation';

export class CommentService {
  constructor(private db: DbClient) {}

  async createComment(userId: string, postId: string, input: CreateCommentInput) {
    // Validate post exists
    const post = await this.db.query.posts.findFirst({
      where: and(
        eq(schema.posts.id, postId),
        isNull(schema.posts.deletedAt)
      ),
    });

    if (!post) {
      throw new Error('POST_NOT_FOUND');
    }

    // If replying to a comment, validate parent comment exists
    if (input.parentCommentId) {
      const parentComment = await this.db.query.comments.findFirst({
        where: and(
          eq(schema.comments.id, input.parentCommentId),
          eq(schema.comments.postId, postId),
          isNull(schema.comments.deletedAt)
        ),
      });

      if (!parentComment) {
        throw new Error('PARENT_COMMENT_NOT_FOUND');
      }
    }

    // Create comment
    const [comment] = await this.db
      .insert(schema.comments)
      .values({
        userId,
        postId,
        content: input.content,
        parentCommentId: input.parentCommentId,
      })
      .returning();

    // Increment post comments count
    await this.db
      .update(schema.posts)
      .set({
        commentsCount: sql`${schema.posts.commentsCount} + 1`,
      })
      .where(eq(schema.posts.id, postId));

    return comment;
  }

  async getComment(commentId: string) {
    return await this.db.query.comments.findFirst({
      where: and(
        eq(schema.comments.id, commentId),
        isNull(schema.comments.deletedAt)
      ),
    });
  }

  async getCommentWithAuthor(commentId: string) {
    const comment = await this.getComment(commentId);

    if (!comment) {
      return null;
    }

    // Fetch author
    const author = await this.db.query.users.findFirst({
      where: eq(schema.users.id, comment.userId),
      columns: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isVerified: true,
      },
    });

    return {
      ...comment,
      author,
    };
  }

  async getPostComments(postId: string, filters?: Partial<CommentFilters>) {
    const {
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters || {};

    // Get top-level comments (no parent)
    const orderColumn = schema.comments[sortBy as keyof typeof schema.comments];
    const orderFn = sortOrder === 'desc' ? desc : asc;

    const comments = await this.db.query.comments.findMany({
      where: and(
        eq(schema.comments.postId, postId),
        isNull(schema.comments.parentCommentId),
        isNull(schema.comments.deletedAt)
      ),
      limit,
      offset,
      orderBy: orderFn(orderColumn),
    });

    if (comments.length === 0) {
      return [];
    }

    // Fetch authors for comments
    const userIds = [...new Set(comments.map(c => c.userId))];
    const authors = await this.db.query.users.findMany({
      where: sql`${schema.users.id} = ANY(${userIds})`,
      columns: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isVerified: true,
      },
    });

    const authorMap = new Map(authors.map(a => [a.id, a]));

    // Get reply counts for each comment
    const commentIds = comments.map(c => c.id);
    const replyCounts = await this.db
      .select({
        parentId: schema.comments.parentCommentId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.comments)
      .where(
        and(
          sql`${schema.comments.parentCommentId} = ANY(${commentIds})`,
          isNull(schema.comments.deletedAt)
        )
      )
      .groupBy(schema.comments.parentCommentId);

    const replyCountMap = new Map(replyCounts.map(r => [r.parentId!, r.count]));

    return comments.map(comment => ({
      ...comment,
      author: authorMap.get(comment.userId),
      replyCount: replyCountMap.get(comment.id) || 0,
    }));
  }

  async getCommentReplies(commentId: string, filters?: Partial<CommentFilters>) {
    const {
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'asc', // Replies usually shown oldest first
    } = filters || {};

    const orderColumn = schema.comments[sortBy as keyof typeof schema.comments];
    const orderFn = sortOrder === 'desc' ? desc : asc;

    const replies = await this.db.query.comments.findMany({
      where: and(
        eq(schema.comments.parentCommentId, commentId),
        isNull(schema.comments.deletedAt)
      ),
      limit,
      offset,
      orderBy: orderFn(orderColumn),
    });

    if (replies.length === 0) {
      return [];
    }

    // Fetch authors for replies
    const userIds = [...new Set(replies.map(r => r.userId))];
    const authors = await this.db.query.users.findMany({
      where: sql`${schema.users.id} = ANY(${userIds})`,
      columns: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isVerified: true,
      },
    });

    const authorMap = new Map(authors.map(a => [a.id, a]));

    return replies.map(reply => ({
      ...reply,
      author: authorMap.get(reply.userId),
    }));
  }

  async updateComment(commentId: string, userId: string, input: UpdateCommentInput) {
    // Check if comment belongs to user
    const comment = await this.getComment(commentId);

    if (!comment || comment.userId !== userId) {
      throw new Error('COMMENT_NOT_FOUND');
    }

    const [updatedComment] = await this.db
      .update(schema.comments)
      .set({
        content: input.content,
        updatedAt: new Date(),
      })
      .where(eq(schema.comments.id, commentId))
      .returning();

    return updatedComment;
  }

  async deleteComment(commentId: string, userId: string) {
    // Check if comment belongs to user
    const comment = await this.getComment(commentId);

    if (!comment || comment.userId !== userId) {
      throw new Error('COMMENT_NOT_FOUND');
    }

    // Soft delete
    await this.db
      .update(schema.comments)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(schema.comments.id, commentId));

    // Decrement post comments count
    await this.db
      .update(schema.posts)
      .set({
        commentsCount: sql`GREATEST(0, ${schema.posts.commentsCount} - 1)`,
      })
      .where(eq(schema.posts.id, comment.postId));
  }

  async getUserComments(userId: string, limit = 20, offset = 0) {
    const comments = await this.db.query.comments.findMany({
      where: and(
        eq(schema.comments.userId, userId),
        isNull(schema.comments.deletedAt)
      ),
      limit,
      offset,
      orderBy: desc(schema.comments.createdAt),
    });

    if (comments.length === 0) {
      return [];
    }

    // Fetch posts for comments
    const postIds = [...new Set(comments.map(c => c.postId))];
    const posts = await this.db.query.posts.findMany({
      where: sql`${schema.posts.id} = ANY(${postIds}) AND ${schema.posts.deletedAt} IS NULL`,
      columns: {
        id: true,
        title: true,
        userId: true,
      },
    });

    const postMap = new Map(posts.map(p => [p.id, p]));

    return comments
      .map(comment => ({
        ...comment,
        post: postMap.get(comment.postId),
      }))
      .filter(item => item.post !== undefined);
  }
}

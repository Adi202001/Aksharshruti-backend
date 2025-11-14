import { DbClient, schema } from '@aksharshruti/database';
import { eq, and, desc, asc, isNull, inArray, sql } from 'drizzle-orm';
import type { CreatePostInput, UpdatePostInput, PostFilters } from '@aksharshruti/validation';

export class PostService {
  constructor(private db: DbClient) {}

  async createPost(userId: string, input: CreatePostInput) {
    const [post] = await this.db
      .insert(schema.posts)
      .values({
        userId,
        title: input.title,
        content: input.content,
        excerpt: input.excerpt,
        coverImageUrl: input.coverImageUrl,
        postType: input.postType,
        status: input.status || 'draft',
        isPinned: input.isPinned || false,
        language: input.language,
        tags: input.tags || [],
        readTimeMinutes: input.readTimeMinutes,
        publishedAt: input.status === 'published' ? new Date() : null,
      })
      .returning();

    return post;
  }

  async getPostById(postId: string, includeDeleted = false) {
    const conditions = includeDeleted
      ? eq(schema.posts.id, postId)
      : and(eq(schema.posts.id, postId), isNull(schema.posts.deletedAt));

    return await this.db.query.posts.findFirst({
      where: conditions,
    });
  }

  async getPostWithAuthor(postId: string) {
    const post = await this.db.query.posts.findFirst({
      where: and(eq(schema.posts.id, postId), isNull(schema.posts.deletedAt)),
    });

    if (!post) {
      return null;
    }

    // Fetch author separately
    const author = await this.db.query.users.findFirst({
      where: eq(schema.users.id, post.userId),
      columns: {
        id: true,
        username: true,
        displayName: true,
        penName: true,
        avatarUrl: true,
        isVerified: true,
      },
    });

    return {
      ...post,
      author,
    };
  }

  async updatePost(postId: string, userId: string, input: UpdatePostInput) {
    // Check if post belongs to user
    const post = await this.getPostById(postId);
    if (!post || post.userId !== userId) {
      throw new Error('POST_NOT_FOUND');
    }

    const updateData: any = {
      ...input,
      updatedAt: new Date(),
    };

    // If status is being changed to published, set publishedAt
    if (input.status === 'published' && post.status !== 'published') {
      updateData.publishedAt = new Date();
    }

    const [updatedPost] = await this.db
      .update(schema.posts)
      .set(updateData)
      .where(eq(schema.posts.id, postId))
      .returning();

    return updatedPost;
  }

  async publishPost(postId: string, userId: string) {
    const post = await this.getPostById(postId);
    if (!post || post.userId !== userId) {
      throw new Error('POST_NOT_FOUND');
    }

    if (post.status === 'published') {
      throw new Error('POST_ALREADY_PUBLISHED');
    }

    // Validate that post has required fields for publishing
    if (!post.title || !post.content || !post.language) {
      throw new Error('INCOMPLETE_POST');
    }

    const [publishedPost] = await this.db
      .update(schema.posts)
      .set({
        status: 'published',
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.posts.id, postId))
      .returning();

    return publishedPost;
  }

  async deletePost(postId: string, userId: string) {
    const post = await this.getPostById(postId);
    if (!post || post.userId !== userId) {
      throw new Error('POST_NOT_FOUND');
    }

    // Soft delete
    await this.db
      .update(schema.posts)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.posts.id, postId));
  }

  async getUserPosts(userId: string, filters?: Partial<PostFilters>) {
    const {
      status,
      postType,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters || {};

    const conditions = [
      eq(schema.posts.userId, userId),
      isNull(schema.posts.deletedAt),
    ];

    if (status) {
      conditions.push(eq(schema.posts.status, status));
    }

    if (postType) {
      conditions.push(eq(schema.posts.postType, postType));
    }

    const orderColumn = schema.posts[sortBy as keyof typeof schema.posts];
    const orderFn = sortOrder === 'desc' ? desc : asc;

    const posts = await this.db.query.posts.findMany({
      where: and(...conditions),
      limit,
      offset,
      orderBy: orderFn(orderColumn),
    });

    return posts;
  }

  async getPublishedPosts(filters?: PostFilters) {
    const {
      postType,
      language,
      userId,
      tag,
      limit = 20,
      offset = 0,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
    } = filters || {};

    const conditions = [
      eq(schema.posts.status, 'published'),
      isNull(schema.posts.deletedAt),
    ];

    if (postType) {
      conditions.push(eq(schema.posts.postType, postType));
    }

    if (language) {
      conditions.push(eq(schema.posts.language, language));
    }

    if (userId) {
      conditions.push(eq(schema.posts.userId, userId));
    }

    // For tag filtering, we need to use a SQL condition
    if (tag) {
      conditions.push(
        sql`${schema.posts.tags}::jsonb @> ${JSON.stringify([tag])}::jsonb`
      );
    }

    const orderColumn = schema.posts[sortBy as keyof typeof schema.posts];
    const orderFn = sortOrder === 'desc' ? desc : asc;

    const posts = await this.db.query.posts.findMany({
      where: and(...conditions),
      limit,
      offset,
      orderBy: orderFn(orderColumn),
    });

    // Fetch authors for all posts
    const userIds = [...new Set(posts.map(p => p.userId))];
    const authors = await this.db.query.users.findMany({
      where: inArray(schema.users.id, userIds),
      columns: {
        id: true,
        username: true,
        displayName: true,
        penName: true,
        avatarUrl: true,
        isVerified: true,
      },
    });

    // Create a map of authors by userId
    const authorMap = new Map(authors.map(a => [a.id, a]));

    // Attach authors to posts
    const postsWithAuthors = posts.map(post => ({
      ...post,
      author: authorMap.get(post.userId),
    }));

    return postsWithAuthors;
  }

  async incrementViewCount(postId: string) {
    await this.db
      .update(schema.posts)
      .set({
        viewCount: sql`${schema.posts.viewCount} + 1`,
      })
      .where(eq(schema.posts.id, postId));
  }

  async getPinnedPosts(userId: string) {
    return await this.db.query.posts.findMany({
      where: and(
        eq(schema.posts.userId, userId),
        eq(schema.posts.isPinned, true),
        eq(schema.posts.status, 'published'),
        isNull(schema.posts.deletedAt)
      ),
      orderBy: desc(schema.posts.publishedAt),
    });
  }

  async togglePin(postId: string, userId: string) {
    const post = await this.getPostById(postId);
    if (!post || post.userId !== userId) {
      throw new Error('POST_NOT_FOUND');
    }

    const [updatedPost] = await this.db
      .update(schema.posts)
      .set({
        isPinned: !post.isPinned,
        updatedAt: new Date(),
      })
      .where(eq(schema.posts.id, postId))
      .returning();

    return updatedPost;
  }

  async archivePost(postId: string, userId: string) {
    const post = await this.getPostById(postId);
    if (!post || post.userId !== userId) {
      throw new Error('POST_NOT_FOUND');
    }

    const [archivedPost] = await this.db
      .update(schema.posts)
      .set({
        status: 'archived',
        updatedAt: new Date(),
      })
      .where(eq(schema.posts.id, postId))
      .returning();

    return archivedPost;
  }

  async getPostStats(postId: string) {
    const post = await this.db.query.posts.findFirst({
      where: eq(schema.posts.id, postId),
      columns: {
        id: true,
        viewCount: true,
        likesCount: true,
        commentsCount: true,
        sharesCount: true,
        bookmarksCount: true,
      },
    });

    return post;
  }
}

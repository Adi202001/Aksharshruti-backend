import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  createPostSchema,
  updatePostSchema,
  postFiltersSchema,
} from '@aksharshruti/validation';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { rateLimits } from '../middleware/rate-limit';
import { getDb } from '../services/db.service';
import { PostService } from '../services/post.service';
import type { Env } from '../index';

export const postRoutes = new Hono<{ Bindings: Env }>();

// POST /v1/posts - Create new post
postRoutes.post(
  '/',
  requireAuth,
  rateLimits.write.post,
  zValidator('json', createPostSchema),
  async (c) => {
    try {
      const userId = c.get('userId');
      const input = c.req.valid('json');
      const db = getDb(c.env);
      const postService = new PostService(db);

      const post = await postService.createPost(userId, input);

      return c.json({
        success: true,
        data: {
          post,
        },
      }, 201);
    } catch (error) {
      console.error('Create post error:', error);
      return c.json({
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: 'Failed to create post',
        },
      }, 500);
    }
  }
);

// GET /v1/posts - Get published posts with filters
postRoutes.get(
  '/',
  optionalAuth,
  rateLimits.read.standard,
  zValidator('query', postFiltersSchema.partial()),
  async (c) => {
    try {
      const filters = c.req.valid('query');
      const db = getDb(c.env);
      const postService = new PostService(db);

      const posts = await postService.getPublishedPosts(filters);

      return c.json({
        success: true,
        data: {
          posts,
          pagination: {
            limit: filters.limit || 20,
            offset: filters.offset || 0,
          },
        },
      });
    } catch (error) {
      console.error('Get posts error:', error);
      return c.json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch posts',
        },
      }, 500);
    }
  }
);

// GET /v1/posts/me/drafts - Get current user's draft posts
postRoutes.get('/me/drafts', requireAuth, rateLimits.read.standard, async (c) => {
  try {
    const userId = c.get('userId');
    const db = getDb(c.env);
    const postService = new PostService(db);

    const posts = await postService.getUserPosts(userId, { status: 'draft' });

    return c.json({
      success: true,
      data: {
        posts,
      },
    });
  } catch (error) {
    console.error('Get user drafts error:', error);
    return c.json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch drafts',
      },
    }, 500);
  }
});

// GET /v1/posts/me/published - Get current user's published posts
postRoutes.get('/me/published', requireAuth, rateLimits.read.standard, async (c) => {
  try {
    const userId = c.get('userId');
    const db = getDb(c.env);
    const postService = new PostService(db);

    const posts = await postService.getUserPosts(userId, { status: 'published' });

    return c.json({
      success: true,
      data: {
        posts,
      },
    });
  } catch (error) {
    console.error('Get user published posts error:', error);
    return c.json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch published posts',
      },
    }, 500);
  }
});

// GET /v1/posts/me/archived - Get current user's archived posts
postRoutes.get('/me/archived', requireAuth, rateLimits.read.standard, async (c) => {
  try {
    const userId = c.get('userId');
    const db = getDb(c.env);
    const postService = new PostService(db);

    const posts = await postService.getUserPosts(userId, { status: 'archived' });

    return c.json({
      success: true,
      data: {
        posts,
      },
    });
  } catch (error) {
    console.error('Get user archived posts error:', error);
    return c.json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch archived posts',
      },
    }, 500);
  }
});

// GET /v1/posts/me/pinned - Get current user's pinned posts
postRoutes.get('/me/pinned', requireAuth, rateLimits.read.standard, async (c) => {
  try {
    const userId = c.get('userId');
    const db = getDb(c.env);
    const postService = new PostService(db);

    const posts = await postService.getPinnedPosts(userId);

    return c.json({
      success: true,
      data: {
        posts,
      },
    });
  } catch (error) {
    console.error('Get pinned posts error:', error);
    return c.json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch pinned posts',
      },
    }, 500);
  }
});

// GET /v1/posts/user/:userId - Get user's published posts (public)
postRoutes.get('/user/:userId', rateLimits.read.standard, async (c) => {
  try {
    const userId = c.req.param('userId');
    const db = getDb(c.env);
    const postService = new PostService(db);

    const posts = await postService.getPublishedPosts({ userId });

    return c.json({
      success: true,
      data: {
        posts,
      },
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    return c.json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch user posts',
      },
    }, 500);
  }
});

// GET /v1/posts/:postId - Get single post with author
postRoutes.get('/:postId', optionalAuth, rateLimits.read.standard, async (c) => {
  try {
    const postId = c.req.param('postId');
    const db = getDb(c.env);
    const postService = new PostService(db);

    const post = await postService.getPostWithAuthor(postId);

    if (!post) {
      return c.json({
        success: false,
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Post not found',
        },
      }, 404);
    }

    // Only increment view count for published posts
    if (post.status === 'published') {
      await postService.incrementViewCount(postId);
    }

    return c.json({
      success: true,
      data: {
        post,
      },
    });
  } catch (error) {
    console.error('Get post error:', error);
    return c.json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch post',
      },
    }, 500);
  }
});

// PATCH /v1/posts/:postId - Update post
postRoutes.patch(
  '/:postId',
  requireAuth,
  rateLimits.write.update,
  zValidator('json', updatePostSchema),
  async (c) => {
    try {
      const userId = c.get('userId');
      const postId = c.req.param('postId');
      const input = c.req.valid('json');
      const db = getDb(c.env);
      const postService = new PostService(db);

      const updatedPost = await postService.updatePost(postId, userId, input);

      return c.json({
        success: true,
        data: {
          post: updatedPost,
        },
      });
    } catch (error: any) {
      console.error('Update post error:', error);

      if (error.message === 'POST_NOT_FOUND') {
        return c.json({
          success: false,
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found or you do not have permission to update it',
          },
        }, 404);
      }

      return c.json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update post',
        },
      }, 500);
    }
  }
);

// DELETE /v1/posts/:postId - Delete post
postRoutes.delete('/:postId', requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const postId = c.req.param('postId');
    const db = getDb(c.env);
    const postService = new PostService(db);

    await postService.deletePost(postId, userId);

    return c.json({
      success: true,
      data: {
        message: 'Post deleted successfully',
      },
    });
  } catch (error: any) {
    console.error('Delete post error:', error);

    if (error.message === 'POST_NOT_FOUND') {
      return c.json({
        success: false,
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Post not found or you do not have permission to delete it',
        },
      }, 404);
    }

    return c.json({
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: 'Failed to delete post',
      },
    }, 500);
  }
});

// POST /v1/posts/:postId/publish - Publish a draft post
postRoutes.post('/:postId/publish', requireAuth, rateLimits.write.update, async (c) => {
  try {
    const userId = c.get('userId');
    const postId = c.req.param('postId');
    const db = getDb(c.env);
    const postService = new PostService(db);

    const publishedPost = await postService.publishPost(postId, userId);

    return c.json({
      success: true,
      data: {
        post: publishedPost,
      },
    });
  } catch (error: any) {
    console.error('Publish post error:', error);

    if (error.message === 'POST_NOT_FOUND') {
      return c.json({
        success: false,
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Post not found or you do not have permission to publish it',
        },
      }, 404);
    }

    if (error.message === 'POST_ALREADY_PUBLISHED') {
      return c.json({
        success: false,
        error: {
          code: 'POST_ALREADY_PUBLISHED',
          message: 'Post is already published',
        },
      }, 400);
    }

    if (error.message === 'INCOMPLETE_POST') {
      return c.json({
        success: false,
        error: {
          code: 'INCOMPLETE_POST',
          message: 'Post is missing required fields for publishing',
        },
      }, 400);
    }

    return c.json({
      success: false,
      error: {
        code: 'PUBLISH_FAILED',
        message: 'Failed to publish post',
      },
    }, 500);
  }
});

// POST /v1/posts/:postId/archive - Archive a post
postRoutes.post('/:postId/archive', requireAuth, rateLimits.write.update, async (c) => {
  try {
    const userId = c.get('userId');
    const postId = c.req.param('postId');
    const db = getDb(c.env);
    const postService = new PostService(db);

    const archivedPost = await postService.archivePost(postId, userId);

    return c.json({
      success: true,
      data: {
        post: archivedPost,
      },
    });
  } catch (error: any) {
    console.error('Archive post error:', error);

    if (error.message === 'POST_NOT_FOUND') {
      return c.json({
        success: false,
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Post not found or you do not have permission to archive it',
        },
      }, 404);
    }

    return c.json({
      success: false,
      error: {
        code: 'ARCHIVE_FAILED',
        message: 'Failed to archive post',
      },
    }, 500);
  }
});

// POST /v1/posts/:postId/pin - Toggle pin status
postRoutes.post('/:postId/pin', requireAuth, rateLimits.write.update, async (c) => {
  try {
    const userId = c.get('userId');
    const postId = c.req.param('postId');
    const db = getDb(c.env);
    const postService = new PostService(db);

    const updatedPost = await postService.togglePin(postId, userId);

    return c.json({
      success: true,
      data: {
        post: updatedPost,
        isPinned: updatedPost.isPinned,
      },
    });
  } catch (error: any) {
    console.error('Toggle pin error:', error);

    if (error.message === 'POST_NOT_FOUND') {
      return c.json({
        success: false,
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Post not found or you do not have permission to pin it',
        },
      }, 404);
    }

    return c.json({
      success: false,
      error: {
        code: 'PIN_FAILED',
        message: 'Failed to toggle pin status',
      },
    }, 500);
  }
});

// GET /v1/posts/:postId/stats - Get post stats
postRoutes.get('/:postId/stats', rateLimits.read.standard, async (c) => {
  try {
    const postId = c.req.param('postId');
    const db = getDb(c.env);
    const postService = new PostService(db);

    const stats = await postService.getPostStats(postId);

    if (!stats) {
      return c.json({
        success: false,
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Post not found',
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
    console.error('Get post stats error:', error);
    return c.json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch post stats',
      },
    }, 500);
  }
});

// POST /v1/posts/:postId/like - Like a post (placeholder)
postRoutes.post('/:postId/like', requireAuth, rateLimits.social.like, async (c) => {
  const postId = c.req.param('postId');
  const userId = c.get('userId');

  return c.json({
    success: true,
    data: {
      message: 'Like post endpoint - To be implemented',
      postId,
      userId,
    },
  });
});

// DELETE /v1/posts/:postId/like - Unlike a post (placeholder)
postRoutes.delete('/:postId/like', requireAuth, async (c) => {
  const postId = c.req.param('postId');
  const userId = c.get('userId');

  return c.json({
    success: true,
    data: {
      message: 'Unlike post endpoint - To be implemented',
      postId,
      userId,
    },
  });
});

// GET /v1/posts/:postId/comments - Get post comments (placeholder)
postRoutes.get('/:postId/comments', optionalAuth, rateLimits.read.standard, async (c) => {
  const postId = c.req.param('postId');

  return c.json({
    success: true,
    data: {
      message: 'Get comments endpoint - To be implemented',
      postId,
      comments: [],
    },
  });
});

// POST /v1/posts/:postId/comments - Add comment (placeholder)
postRoutes.post('/:postId/comments', requireAuth, rateLimits.write.comment, async (c) => {
  const postId = c.req.param('postId');
  const userId = c.get('userId');

  return c.json({
    success: true,
    data: {
      message: 'Add comment endpoint - To be implemented',
      postId,
      userId,
    },
  }, 201);
});

// POST /v1/posts/:postId/bookmark - Bookmark a post (placeholder)
postRoutes.post('/:postId/bookmark', requireAuth, async (c) => {
  const postId = c.req.param('postId');
  const userId = c.get('userId');

  return c.json({
    success: true,
    data: {
      message: 'Bookmark post endpoint - To be implemented',
      postId,
      userId,
    },
  });
});

// DELETE /v1/posts/:postId/bookmark - Remove bookmark (placeholder)
postRoutes.delete('/:postId/bookmark', requireAuth, async (c) => {
  const postId = c.req.param('postId');
  const userId = c.get('userId');

  return c.json({
    success: true,
    data: {
      message: 'Remove bookmark endpoint - To be implemented',
      postId,
      userId,
    },
  });
});

// POST /v1/posts/:postId/share - Share a post (placeholder)
postRoutes.post('/:postId/share', requireAuth, rateLimits.social.share, async (c) => {
  const postId = c.req.param('postId');
  const userId = c.get('userId');

  return c.json({
    success: true,
    data: {
      message: 'Share post endpoint - To be implemented',
      postId,
      userId,
    },
  });
});

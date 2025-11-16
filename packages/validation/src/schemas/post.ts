import { z } from 'zod';

// Post type enum
export const postTypeEnum = z.enum(['text', 'image', 'journal', 'poetry', 'story']);

// Post status enum
export const postStatusEnum = z.enum(['draft', 'published', 'archived']);

// Create post schema
export const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(500, 'Excerpt must be less than 500 characters').optional(),
  coverImageUrl: z.string().url('Invalid URL format').max(500).optional().or(z.literal('')),
  postType: postTypeEnum,
  status: postStatusEnum.default('draft'),
  isPinned: z.boolean().default(false),
  language: z.string().min(2, 'Language code is required').max(50),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed').default([]),
  readTimeMinutes: z.number().int().positive().optional(),
});

// Update post schema
export const updatePostSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(500).optional(),
  coverImageUrl: z.string().url('Invalid URL format').max(500).optional().or(z.literal('')),
  postType: postTypeEnum.optional(),
  status: postStatusEnum.optional(),
  isPinned: z.boolean().optional(),
  language: z.string().min(2).max(50).optional(),
  tags: z.array(z.string()).max(10).optional(),
  readTimeMinutes: z.number().int().positive().optional(),
});

// Publish post schema (requires specific fields to be complete)
export const publishPostSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  language: z.string().min(2).max(50),
  postType: postTypeEnum,
});

// Post query filters
export const postFiltersSchema = z.object({
  status: postStatusEnum.optional(),
  postType: postTypeEnum.optional(),
  language: z.string().optional(),
  userId: z.string().uuid().optional(),
  tag: z.string().optional(),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
  sortBy: z.enum(['createdAt', 'publishedAt', 'viewCount', 'likesCount', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Create chapter schema
export const createChapterSchema = z.object({
  title: z.string().min(1, 'Chapter title is required').max(255),
  content: z.string().min(1, 'Chapter content is required'),
  chapterNumber: z.number().int().positive('Chapter number must be positive'),
  isCompleted: z.boolean().default(false),
});

// Update chapter schema
export const updateChapterSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  chapterNumber: z.number().int().positive().optional(),
  isCompleted: z.boolean().optional(),
});

// Types
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type PublishPostInput = z.infer<typeof publishPostSchema>;
export type PostFilters = z.infer<typeof postFiltersSchema>;
export type CreateChapterInput = z.infer<typeof createChapterSchema>;
export type UpdateChapterInput = z.infer<typeof updateChapterSchema>;
export type PostType = z.infer<typeof postTypeEnum>;
export type PostStatus = z.infer<typeof postStatusEnum>;

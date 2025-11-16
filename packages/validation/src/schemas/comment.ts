import { z } from 'zod';

// Create comment schema
export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(2000, 'Comment must be less than 2000 characters'),
  parentCommentId: z.string().uuid().optional(),
});

// Update comment schema
export const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

// Comment filters schema
export const commentFiltersSchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
  sortBy: z.enum(['createdAt', 'likesCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Types
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CommentFilters = z.infer<typeof commentFiltersSchema>;

import { pgTable, uuid, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users';
import { posts } from './posts';

// Likes
export const likes = pgTable('likes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Comments
export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  parentCommentId: uuid('parent_comment_id').references(() => comments.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  likesCount: integer('likes_count').default(0),
  dislikesCount: integer('dislikes_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// Comment Reactions
export const commentReactions = pgTable('comment_reactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  commentId: uuid('comment_id').notNull().references(() => comments.id, { onDelete: 'cascade' }),
  reactionType: varchar('reaction_type', { length: 20 }).notNull()
    .$type<'like' | 'dislike' | 'love' | 'laugh' | 'sad'>(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Bookmarks
export const bookmarks = pgTable('bookmarks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Shares
export const shares = pgTable('shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  shareType: varchar('share_type', { length: 20 }).notNull()
    .$type<'link' | 'whatsapp' | 'twitter' | 'facebook' | 'instagram' | 'collection'>(),
  destinationCollectionId: uuid('destination_collection_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Follows
export const follows = pgTable('follows', {
  id: uuid('id').primaryKey().defaultRandom(),
  followerId: uuid('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  followingId: uuid('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Blocked Users
export const blockedUsers = pgTable('blocked_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  blockerId: uuid('blocker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  blockedId: uuid('blocked_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  blockedAt: timestamp('blocked_at').defaultNow(),
});

// Muted Users
export const mutedUsers = pgTable('muted_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  muterId: uuid('muter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mutedId: uuid('muted_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mutedAt: timestamp('muted_at').defaultNow(),
});

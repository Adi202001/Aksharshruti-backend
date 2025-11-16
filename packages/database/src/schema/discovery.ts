import { pgTable, uuid, varchar, text, timestamp, integer, real } from 'drizzle-orm/pg-core';
import { users } from './users';
import { posts } from './posts';

// Search History
export const searchHistory = pgTable('search_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  query: varchar('query', { length: 255 }).notNull(),
  resultCount: integer('result_count'),
  searchedAt: timestamp('searched_at').defaultNow(),
});

// Trending Posts (Materialized View Data)
export const trendingPosts = pgTable('trending_posts', {
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  score: real('score').notNull(),
  timeframe: varchar('timeframe', { length: 20 }).notNull()
    .$type<'today' | 'week' | 'month' | 'all_time'>(),
  lastCalculated: timestamp('last_calculated').defaultNow(),
});

// Hashtags
export const hashtags = pgTable('hashtags', {
  id: uuid('id').primaryKey().defaultRandom(),
  tag: varchar('tag', { length: 100 }).notNull().unique(),
  usageCount: integer('usage_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Post Hashtags
export const postHashtags = pgTable('post_hashtags', {
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  hashtagId: uuid('hashtag_id').notNull().references(() => hashtags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Post Mentions
export const postMentions = pgTable('post_mentions', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  mentionedUserId: uuid('mentioned_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
});

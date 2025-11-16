import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

// Posts/Pages
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  excerpt: varchar('excerpt', { length: 500 }),
  coverImageUrl: varchar('cover_image_url', { length: 500 }),
  postType: varchar('post_type', { length: 20 }).notNull()
    .$type<'text' | 'image' | 'journal' | 'poetry' | 'story'>(),
  status: varchar('status', { length: 20 }).default('draft')
    .$type<'draft' | 'published' | 'archived'>(),
  isPinned: boolean('is_pinned').default(false),
  viewCount: integer('view_count').default(0),
  readTimeMinutes: integer('read_time_minutes'),
  language: varchar('language', { length: 50 }).notNull(),
  tags: jsonb('tags').default(sql`'[]'::jsonb`),
  // Denormalized counters for performance
  likesCount: integer('likes_count').default(0),
  commentsCount: integer('comments_count').default(0),
  sharesCount: integer('shares_count').default(0),
  bookmarksCount: integer('bookmarks_count').default(0),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// Post Chapters
export const postChapters = pgTable('post_chapters', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  chapterNumber: integer('chapter_number').notNull(),
  isCompleted: boolean('is_completed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Collections
export const collections = pgTable('collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  coverImageUrl: varchar('cover_image_url', { length: 500 }),
  isPrivate: boolean('is_private').default(false),
  genreTags: jsonb('genre_tags').default(sql`'[]'::jsonb`),
  itemCount: integer('item_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Collection Items
export const collectionItems = pgTable('collection_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  addedAt: timestamp('added_at').defaultNow(),
});

// Saved Collections
export const savedCollections = pgTable('saved_collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  collectionId: uuid('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  savedAt: timestamp('saved_at').defaultNow(),
});

// Journal Entries
export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }),
  content: text('content').notNull(),
  imageUrl: varchar('image_url', { length: 500 }),
  isPrivate: boolean('is_private').default(true),
  mood: varchar('mood', { length: 50 }),
  entryDate: timestamp('entry_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Reading Progress
export const readingProgress = pgTable('reading_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  currentPage: integer('current_page').notNull(),
  totalPages: integer('total_pages').notNull(),
  progressPercentage: integer('progress_percentage').notNull(),
  lastReadAt: timestamp('last_read_at').defaultNow(),
});

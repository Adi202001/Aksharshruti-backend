import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Users Table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  penName: varchar('pen_name', { length: 100 }),
  bio: text('bio'),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  location: varchar('location', { length: 100 }),
  website: varchar('website', { length: 255 }),
  joinedDate: timestamp('joined_date').defaultNow(),
  lastActive: timestamp('last_active').defaultNow(),
  isVerified: boolean('is_verified').default(false),
  accountStatus: varchar('account_status', { length: 20 }).default('active')
    .$type<'active' | 'suspended' | 'deleted'>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// User Preferences
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  languages: jsonb('languages').default(sql`'[]'::jsonb`),
  genres: jsonb('genres').default(sql`'[]'::jsonb`),
  showExplicitContent: boolean('show_explicit_content').default(true),
  hideMatureThemes: boolean('hide_mature_themes').default(false),
  postViewMode: varchar('post_view_mode', { length: 20 }).default('detailed')
    .$type<'compact' | 'detailed'>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// User Settings
export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  // Notification Settings
  pushNotifications: boolean('push_notifications').default(true),
  emailNotifications: boolean('email_notifications').default(true),
  likesNotifications: boolean('likes_notifications').default(true),
  commentsNotifications: boolean('comments_notifications').default(true),
  followersNotifications: boolean('followers_notifications').default(true),
  mentionsNotifications: boolean('mentions_notifications').default(true),
  repostsNotifications: boolean('reposts_notifications').default(false),
  eventsNotifications: boolean('events_notifications').default(true),
  collectionsNotifications: boolean('collections_notifications').default(true),
  messagesNotifications: boolean('messages_notifications').default(true),
  // Privacy Settings
  privateAccount: boolean('private_account').default(false),
  showActivityStatus: boolean('show_activity_status').default(true),
  allowMessagesFrom: varchar('allow_messages_from', { length: 20 }).default('everyone')
    .$type<'everyone' | 'followers' | 'nobody'>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Connected Accounts
export const connectedAccounts = pgTable('connected_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 20 }).notNull()
    .$type<'google' | 'facebook' | 'apple'>(),
  providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  connectedAt: timestamp('connected_at').defaultNow(),
  lastSynced: timestamp('last_synced').defaultNow(),
});

// User Stats (Cached)
export const userStats = pgTable('user_stats', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  postsCount: integer('posts_count').default(0),
  followersCount: integer('followers_count').default(0),
  followingCount: integer('following_count').default(0),
  totalLikesReceived: integer('total_likes_received').default(0),
  totalViews: integer('total_views').default(0),
  lastUpdated: timestamp('last_updated').defaultNow(),
});

// Refresh Tokens (for JWT refresh token rotation)
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  isRevoked: boolean('is_revoked').default(false),
});

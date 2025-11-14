import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';

// Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  notificationType: varchar('notification_type', { length: 30 }).notNull()
    .$type<'like' | 'comment' | 'follow' | 'mention' | 'repost' | 'event' | 'collection'>(),
  entityType: varchar('entity_type', { length: 20 }).notNull()
    .$type<'post' | 'comment' | 'user' | 'event' | 'collection'>(),
  entityId: uuid('entity_id').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Reports
export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reporterId: uuid('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entityType: varchar('entity_type', { length: 20 }).notNull()
    .$type<'post' | 'comment' | 'user' | 'event'>(),
  entityId: uuid('entity_id').notNull(),
  reason: varchar('reason', { length: 30 }).notNull()
    .$type<'spam' | 'harassment' | 'inappropriate' | 'copyright' | 'other'>(),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('pending')
    .$type<'pending' | 'reviewed' | 'resolved' | 'dismissed'>(),
  createdAt: timestamp('created_at').defaultNow(),
  resolvedAt: timestamp('resolved_at'),
});

// Support Tickets
export const supportTickets = pgTable('support_tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  email: varchar('email', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  message: text('message').notNull(),
  status: varchar('status', { length: 20 }).default('open')
    .$type<'open' | 'in_progress' | 'resolved' | 'closed'>(),
  priority: varchar('priority', { length: 20 }).default('medium')
    .$type<'low' | 'medium' | 'high'>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// App Feedback
export const appFeedback = pgTable('app_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  feedbackType: varchar('feedback_type', { length: 30 }).notNull()
    .$type<'bug' | 'feature_request' | 'general'>(),
  message: text('message').notNull(),
  screenshotUrl: varchar('screenshot_url', { length: 500 }),
  deviceInfo: jsonb('device_info'),
  createdAt: timestamp('created_at').defaultNow(),
});

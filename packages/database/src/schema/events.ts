import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

// Events
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  hostId: uuid('host_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  eventType: varchar('event_type', { length: 20 }).notNull()
    .$type<'video' | 'audio' | 'text'>(),
  coverImageUrl: varchar('cover_image_url', { length: 500 }),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  status: varchar('status', { length: 20 }).default('scheduled')
    .$type<'scheduled' | 'live' | 'ended' | 'cancelled'>(),
  maxParticipants: integer('max_participants'),
  isPrivate: boolean('is_private').default(false),
  tags: jsonb('tags').default(sql`'[]'::jsonb`),
  livekitRoomName: varchar('livekit_room_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Event Participants
export const eventParticipants = pgTable('event_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull()
    .$type<'host' | 'speaker' | 'attendee'>(),
  isMuted: boolean('is_muted').default(false),
  joinedAt: timestamp('joined_at').defaultNow(),
  leftAt: timestamp('left_at'),
});

// Event Chat Messages
export const eventChatMessages = pgTable('event_chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Event Recordings
export const eventRecordings = pgTable('event_recordings', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  videoUrl: varchar('video_url', { length: 500 }).notNull(),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  durationSeconds: integer('duration_seconds'),
  viewCount: integer('view_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

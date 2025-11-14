import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  penName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url('Invalid URL format').optional().or(z.literal('')),
});

export const updatePreferencesSchema = z.object({
  languages: z.array(z.string()).max(10).optional(),
  genres: z.array(z.string()).max(20).optional(),
  showExplicitContent: z.boolean().optional(),
  hideMatureThemes: z.boolean().optional(),
  postViewMode: z.enum(['compact', 'detailed']).optional(),
});

export const updateSettingsSchema = z.object({
  // Notification Settings
  pushNotifications: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  likesNotifications: z.boolean().optional(),
  commentsNotifications: z.boolean().optional(),
  followersNotifications: z.boolean().optional(),
  mentionsNotifications: z.boolean().optional(),
  repostsNotifications: z.boolean().optional(),
  eventsNotifications: z.boolean().optional(),
  collectionsNotifications: z.boolean().optional(),
  messagesNotifications: z.boolean().optional(),
  // Privacy Settings
  privateAccount: z.boolean().optional(),
  showActivityStatus: z.boolean().optional(),
  allowMessagesFrom: z.enum(['everyone', 'followers', 'nobody']).optional(),
});

// Types
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

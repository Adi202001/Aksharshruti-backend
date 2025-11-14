export type AccountStatus = 'active' | 'suspended' | 'deleted';
export type UserRole = 'user' | 'verified' | 'moderator' | 'admin';
export type PostViewMode = 'compact' | 'detailed';
export type AllowMessagesFrom = 'everyone' | 'followers' | 'nobody';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  penName?: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  website?: string;
  joinedDate: string;
  lastActive: string;
  isVerified: boolean;
  accountStatus: AccountStatus;
}

export interface UserProfile extends User {
  stats?: UserStats;
  preferences?: UserPreferences;
  settings?: UserSettings;
}

export interface UserStats {
  postsCount: number;
  followersCount: number;
  followingCount: number;
  totalLikesReceived: number;
  totalViews: number;
}

export interface UserPreferences {
  languages: string[];
  genres: string[];
  showExplicitContent: boolean;
  hideMatureThemes: boolean;
  postViewMode: PostViewMode;
}

export interface UserSettings {
  // Notification Settings
  pushNotifications: boolean;
  emailNotifications: boolean;
  likesNotifications: boolean;
  commentsNotifications: boolean;
  followersNotifications: boolean;
  mentionsNotifications: boolean;
  repostsNotifications: boolean;
  eventsNotifications: boolean;
  collectionsNotifications: boolean;
  messagesNotifications: boolean;

  // Privacy Settings
  privateAccount: boolean;
  showActivityStatus: boolean;
  allowMessagesFrom: AllowMessagesFrom;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

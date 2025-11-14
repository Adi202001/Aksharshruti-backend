import { DbClient, schema } from '@aksharshruti/database';
import { eq, and } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '@aksharshruti/shared';

export interface CreateUserInput {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

export interface UpdateUserInput {
  displayName?: string;
  penName?: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  website?: string;
}

export class UserService {
  constructor(private db: DbClient) {}

  async createUser(input: CreateUserInput) {
    // Check if email already exists
    const existingEmail = await this.db.query.users.findFirst({
      where: eq(schema.users.email, input.email),
    });

    if (existingEmail) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    // Check if username already exists
    const existingUsername = await this.db.query.users.findFirst({
      where: eq(schema.users.username, input.username),
    });

    if (existingUsername) {
      throw new Error('USERNAME_ALREADY_EXISTS');
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create user
    const [user] = await this.db
      .insert(schema.users)
      .values({
        email: input.email,
        passwordHash,
        username: input.username,
        displayName: input.displayName,
        accountStatus: 'active',
        isVerified: false,
      })
      .returning();

    // Create user preferences
    await this.db.insert(schema.userPreferences).values({
      userId: user.id,
    });

    // Create user settings
    await this.db.insert(schema.userSettings).values({
      userId: user.id,
    });

    // Create user stats
    await this.db.insert(schema.userStats).values({
      userId: user.id,
    });

    return user;
  }

  async getUserByEmail(email: string) {
    return await this.db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });
  }

  async getUserByUsername(username: string) {
    return await this.db.query.users.findFirst({
      where: eq(schema.users.username, username),
    });
  }

  async getUserById(userId: string) {
    return await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: {
        passwordHash: false, // Exclude password hash
      },
    });
  }

  async getUserWithStats(userId: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: {
        passwordHash: false,
      },
      with: {
        stats: true,
        preferences: true,
        settings: true,
      },
    });

    return user;
  }

  async verifyPassword(email: string, password: string) {
    const user = await this.getUserByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    return user;
  }

  async updateUser(userId: string, input: UpdateUserInput) {
    const [updatedUser] = await this.db
      .update(schema.users)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        username: schema.users.username,
        displayName: schema.users.displayName,
        penName: schema.users.penName,
        bio: schema.users.bio,
        avatarUrl: schema.users.avatarUrl,
        location: schema.users.location,
        website: schema.users.website,
        isVerified: schema.users.isVerified,
        accountStatus: schema.users.accountStatus,
        updatedAt: schema.users.updatedAt,
      });

    return updatedUser;
  }

  async updateLastActive(userId: string) {
    await this.db
      .update(schema.users)
      .set({ lastActive: new Date() })
      .where(eq(schema.users.id, userId));
  }

  async getUserPreferences(userId: string) {
    return await this.db.query.userPreferences.findFirst({
      where: eq(schema.userPreferences.userId, userId),
    });
  }

  async updateUserPreferences(
    userId: string,
    preferences: {
      languages?: string[];
      genres?: string[];
      showExplicitContent?: boolean;
      hideMatureThemes?: boolean;
      postViewMode?: 'compact' | 'detailed';
    }
  ) {
    const [updated] = await this.db
      .update(schema.userPreferences)
      .set({
        ...preferences,
        updatedAt: new Date(),
      })
      .where(eq(schema.userPreferences.userId, userId))
      .returning();

    return updated;
  }

  async getUserSettings(userId: string) {
    return await this.db.query.userSettings.findFirst({
      where: eq(schema.userSettings.userId, userId),
    });
  }

  async updateUserSettings(userId: string, settings: Partial<typeof schema.userSettings.$inferInsert>) {
    const [updated] = await this.db
      .update(schema.userSettings)
      .set({
        ...settings,
        updatedAt: new Date(),
      })
      .where(eq(schema.userSettings.userId, userId))
      .returning();

    return updated;
  }

  async getUserStats(userId: string) {
    return await this.db.query.userStats.findFirst({
      where: eq(schema.userStats.userId, userId),
    });
  }

  async deleteUser(userId: string) {
    // Soft delete by updating account status
    await this.db
      .update(schema.users)
      .set({
        accountStatus: 'deleted',
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId));
  }
}

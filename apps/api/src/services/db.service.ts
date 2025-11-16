import { createDbClient, DbClient } from '@aksharshruti/database';
import type { Env } from '../index';

// Singleton pattern for database client
let dbClient: DbClient | null = null;

export function getDb(env: Env): DbClient {
  if (!dbClient) {
    dbClient = createDbClient(env.DATABASE_URL);
  }
  return dbClient;
}

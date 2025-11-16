import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Create a function to get database client
// This allows for environment-specific configuration
export function createDbClient(connectionString: string) {
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

// Export types
export type DbClient = ReturnType<typeof createDbClient>;
export { schema };

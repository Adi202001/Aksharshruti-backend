import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('🔄 Running migrations...');

  const sql = neon(connectionString);
  const db = drizzle(sql);

  await migrate(db, { migrationsFolder: './migrations' });

  console.log('✅ Migrations completed successfully');
  process.exit(0);
}

runMigrations().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});

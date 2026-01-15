import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required");
  process.exit(1);
}

async function runMigrations(): Promise<void> {
  console.log("Starting database migrations...");

  const sql = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  try {
    await migrate(db, { migrationsFolder: "./src/migrations" });
    console.log("✅ Migrations completed successfully");

    // Check if __drizzle_migrations table exists
    const result = await sql<
      Array<{ count: string }>
    >`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = '__drizzle_migrations'`;
    console.log(`Migration tracking table exists: ${result[0]?.count === "1"}`);

    await sql.end();
    process.exit(0);
  } catch (error) {
    // TODO: Future enhancement - Add specific error handling for:
    // - Database connection failures (ECONNREFUSED, auth errors)
    // - SQL syntax errors in migration files
    // - Permission errors (insufficient privileges)
    // This would provide more actionable error messages for debugging.
    console.error("❌ Migration failed:");
    console.error(error);
    await sql.end();
    process.exit(1);
  }
}

runMigrations();

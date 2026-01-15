import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { validateJournalSync } from "../src/migration-validation.js";

// ES module equivalents for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

async function runMigrations(): Promise<void> {
  console.log("Starting database migrations...");

  // Check DATABASE_URL environment variable
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("ERROR: DATABASE_URL environment variable is required");
    process.exit(1);
  }

  // Check for --skip-validation flag
  const skipValidation = process.argv.includes("--skip-validation");

  if (skipValidation) {
    console.warn("⚠️  WARNING: Skipping journal sync validation (--skip-validation flag)");
  } else {
    // Validate journal sync before connecting to database
    const migrationsPath = join(__dirname, "../src/migrations");
    const validation = validateJournalSync(migrationsPath);

    if (!validation.valid) {
      console.error("❌ Migration validation failed:");
      console.error(`   ${validation.message}`);
      console.error("");
      console.error("Details:");
      console.error(`   SQL files:       ${validation.sqlCount}`);
      console.error(`   Journal entries: ${validation.journalCount}`);
      console.error("");
      console.error("This usually means migration files were created but not registered.");
      console.error("To fix this, run:");
      console.error("");
      console.error("   pnpm --filter @raptscallions/db db:generate");
      console.error("");
      console.error("If you need to bypass this check (emergency only), use:");
      console.error("   pnpm --filter @raptscallions/db db:migrate --skip-validation");
      process.exit(1);
    }

    console.log(`✅ ${validation.message}`);
  }

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

// Run migrations (this is a script file, not a library module)
runMigrations();

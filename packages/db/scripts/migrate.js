import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dotenv from "dotenv";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
// Load environment variables
dotenv.config();
/**
 * Validates that all SQL migration files are registered in Drizzle's _journal.json
 * This prevents silent failures where migration files exist but aren't tracked
 *
 * @param migrationsDir - Optional path to migrations directory (for testing)
 * @returns ValidationResult with valid flag, message, and counts
 */
export function validateJournalSync(migrationsDir) {
    const migrationsDirPath = migrationsDir || join(__dirname, "../src/migrations");
    const journalPath = join(migrationsDirPath, "meta/_journal.json");
    // Count SQL migration files (excluding meta directory)
    let sqlFiles;
    try {
        sqlFiles = readdirSync(migrationsDirPath)
            .filter((file) => {
            // Only count .sql files in the root migrations directory
            // Ignore meta directory and non-SQL files
            return file.endsWith(".sql");
        })
            .sort();
    }
    catch (error) {
        // Handle case where migrations directory doesn't exist
        return {
            valid: false,
            message: `Failed to read migrations directory: ${error instanceof Error ? error.message : String(error)}`,
            sqlCount: 0,
            journalCount: 0,
        };
    }
    const sqlCount = sqlFiles.length;
    // Parse journal entries
    let journalCount = 0;
    try {
        const journalContent = readFileSync(journalPath, "utf-8");
        const journal = JSON.parse(journalContent);
        journalCount = journal.entries.length;
    }
    catch (error) {
        // Handle edge case: fresh database with no migrations yet
        if (sqlCount === 0) {
            return {
                valid: true,
                message: "No migrations found (fresh database)",
                sqlCount: 0,
                journalCount: 0,
            };
        }
        // Journal file missing or corrupted with SQL files present
        return {
            valid: false,
            message: `Failed to read journal file: ${error instanceof Error ? error.message : String(error)}`,
            sqlCount,
            journalCount: 0,
        };
    }
    // Compare counts
    if (sqlCount === journalCount) {
        // Special case: both are 0 (fresh database)
        if (sqlCount === 0) {
            return {
                valid: true,
                message: "No migrations found (fresh database)",
                sqlCount: 0,
                journalCount: 0,
            };
        }
        return {
            valid: true,
            message: `Journal in sync (${sqlCount} migrations)`,
            sqlCount,
            journalCount,
        };
    }
    // Mismatch detected
    return {
        valid: false,
        message: `Journal out of sync: ${sqlCount} SQL files but ${journalCount} journal entries`,
        sqlCount,
        journalCount,
    };
}
async function runMigrations() {
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
    }
    else {
        // Validate journal sync before connecting to database
        const validation = validateJournalSync();
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
        const result = await sql `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = '__drizzle_migrations'`;
        console.log(`Migration tracking table exists: ${result[0]?.count === "1"}`);
        await sql.end();
        process.exit(0);
    }
    catch (error) {
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
// Only run migrations if this script is executed directly (not imported)
if (require.main === module) {
    runMigrations();
}
//# sourceMappingURL=migrate.js.map
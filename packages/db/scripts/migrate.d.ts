export interface ValidationResult {
    valid: boolean;
    message: string;
    sqlCount: number;
    journalCount: number;
}
/**
 * Validates that all SQL migration files are registered in Drizzle's _journal.json
 * This prevents silent failures where migration files exist but aren't tracked
 *
 * @param migrationsDir - Optional path to migrations directory (for testing)
 * @returns ValidationResult with valid flag, message, and counts
 */
export declare function validateJournalSync(migrationsDir?: string): ValidationResult;
//# sourceMappingURL=migrate.d.ts.map
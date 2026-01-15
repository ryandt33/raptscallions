import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is required for migrations"
  );
}

export default {
  schema: [
    "./dist/schema/types.js",
    "./dist/schema/users.js",
    "./dist/schema/groups.js",
    "./dist/schema/group-members.js",
    "./dist/schema/sessions.js",
    "./dist/schema/classes.js",
    "./dist/schema/class-members.js",
    "./dist/schema/tools.js",
    "./dist/schema/chat-sessions.js",
    "./dist/schema/messages.js",
    "./dist/schema/files.js",
    "./dist/schema/user-storage-limits.js",
  ],
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
} satisfies Config;

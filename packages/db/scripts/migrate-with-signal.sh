#!/bin/bash
set -e

# Run migrations
pnpm db:migrate

# Verify migration completed successfully (check exit code)
if [ $? -eq 0 ]; then
  touch /tmp/migration-complete
  echo "Migrations completed successfully"
else
  echo "Migration failed with exit code $?"
  exit 1
fi

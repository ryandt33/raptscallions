#!/bin/bash
#
# Commit Message Helper Script
# Helps format commit messages according to project conventions
#
# Usage:
#   ./scripts/commit-msg-helper.sh
#   OR
#   npm run commit-helper (if added to package.json)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Raptscallions Commit Message Helper  ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Commit types
echo -e "${GREEN}Available commit types:${NC}"
echo "  1) feat     - New feature"
echo "  2) fix      - Bug fix"
echo "  3) refactor - Code refactoring"
echo "  4) test     - Add/update tests"
echo "  5) docs     - Documentation"
echo "  6) chore    - Maintenance"
echo "  7) perf     - Performance"
echo "  8) ci       - CI/CD changes"
echo ""
read -p "Select type (1-8): " type_choice

case $type_choice in
  1) TYPE="feat";;
  2) TYPE="fix";;
  3) TYPE="refactor";;
  4) TYPE="test";;
  5) TYPE="docs";;
  6) TYPE="chore";;
  7) TYPE="perf";;
  8) TYPE="ci";;
  *) echo -e "${RED}Invalid choice${NC}"; exit 1;;
esac

# Scopes
echo ""
echo -e "${GREEN}Common scopes:${NC}"
echo "  1) auth     - Authentication"
echo "  2) chat     - Chat/conversation"
echo "  3) api      - API layer"
echo "  4) db       - Database"
echo "  5) ui       - User interface"
echo "  6) module   - Module system"
echo "  7) test     - Testing"
echo "  8) workflow - Task workflow"
echo "  9) custom   - Enter custom scope"
echo "  0) none     - No scope"
echo ""
read -p "Select scope (0-9): " scope_choice

case $scope_choice in
  1) SCOPE="auth";;
  2) SCOPE="chat";;
  3) SCOPE="api";;
  4) SCOPE="db";;
  5) SCOPE="ui";;
  6) SCOPE="module";;
  7) SCOPE="test";;
  8) SCOPE="workflow";;
  9) read -p "Enter custom scope: " SCOPE;;
  0) SCOPE="";;
  *) echo -e "${RED}Invalid choice${NC}"; exit 1;;
esac

# Subject
echo ""
read -p "Enter commit subject (short description): " SUBJECT

if [ -z "$SUBJECT" ]; then
  echo -e "${RED}Subject cannot be empty${NC}"
  exit 1
fi

# Body (optional)
echo ""
echo -e "${YELLOW}Enter commit body (optional, press Ctrl+D when done):${NC}"
BODY=$(cat)

# Task reference
echo ""
read -p "Enter task reference (e.g., E01-T001) or leave empty: " TASK_REF

# Build commit message
if [ -n "$SCOPE" ]; then
  COMMIT_MSG="$TYPE($SCOPE): $SUBJECT"
else
  COMMIT_MSG="$TYPE: $SUBJECT"
fi

if [ -n "$BODY" ]; then
  COMMIT_MSG="$COMMIT_MSG

$BODY"
fi

if [ -n "$TASK_REF" ]; then
  COMMIT_MSG="$COMMIT_MSG

Refs: $TASK_REF"
fi

# Add co-author (Claude)
COMMIT_MSG="$COMMIT_MSG

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Preview
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Preview:${NC}"
echo -e "${BLUE}========================================${NC}"
echo "$COMMIT_MSG"
echo -e "${BLUE}========================================${NC}"
echo ""

# Confirm
read -p "Use this commit message? (y/n): " confirm

if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
  # Stage changes if not already staged
  if [ -z "$(git diff --cached --name-only)" ]; then
    echo ""
    echo -e "${YELLOW}No files staged. Staging all changes...${NC}"
    git add -A
  fi

  # Commit with message
  git commit -m "$COMMIT_MSG"
  echo ""
  echo -e "${GREEN}✓ Commit created successfully!${NC}"
else
  echo -e "${RED}Commit cancelled${NC}"
  exit 1
fi

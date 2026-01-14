# Scripts Directory

Utility scripts for RaptScallions development and workflow automation.

## Available Scripts

### Commit Message Helper

**File:** `commit-msg-helper.sh`

Interactive script to help format commit messages according to project conventions.

**Usage:**

```bash
./scripts/commit-msg-helper.sh
```

**Features:**

- Prompts for commit type (feat, fix, refactor, etc.)
- Prompts for scope (auth, chat, api, etc.)
- Prompts for subject and body
- Prompts for task reference (Epic/Task ID)
- Automatically adds Co-Authored-By tag
- Shows preview before committing
- Stages and commits changes

**Example Output:**

```
feat(auth): implement OAuth providers

- Add Google OAuth provider
- Add Microsoft OAuth provider
- Add Clever OAuth provider

Refs: E01-T002

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Orchestrator (Task Workflow)

**File:** `orchestrator.ts`

Task workflow orchestrator for automated development cycles.

**Usage:**

```bash
# Run workflow (auto mode)
pnpm workflow:run

# Check status
pnpm workflow:status

# Get next task
pnpm workflow:next

# Set breakpoint
pnpm workflow:breakpoint

# Help
pnpm workflow:help
```

See [Backlog.md MCP documentation](../backlog/README.md) for details.

## Installing Git Hooks

### Pre-commit Hook

The pre-commit hook runs type checking, linting, and tests before allowing commits.

**Install:**

```bash
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Bypass (not recommended):**

```bash
git commit --no-verify
```

### Automated Hook Installation

Add to `package.json`:

```json
{
  "scripts": {
    "postinstall": "cp .github/hooks/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit"
  }
}
```

This will automatically install the hook when running `pnpm install`.

## Adding New Scripts

When adding new scripts:

1. **Create script file:**

   ```bash
   touch scripts/my-script.sh
   chmod +x scripts/my-script.sh
   ```

2. **Add shebang:**

   ```bash
   #!/bin/bash
   set -e  # Exit on error
   ```

3. **Add to package.json:**

   ```json
   {
     "scripts": {
       "my-script": "bash scripts/my-script.sh"
     }
   }
   ```

4. **Document in this README**

5. **Follow conventions:**
   - Use kebab-case for filenames
   - Add usage comments at top of file
   - Use colors for output (see examples)
   - Handle errors gracefully
   - Add to `.github/SETUP.md` if user-facing

## Script Conventions

### Output Colors

Use these color codes for consistent output:

```bash
RED='\033[0;31m'      # Errors
GREEN='\033[0;32m'    # Success
YELLOW='\033[1;33m'   # Warnings/Info
BLUE='\033[0;34m'     # Headers
NC='\033[0m'          # No Color (reset)
```

**Example:**

```bash
echo -e "${GREEN}✓ Success${NC}"
echo -e "${RED}✗ Error${NC}"
echo -e "${YELLOW}→ Running...${NC}"
```

### Error Handling

Always use `set -e` to exit on errors:

```bash
#!/bin/bash
set -e

command1 || { echo "Error"; exit 1; }
command2
```

### Help Text

Include help text for complex scripts:

```bash
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
  cat << EOF
Usage: $0 [options]

Options:
  -h, --help     Show this help
  -v, --verbose  Verbose output

Examples:
  $0
  $0 --verbose
EOF
  exit 0
fi
```

## CI/CD Integration

Some scripts are used in GitHub Actions workflows:

- **Type checking:** `pnpm typecheck` (used in `.github/workflows/ci.yml`)
- **Linting:** `pnpm lint` (used in `.github/workflows/ci.yml`)
- **Testing:** `pnpm test` (used in `.github/workflows/ci.yml`)
- **Building:** `pnpm build` (used in `.github/workflows/ci.yml`)

See [.github/SETUP.md](../.github/SETUP.md) for CI/CD configuration details.

## Troubleshooting

### "Permission denied" Error

Make script executable:

```bash
chmod +x scripts/my-script.sh
```

### Script Not Found

Ensure you're in project root:

```bash
cd /path/to/raptscallions
./scripts/my-script.sh
```

### Hook Not Running

Check hook is installed and executable:

```bash
ls -la .git/hooks/pre-commit
# Should show: -rwxr-xr-x
```

Re-install if needed:

```bash
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

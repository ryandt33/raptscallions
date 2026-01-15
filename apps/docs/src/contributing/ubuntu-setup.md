---
title: Ubuntu Setup Guide
description: Complete guide to setting up the RaptScallions development environment on Ubuntu
---

# Ubuntu Setup Guide

This guide walks you through setting up the complete RaptScallions development environment on a fresh Ubuntu system. You'll install all prerequisites, configure the database, and get the project running locally.

## Prerequisites

Before starting, you'll need:

- Ubuntu 20.04+ (tested on Ubuntu 22.04)
- Terminal access with sudo privileges
- Internet connection for downloading packages

## Step 1: Install Node.js with nvm

We use Node.js 20 LTS managed by nvm (Node Version Manager) for easy version switching.

### Install nvm

```bash
# Download and install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell configuration
source ~/.bashrc

# Verify nvm installation
nvm --version
```

### Install Node.js 20

```bash
# Install Node.js 20 LTS
nvm install 20

# Set Node.js 20 as default
nvm alias default 20

# Use Node.js 20
nvm use 20

# Verify installation
node --version  # Should show v20.x.x
```

::: tip Using nvm
If you're using a different shell (zsh, fish), replace `~/.bashrc` with your shell's config file (`~/.zshrc`, `~/.config/fish/config.fish`).
:::

## Step 2: Install pnpm

RaptScallions uses pnpm (not npm or yarn) for package management.

```bash
# Install pnpm globally
npm install -g pnpm@9.15.0

# Verify installation
pnpm --version  # Should show 9.15.0
```

::: info Why pnpm?
pnpm is faster and more disk-efficient than npm, and it enforces stricter dependency resolution. It's required for this monorepo.
:::

## Step 3: Install Docker and Docker Compose

Docker runs PostgreSQL and Redis for local development.

### Install Docker Engine

```bash
# Update package index
sudo apt-get update

# Install prerequisites
sudo apt-get install -y \
  ca-certificates \
  curl \
  gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and Docker Compose
sudo apt-get update
sudo apt-get install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### Configure Docker Permissions

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Apply group changes (or log out and back in)
newgrp docker

# Test Docker without sudo
docker run hello-world
```

::: warning Logout Required
After adding yourself to the docker group, you may need to log out and back in for the changes to take effect fully.
:::

## Step 4: Clone and Setup the Project

### Clone the Repository

```bash
# Clone the repository
git clone https://github.com/ryandt33/raptscallions.git
cd raptscallions
```

### Create Environment File

```bash
# Copy the example environment file
cp .env.example .env
```

The default `.env` file contains sensible defaults for local development. The key settings are:

- **DATABASE_URL**: PostgreSQL connection on port 5433 (to avoid conflicts)
- **REDIS_URL**: Redis connection on default port 6379
- **SESSION_SECRET**: Development secret (change for production)
- **AI_API_KEY**: Optional - only needed for AI features

::: tip Environment Variables
For local development, the default `.env` values work out of the box. You only need to change them if you have port conflicts or want to use OAuth/AI features.
:::

### Install Dependencies

```bash
# Load nvm (required for each new terminal session)
source ~/.nvm/nvm.sh

# Install all project dependencies
pnpm install
```

This installs 610+ packages across all workspace projects. It takes 2-3 minutes on first run.

## Step 5: Start Database Services

### Start PostgreSQL and Redis

```bash
# Start database services in the background
docker compose up -d postgres redis

# Wait a few seconds for services to start
sleep 5

# Verify services are running
docker compose ps
```

You should see both `raptscallions-postgres` and `raptscallions-redis` with status "Up" and "healthy".

::: info Port Configuration
PostgreSQL runs on port **5433** (not 5432) to avoid conflicts with existing PostgreSQL installations. This is configured in the `.env` file.
:::

### Run Database Migrations

```bash
# Load environment variables and run migrations
export $(cat .env | grep -v '^#' | xargs)
cd packages/db
pnpm db:migrate
cd ../..
```

You should see:

```
Starting database migrations...
✅ Migrations completed successfully
```

## Step 6: Build the Project

```bash
# Build all packages
pnpm build
```

This compiles TypeScript for all packages in the monorepo. It takes 1-2 minutes on first build.

## Step 7: Verify Setup

### Run Type Checking

```bash
# Run TypeScript type checking
pnpm typecheck
```

All packages should pass type checking with zero errors.

### Run Linting

```bash
# Run ESLint across all packages
pnpm lint
```

All packages should pass linting with zero warnings.

### Check Docker Services

```bash
# View Docker container status
docker compose ps

# View Docker logs
docker compose logs postgres
docker compose logs redis
```

Both services should be healthy and running without errors.

## Step 8: Start Development Servers

### Start All Development Servers

```bash
# Load nvm (if starting in a new terminal)
source ~/.nvm/nvm.sh

# Start all dev servers in parallel
pnpm dev
```

This starts:

- **API Server** on `http://localhost:3000`
- **Web Frontend** on `http://localhost:5173`
- **Worker** (background job processor)

::: tip First Run
On first run, the servers may take 10-20 seconds to compile and start. Watch the terminal output for "Server listening" messages.
:::

### Verify Services

Open your browser and check:

- API Health: `http://localhost:3000/health`
- Web App: `http://localhost:5173`

You should see:

- API returns `{"status":"ok"}`
- Web app shows the RaptScallions landing page

## Common Commands

### Development

```bash
# Start all dev servers
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Run linting
pnpm lint

# Fix linting errors
pnpm lint:fix
```

### Docker Management

```bash
# Start database services
pnpm docker:up

# Stop database services
pnpm docker:down

# View logs
pnpm docker:logs

# Restart services
pnpm docker:restart

# Clean all data and images
pnpm docker:clean
```

### Database Management

```bash
# Run migrations
cd packages/db && pnpm db:migrate

# Reset database (drop and recreate)
cd packages/db && pnpm db:push

# View database in CLI
docker exec -it raptscallions-postgres psql -U raptscallions -d raptscallions
```

### Documentation

```bash
# Start docs development server
pnpm docs:dev

# Build docs for production
pnpm docs:build

# Preview production docs build
pnpm docs:preview
```

## Troubleshooting

### Node.js Not Found

**Symptom:** `command not found: node`

**Cause:** nvm not loaded in current shell session

**Solution:**

```bash
# Load nvm
source ~/.nvm/nvm.sh

# Or add to your shell config to load automatically
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
source ~/.bashrc
```

### Docker Permission Denied

**Symptom:** `permission denied while trying to connect to the Docker daemon socket`

**Cause:** User not in docker group or group changes not applied

**Solution:**

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Apply changes (or log out and back in)
newgrp docker

# Test
docker ps
```

### Port Already in Use

**Symptom:** `Error: listen EADDRINUSE: address already in use :::5432`

**Cause:** PostgreSQL already running on port 5432

**Solution:**

The default `.env` uses port 5433 to avoid this. If you still have conflicts:

```bash
# Check what's using the port
sudo lsof -i :5432
sudo lsof -i :5433

# Either stop the conflicting service or change the port in .env
# Edit .env and change POSTGRES_PORT to an unused port
```

### Database Connection Failed

**Symptom:** `Error: connect ECONNREFUSED 127.0.0.1:5433`

**Cause:** PostgreSQL container not running or not healthy

**Solution:**

```bash
# Check container status
docker compose ps

# View container logs
docker compose logs postgres

# Restart container
docker compose restart postgres

# Wait for health check
sleep 10
docker compose ps
```

### Migrations Fail with "DATABASE_URL Required"

**Symptom:** `ERROR: DATABASE_URL environment variable is required`

**Cause:** Environment variables not loaded

**Solution:**

```bash
# Load .env file before running migrations
export $(cat .env | grep -v '^#' | xargs)
cd packages/db
pnpm db:migrate
```

### pnpm Version Mismatch

**Symptom:** `ERR_PNPM_UNSUPPORTED_ENGINE Unsupported package manager version`

**Cause:** Wrong pnpm version installed

**Solution:**

```bash
# Install exact version required
npm uninstall -g pnpm
npm install -g pnpm@9.15.0

# Verify
pnpm --version
```

## Next Steps

Now that your environment is set up:

1. **Explore the codebase** — Check out the monorepo structure in `apps/` and `packages/`
2. **Read the docs** — Visit `http://localhost:5173` (when running `pnpm docs:dev`)
3. **Make changes** — Try editing a file and see hot-reload in action
4. **Run tests** — Execute `pnpm test` to run the test suite
5. **Check the backlog** — Browse `backlog/tasks/` to see what's being worked on

## Related Pages

- [Contributing Overview](/contributing/)
- [Documentation Guide](/contributing/documentation)
- [CI Validation](/contributing/ci-validation)

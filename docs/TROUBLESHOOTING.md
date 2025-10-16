# Troubleshooting Guide

Common issues and their solutions.

## Table of Contents

1. [Setup Issues](#setup-issues)
2. [Development Issues](#development-issues)
3. [Firebase Issues](#firebase-issues)
4. [Build & Deployment Issues](#build--deployment-issues)

## Setup Issues

### Node.js Version Error

**Error**: `Node.js 18 or higher is required`

**Solution**:
```bash
# Check current version
node --version

# Install Node.js 18+ from https://nodejs.org/
# Then verify
node --version
```

### Firebase CLI Not Installed

**Error**: `Firebase CLI is not installed`

**Solution**:
```bash
# Install globally
npm install -g firebase-tools

# Verify installation
firebase --version
```

### Dependencies Installation Fails

**Error**: `Failed to install npm dependencies`

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and lock file
rm -rf node_modules package-lock.json
rm -rf apps/web/node_modules
rm -rf apps/functions/node_modules

# Reinstall
npm install
```

## Development Issues

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3004`

**Solution (Windows)**:
```bash
# Find process using port
netstat -ano | findstr ":3004"

# Kill process by PID
taskkill /PID <PID> /F

# Or use the stop script
npm run e2e:stop
```

**Solution (Mac/Linux)**:
```bash
# Find and kill process
lsof -ti:3004 | xargs kill -9

# Or use the stop script
npm run e2e:stop
```

### Services Won't Start

**Issue**: `npm run dev:all` fails

**Solution**:
```bash
# 1. Stop all services
npm run e2e:stop

# 2. Check health
npm run e2e:health

# 3. Check ports are free
# Windows
netstat -ano | findstr ":3004 :9099 :8080 :5001"

# Mac/Linux
lsof -i :3004 -i :9099 -i :8080 -i :5001

# 4. Start services again
npm run dev:all
```

### Environment Variables Not Loading

**Issue**: `.env.local` changes not reflected

**Solution**:
```bash
# 1. Verify .env.local exists
ls apps/web/.env.local

# 2. Restart Next.js dev server
# Stop with Ctrl+C, then:
npm run dev:all

# 3. Check for typos in variable names
# Must start with NEXT_PUBLIC_ for client-side access
```

## Firebase Issues

### Emulator Connection Refused

**Error**: `ECONNREFUSED localhost:8080`

**Solution**:
```bash
# 1. Check emulators are running
npm run e2e:health

# 2. Check firebase.json emulator ports
cat firebase.json | grep -A 20 "emulators"

# 3. Restart emulators
firebase emulators:start
```

### ConfigService Validation Failed

**Error**: `Configuration validation failed`

**Solution**:
```bash
# 1. Check .env.local has required variables
cat apps/web/.env.local

# 2. Ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID is set
# Minimum required:
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id

# 3. For production, also need:
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
```

### Functions Emulator 404

**Error**: `404 Not Found` when calling functions

**Solution**:
```bash
# 1. Check functions are deployed to emulator
# Look for this in terminal:
# ✔  functions: Loaded functions definitions from source

# 2. Verify function name and URL format
# Should be: http://localhost:5001/{project-id}/us-central1/{functionName}

# 3. Check ConfigService is returning correct baseUrl
# Look for this log:
# API Base URL: http://localhost:5001/{project-id}/us-central1
```

## Build & Deployment Issues

### TypeScript Build Errors

**Error**: TypeScript compilation errors

**Solution**:
```bash
# 1. Check TypeScript version
npm list typescript

# 2. Run type check
npm run typecheck

# 3. Rebuild shared packages
npm run build --workspace=packages/shared-types

# 4. Clear Next.js cache
rm -rf apps/web/.next
npm run build
```

### Firebase Deployment Fails

**Error**: `HTTP Error: 403, The caller does not have permission`

**Solution**:
```bash
# 1. Check you're logged in
firebase login

# 2. Check project is set
firebase projects:list
firebase use <your-project-id>

# 3. Verify IAM permissions in Firebase Console
# Your account needs these roles:
# - Firebase Admin
# - Cloud Functions Admin (for functions)
# - Firebase Hosting Admin (for hosting)
```

### CI/CD Pipeline Fails

**Error**: GitHub Actions workflow fails

**Solution**:
```bash
# 1. Check GitHub Secrets are set
# Go to: Settings → Secrets and variables → Actions
# Required: FIREBASE_SERVICE_ACCOUNT

# 2. Verify service account JSON is valid
# Download from Firebase Console → Project Settings → Service Accounts

# 3. Check workflow file syntax
cat .github/workflows/ci-testing.yml
cat .github/workflows/deploy.yml

# 4. Run tests locally first
npm run typecheck
npm run lint
npm test
npm run build:all
```

## Getting More Help

### Enable Debug Logging

```bash
# Firebase debug logs
DEBUG=* firebase emulators:start

# Next.js debug logs
NODE_OPTIONS='--inspect' npm run dev
```

### Common Log Files

- **Firebase Emulator Logs**: Check terminal where `npm run dev:all` is running
- **Next.js Logs**: Check browser console and terminal
- **Build Logs**: `.next/` directory (don't commit this!)

### Community Support

- [Firebase Support](https://firebase.google.com/support)
- [Next.js Discussions](https://github.com/vercel/next.js/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/firebase+nextjs)

### Report Issues

If you find a bug in this template:
1. Check if issue already exists
2. Create a new GitHub issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)

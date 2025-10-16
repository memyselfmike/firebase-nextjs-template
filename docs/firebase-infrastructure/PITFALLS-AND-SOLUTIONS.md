# Firebase Infrastructure: Common Pitfalls and Solutions

**A comprehensive catalog of Firebase + Next.js challenges and their solutions**

**Version:** 1.0
**Last Updated:** 2025-10-16
**Based On:** SavvyProxy Epic 4 - Real-world problems and solutions

---

## Table of Contents

1. [Overview](#overview)
2. [Firebase Emulator Configuration Pitfalls](#firebase-emulator-configuration-pitfalls)
3. [Firebase Project Structure Pitfalls](#firebase-project-structure-pitfalls)
4. [CI/CD Pitfalls](#cicd-pitfalls)
5. [Testing Pitfalls](#testing-pitfalls)
6. [Quick Reference](#quick-reference)

---

## Overview

This document catalogs **all major Firebase infrastructure challenges** encountered during Epic 4 (Firebase Infrastructure Modernization) and provides actionable solutions. Each pitfall follows this structure:

- **Problem**: What went wrong
- **Impact**: How it affected development
- **Solution**: How to fix it
- **Prevention**: How to avoid it in the future
- **Code Examples**: Actual fixes from our codebase

**Total Pitfalls Documented:** 18

**Estimated Time Savings:** Following these solutions can save **10-20 hours per project** by avoiding known issues.

---

## Firebase Emulator Configuration Pitfalls

### Pitfall 1: Hardcoded Emulator Ports

**Problem:**
Emulator ports were hardcoded in multiple locations throughout the codebase:
- API route files: `http://localhost:5001`
- Firebase initialization: `connectFirestoreEmulator(db, 'localhost', 8081)`
- Test files: `FIRESTORE_EMULATOR_HOST=localhost:8080`
- Scripts: `curl http://localhost:5002`

When emulator ports changed (e.g., Firestore moved from 8081 to 8080), developers had to manually update 7+ files.

**Impact:**
- **30-60 minutes wasted per configuration change**
- **3-5 port-related bugs per month**
- Developer frustration and reduced productivity
- BUG-005: CSV import failure traced to three separate hardcoded port locations

**Solution:**
Implement ConfigService singleton pattern to centralize all configuration:

```typescript
// ✅ CORRECT: Use ConfigService
import { getConfig } from '@/config';

const config = getConfig();
const emulators = config.getEmulatorConfig();

if (emulators) {
  connectFirestoreEmulator(db, emulators.firestore.host, emulators.firestore.port);
}
```

```typescript
// ❌ INCORRECT: Hardcoded ports
connectFirestoreEmulator(db, 'localhost', 8080);  // DON'T DO THIS!
```

**Prevention:**
- Establish coding standard: "Never hardcode Firebase ports"
- Add ESLint rule to detect hardcoded ports
- Code review checklist: "Check for hardcoded configuration"
- Use ConfigService from day one of project

**References:**
- Story 4.1: Centralized Configuration Module
- `apps/web/src/config/firebase-config.ts:189-247`

---

### Pitfall 2: Port Conflicts (8080 vs 8081, 5001 vs 5002)

**Problem:**
Firestore emulator default port changed between Firebase CLI versions, or documentation used different ports than actual configuration:
- `firebase.json` defined Firestore port: `8081`
- Application code expected port: `8080`
- Environment variable set to: `8081`
- Actual emulator running on: `8080`

This created **port mismatch chaos** where different parts of the system expected different ports.

**Impact:**
- Connection timeouts: "ECONNREFUSED"
- Intermittent test failures
- "Firestore emulator not running" errors even when it was running
- 2-3 hours debugging per occurrence

**Solution:**
1. **Single source of truth**: Define ports only in `firebase.json`
2. **Dynamic port discovery**: ConfigService reads from `firebase.json` at runtime
3. **Consistent defaults**: Document standard ports in README

```json
// firebase.json - SINGLE SOURCE OF TRUTH
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },  // ← Always use 8080 (standard)
    "functions": { "port": 5001 },  // ← Always use 5001 (standard)
    "storage": { "port": 9199 },
    "hosting": { "port": 5000 }
  }
}
```

**Prevention:**
- Establish team standard for emulator ports
- Document ports in project README
- Never override ports in code
- Always use ConfigService to read ports
- Add health check script to verify ports

**References:**
- Story 4.3: Migrate API Routes and Server Code
- BUG-005: Proxy CSV Import Failure
- `firebase.json:46-66`

---

### Pitfall 3: Missing Environment Variables

**Problem:**
Firebase emulator host environment variables not set for server-side code:
- Firebase Admin SDK requires `FIRESTORE_EMULATOR_HOST` and `FIREBASE_AUTH_EMULATOR_HOST`
- If not set, Admin SDK connects to production (even in development!)
- No error message - silently connects to wrong environment

**Impact:**
- **Critical**: Accidentally modified production data during development
- Tests created real users in production Firebase
- Data inconsistencies between local and production
- 4-6 hours to identify and clean up production data pollution

**Solution:**
Set emulator environment variables before initializing Firebase Admin:

```typescript
// ✅ CORRECT: Set emulator hosts before initialization
import * as admin from 'firebase-admin';
import { getConfig } from '../config';

export function initializeFirebaseAdmin() {
  const config = getConfig();
  const emulators = config.getEmulatorConfig();

  // CRITICAL: Set environment variables BEFORE initializing Admin SDK
  if (emulators) {
    process.env.FIRESTORE_EMULATOR_HOST = `${emulators.firestore.host}:${emulators.firestore.port}`;
    process.env.FIREBASE_AUTH_EMULATOR_HOST = `${emulators.auth.host}:${emulators.auth.port}`;
  }

  const app = admin.initializeApp({
    projectId: config.getFirebaseConfig().projectId,
  });

  return app;
}
```

```typescript
// ❌ INCORRECT: Missing emulator host configuration
import * as admin from 'firebase-admin';

const app = admin.initializeApp();  // ← Will connect to production!
```

**Prevention:**
- Always check emulator mode before Firebase Admin initialization
- Add validation to throw error if emulators not configured in development
- Document this requirement in setup guide
- Add to automated setup script

**References:**
- Story 4.3: Migrate API Routes and Server Code
- `apps/functions/src/config/firebase-admin.ts:16-24`

---

### Pitfall 4: Connection Timeout Issues

**Problem:**
Emulator connection timeouts with no clear error message:
- Emulators running but application can't connect
- Firewall blocking localhost connections
- Incorrect host name (`127.0.0.1` vs `localhost`)

**Impact:**
- Application fails to start
- Generic "connection refused" errors
- 30-45 minutes debugging per occurrence

**Solution:**
1. Use health check script to validate emulator connectivity
2. Use consistent host name (`localhost` everywhere)
3. Add timeout handling with clear error messages

```javascript
// Health check script
async function checkEmulator(service) {
  return new Promise((resolve) => {
    const req = http.get({
      hostname: 'localhost',  // ← Consistent host name
      port: service.port,
      path: '/',
      timeout: 2000  // ← Explicit timeout
    }, (res) => {
      resolve({ ...service, status: 'online' });
    });

    req.on('error', (err) => {
      resolve({
        ...service,
        status: 'offline',
        error: err.message  // ← Include error details
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ ...service, status: 'timeout' });
    });
  });
}
```

**Prevention:**
- Run health check before starting application
- Add health check to `npm run dev` script
- Document emulator startup in README
- Use `npm run dev:all` to start emulators and app together

**References:**
- Story 4.5: Automated Development Setup
- `scripts/e2e-health.js:26-48`

---

### Pitfall 5: Client vs Server SDK Port Format Differences

**Problem:**
Firebase Client SDK and Admin SDK use different connection formats:
- **Client SDK**: `connectFirestoreEmulator(db, host, port)` - separate arguments
- **Admin SDK**: `process.env.FIRESTORE_EMULATOR_HOST = 'host:port'` - combined string

Developers copying code between client and server created format mismatches.

**Impact:**
- Connection failures with cryptic error messages
- "Invalid argument" errors
- 15-30 minutes debugging per occurrence

**Solution:**
Document the difference clearly and use ConfigService to handle both formats:

```typescript
// ✅ CORRECT: Client SDK (Browser)
import { connectFirestoreEmulator } from 'firebase/firestore';

const emulators = config.getEmulatorConfig()!;
connectFirestoreEmulator(db, emulators.firestore.host, emulators.firestore.port);
// Arguments: (db, host, port) - SEPARATE
```

```typescript
// ✅ CORRECT: Admin SDK (Server)
const emulators = config.getEmulatorConfig()!;
process.env.FIRESTORE_EMULATOR_HOST = `${emulators.firestore.host}:${emulators.firestore.port}`;
// Format: 'host:port' - COMBINED STRING
```

**Prevention:**
- Add code comments documenting the format difference
- Create helper functions for each environment
- Include examples in setup guide
- Add to code review checklist

**References:**
- Story 4.2: Migrate Firebase Client SDK
- Story 4.3: Migrate API Routes and Server Code

---

## Firebase Project Structure Pitfalls

### Pitfall 6: Monorepo Workspace Configuration

**Problem:**
npm workspaces in monorepo structure caused package resolution issues:
- Packages linked with `link:` protocol
- Works locally but breaks in CI
- Shared types not found during build

**Impact:**
- CI builds fail with "Cannot find module"
- 2-4 hours to diagnose workspace issues
- Delayed deployments

**Solution:**
Proper workspace configuration in root `package.json`:

```json
{
  "name": "my-firebase-project",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build:all": "npm run build --workspace=packages/shared-types && npm run build:functions && npm run build"
  }
}
```

Build shared packages FIRST, then dependent packages:

```bash
# ✅ CORRECT: Build order matters!
npm run build --workspace=packages/shared-types  # 1. Build shared package first
npm run build --workspace=apps/functions         # 2. Build functions (depends on shared-types)
npm run build --workspace=apps/web               # 3. Build web app
```

**Prevention:**
- Document workspace dependencies in README
- Create `build:all` script with correct order
- Test workspace configuration in CI early
- Use explicit dependency versions where possible

**References:**
- Story 4.7.1: Fix CI Workspace Dependencies
- Root `package.json:6-12`

---

### Pitfall 7: Package Dependency Resolution in CI

**Problem:**
Workspace packages use `link:` protocol which doesn't work in CI:
- `"shared-types": "link:../../packages/shared-types"` in `package.json`
- npm can't resolve `link:` when package isn't published to registry
- CI build fails even though local build works

**Impact:**
- CI builds fail at the last step (after 5-10 minutes of building)
- Blocks deployments
- Story 4.7 almost complete but blocked by this issue
- 6-8 hours to diagnose and implement solution

**Solution:**
Bundle workspace packages as tarballs during CI build:

```yaml
# .github/workflows/ci-testing.yml
- name: Bundle workspace packages
  run: |
    # 1. Build the shared package
    npm run build --workspace=packages/shared-types

    # 2. Pack it as tarball
    cd packages/shared-types
    npm pack  # Creates shared-types-1.0.0.tgz

    # 3. Install tarball in dependent workspace
    cd ../../apps/functions
    npm install ../../packages/shared-types/shared-types-*.tgz
```

**Prevention:**
- Test CI build early in project lifecycle
- Document workspace package bundling in CI/CD guide
- Add to CI workflow template
- Consider publishing internal packages to private registry

**References:**
- Story 4.7.1: Fix CI Workspace Dependencies
- `.github/workflows/ci-testing.yml:45-57`

---

### Pitfall 8: Shared Types and Cross-Workspace Imports

**Problem:**
TypeScript path aliases don't work correctly across workspaces:
- `import { User } from '@/types'` works in `apps/web`
- Same import fails in `apps/functions`
- Different `tsconfig.json` path configurations

**Impact:**
- Type errors during functions build
- Duplicate type definitions across workspaces
- Type inconsistencies between frontend and backend

**Solution:**
Create dedicated shared types package:

```
packages/shared-types/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts         # Re-export all types
│   ├── user.ts
│   ├── proxy.ts
│   └── ...
└── dist/                # Built output
```

```json
// packages/shared-types/package.json
{
  "name": "shared-types",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc"
  }
}
```

Import from package name (not path alias):

```typescript
// ✅ CORRECT: Use package name
import { User, Proxy } from 'shared-types';
```

```typescript
// ❌ INCORRECT: Path alias doesn't work across workspaces
import { User } from '@/types';  // Works in web, fails in functions
```

**Prevention:**
- Set up shared types package from project start
- Document import pattern in coding standards
- Use consistent imports across all workspaces
- Add ESLint rule to enforce package imports

**References:**
- Story 4.7.1: Fix CI Workspace Dependencies
- Epic 4 PRD: Monorepo Structure

---

## CI/CD Pitfalls

### Pitfall 9: Workspace Package Bundling for npm Registry

**Problem:**
npm workspaces don't publish to registry automatically:
- Local development uses `link:` protocol
- CI can't resolve `link:` dependencies
- Functions deployment fails because shared-types not found

This is a **duplicate** of Pitfall 7 but from the deployment perspective.

**Impact:**
- Deployment failures after successful builds
- Manual intervention required
- Inconsistent deployments

**Solution:**
Bundle workspace packages before deployment:

```yaml
# .github/workflows/deploy.yml
- name: Prepare workspace packages for deployment
  run: |
    # Build and pack shared types
    npm run build --workspace=packages/shared-types
    cd packages/shared-types
    npm pack

    # Install in functions before deployment
    cd ../../apps/functions
    npm install --save ../../packages/shared-types/*.tgz

    # Now functions directory has the bundled dependency
    cd ../../
```

**Prevention:**
- Include bundling in both CI and deployment workflows
- Test deployment process in staging environment
- Document workspace package handling in deployment guide
- Consider using private npm registry for larger teams

**References:**
- Story 4.8: GitHub Actions CI/CD - Deployment
- `.github/workflows/deploy.yml:30-45`

---

### Pitfall 10: Firebase Service Account Permissions

**Problem:**
Service account didn't have sufficient permissions for deployment:
- **Error:** "Permission denied: Missing IAM permissions"
- Service account created but not assigned roles
- Default service accounts don't have deployment permissions

**Impact:**
- Deployment fails at final step
- 1-2 hours to diagnose permission issues
- Confusion about which permissions are needed

**Solution:**
Assign required roles to service account:

```bash
# Get project ID
PROJECT_ID=your-project-id
SERVICE_ACCOUNT=github-actions@${PROJECT_ID}.iam.gserviceaccount.com

# Assign required roles
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member=serviceAccount:${SERVICE_ACCOUNT} \
  --role=roles/firebase.admin

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member=serviceAccount:${SERVICE_ACCOUNT} \
  --role=roles/iam.serviceAccountUser
```

**Minimum required roles for Firebase deployment:**
- `roles/firebase.admin` - Deploy to Firebase Hosting and Functions
- `roles/iam.serviceAccountUser` - Impersonate service accounts
- `roles/cloudfunctions.developer` - Deploy Cloud Functions
- `roles/firebasehosting.admin` - Manage hosting

**Prevention:**
- Document required permissions in setup guide
- Create service account with all permissions from the start
- Add permission validation to deployment workflow
- Use Firebase CLI: `firebase deploy --only hosting,functions` to test permissions

**References:**
- Story 4.8: GitHub Actions CI/CD - Deployment
- Firebase Documentation: Service Account Permissions

---

### Pitfall 11: Secret Management and Rotation

**Problem:**
Service account keys stored in GitHub Secrets but never rotated:
- Keys valid indefinitely
- No rotation policy
- Risk of key exposure

**Impact:**
- Security risk if repository compromised
- Stale keys if service account recreated
- No audit trail of key usage

**Solution:**
1. Store service account JSON in GitHub Secrets (✅ already doing this)
2. Rotate keys regularly (every 90 days):

```bash
# Create new service account key
gcloud iam service-accounts keys create new-key.json \
  --iam-account=github-actions@${PROJECT_ID}.iam.gserviceaccount.com

# Update GitHub secret with new key
# Go to: Settings > Secrets > FIREBASE_SERVICE_ACCOUNT > Update

# Delete old keys
gcloud iam service-accounts keys list \
  --iam-account=github-actions@${PROJECT_ID}.iam.gserviceaccount.com

gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=github-actions@${PROJECT_ID}.iam.gserviceaccount.com
```

**Prevention:**
- Set calendar reminder for key rotation (every 90 days)
- Use short-lived tokens (Workload Identity Federation) instead of keys
- Monitor service account usage in Google Cloud Console
- Document key rotation process

**References:**
- Story 4.8: GitHub Actions CI/CD - Deployment
- Google Cloud Security Best Practices

---

### Pitfall 12: Build Environment Differences (Local vs CI)

**Problem:**
Builds succeed locally but fail in CI:
- Different Node.js versions
- Different npm versions
- Missing environment variables
- Cached dependencies

**Impact:**
- "Works on my machine" syndrome
- CI failures after local testing passes
- Wasted time debugging environment differences

**Solution:**
1. **Lock Node.js and npm versions:**

```json
// package.json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

```yaml
# .github/workflows/ci-testing.yml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '18'  # ← Same as local development
    cache: 'npm'
```

2. **Use npm ci instead of npm install in CI:**

```yaml
# ✅ CORRECT: Use npm ci (clean install from lock file)
- name: Install dependencies
  run: npm ci

# ❌ INCORRECT: npm install can produce different results
- name: Install dependencies
  run: npm install
```

3. **Match environment variables:**

```yaml
env:
  NODE_ENV: production
  NEXT_PUBLIC_APP_ENV: ${{ secrets.APP_ENV }}
```

**Prevention:**
- Document required Node.js/npm versions in README
- Add version check to automated setup script
- Use Docker for consistent environments (advanced)
- Test CI workflow with every major dependency update

**References:**
- Story 4.7: GitHub Actions CI/CD - Testing
- `.github/workflows/ci-testing.yml:12-17`

---

## Testing Pitfalls

### Pitfall 13: Emulator State Pollution Between Tests

**Problem:**
Test data from one test remains in emulator for next test:
- Test A creates user with email `test@example.com`
- Test B tries to create same user → fails with "already exists"
- Tests pass in isolation but fail when run together
- Flaky test syndrome

**Impact:**
- Flaky tests (pass/fail inconsistently)
- Tests must be run with `--runInBand` (sequential, slow)
- 2-3 hours debugging flaky test failures

**Solution:**
Clear emulator state between tests:

```typescript
// ✅ CORRECT: Clear Firestore between tests
import { getFirestore } from 'firebase-admin/firestore';

describe('User Management', () => {
  let db: FirebaseFirestore.Firestore;

  beforeAll(() => {
    const app = initializeFirebaseAdmin();
    db = getFirestore(app);
  });

  beforeEach(async () => {
    // CRITICAL: Clear all collections before each test
    const collections = await db.listCollections();
    const deletePromises = collections.map(async (collection) => {
      const docs = await collection.listDocuments();
      return Promise.all(docs.map((doc) => doc.delete()));
    });
    await Promise.all(deletePromises);
  });

  it('should create a user', async () => {
    // Test runs with clean slate
    const user = await db.collection('users').add({ email: 'test@example.com' });
    expect(user.id).toBeDefined();
  });
});
```

Alternative: Use unique IDs per test:

```typescript
// ✅ ALTERNATIVE: Use unique test IDs
const testId = `test-${Date.now()}`;
const email = `test-${testId}@example.com`;

await db.collection('users').add({ email });
```

**Prevention:**
- Always clear emulator state in `beforeEach`
- Use unique IDs for test data
- Document data isolation strategy
- Add to test template

**References:**
- Story 4.4: Migrate E2E Tests
- Testing best practices documentation

---

### Pitfall 14: Flaky Tests Due to Timing Issues

**Problem:**
Tests fail intermittently due to race conditions:
- Firestore write hasn't completed before read
- Auth user creation pending
- Function invocation hasn't finished
- No explicit wait/polling

**Impact:**
- Flaky tests that randomly fail
- CI failures that can't be reproduced locally
- Lost confidence in test suite
- 3-4 hours debugging each flaky test

**Solution:**
Add explicit waits and assertions:

```typescript
// ✅ CORRECT: Wait for operation to complete
import { waitFor } from '@testing-library/react';

it('should display user after creation', async () => {
  // Create user
  const userRef = await db.collection('users').add({
    email: 'test@example.com',
    name: 'Test User'
  });

  // WAIT for Firestore to propagate
  await waitFor(async () => {
    const doc = await userRef.get();
    expect(doc.exists).toBe(true);
  }, { timeout: 5000 });

  // Now verify UI
  await waitFor(() => {
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });
});
```

```typescript
// ❌ INCORRECT: No wait, races with async operations
it('should display user after creation', async () => {
  await db.collection('users').add({ email: 'test@example.com' });
  expect(screen.getByText('Test User')).toBeInTheDocument();  // ← May not be rendered yet!
});
```

**Prevention:**
- Always wait for async operations to complete
- Use `waitFor` for UI assertions
- Add timeout configurations
- Increase timeouts in CI environment (slower machines)
- Document async testing patterns

**References:**
- Story 4.4: Migrate E2E Tests
- Playwright timeout configuration

---

### Pitfall 15: Coverage Threshold Configuration

**Problem:**
Coverage thresholds set too high for initial implementation:
- Threshold: 80% for all metrics
- Actual coverage: 65-75% (realistic for new features)
- CI fails on coverage check even though tests pass
- Blocks merging PRs with good test coverage

**Impact:**
- Developers skip writing tests to meet artificial threshold
- Or artificially inflate coverage with meaningless tests
- Slows down development velocity
- Creates adversarial relationship with testing

**Solution:**
Set realistic, incremental coverage thresholds:

```javascript
// jest.config.js

// ✅ CORRECT: Realistic thresholds
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
  coverageThresholds: {
    global: {
      branches: 70,      // Start at 70%, increase gradually
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Higher threshold for critical paths
    './src/config/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
```

```javascript
// ❌ INCORRECT: Unrealistic thresholds
coverageThresholds: {
  global: {
    branches: 95,  // ← Too high for most projects
    functions: 95,
    lines: 95,
    statements: 95,
  },
}
```

**Prevention:**
- Start with achievable thresholds (60-70%)
- Increase by 5% per quarter
- Different thresholds for different code areas
- Focus on meaningful tests, not coverage percentage
- Review coverage trends, not absolute numbers

**References:**
- Story 4.7: GitHub Actions CI/CD - Testing
- `apps/web/jest.config.js:17-27`

---

### Pitfall 16: Test Isolation with Parallel Execution

**Problem:**
Tests run in parallel (Jest default) but share Firebase emulator state:
- Test A and Test B both create user with ID "123"
- Race condition: who creates first?
- Both tests may fail or pass randomly

**Impact:**
- Extremely flaky tests
- Must run tests sequentially (`--runInBand`) which is SLOW
- 5-10x longer test execution time

**Solution:**
Either:

**Option 1:** Run tests sequentially (simple but slow)
```json
{
  "scripts": {
    "test:integration": "jest --runInBand"
  }
}
```

**Option 2:** Use unique test namespaces (faster, more complex)
```typescript
// Each test gets unique collection/ID
const testId = `test-${process.pid}-${Date.now()}`;
const collection = db.collection(`users-${testId}`);

it('should create user', async () => {
  const user = await collection.add({ email: 'test@example.com' });
  expect(user.id).toBeDefined();
});
```

**Option 3:** Use separate emulator instances per test file (complex but fast)
```typescript
// Start emulator on random port per test file
const port = 8080 + Math.floor(Math.random() * 1000);
process.env.FIRESTORE_EMULATOR_HOST = `localhost:${port}`;
```

**Prevention:**
- Choose test isolation strategy early
- Document strategy in testing guide
- Configure Jest workers appropriately
- Monitor test execution time

**References:**
- Story 4.4: Migrate E2E Tests
- Jest configuration documentation

---

## Additional Pitfalls

### Pitfall 17: Firebase.json Not in Version Control

**Problem:**
`firebase.json` not committed to Git (in `.gitignore`):
- Emulator ports undefined for new developers
- Each developer configures different ports
- No single source of truth

**Impact:**
- Inconsistent development environments
- Port conflicts between team members
- Configuration drift over time

**Solution:**
**Always commit `firebase.json` to version control:**

```bash
# ✅ CORRECT: firebase.json is committed
git add firebase.json
git commit -m "chore: add firebase.json with emulator config"
```

Update `.gitignore` to NOT ignore `firebase.json`:

```
# .gitignore
.firebase/     # ← Ignore Firebase cache
.firebaserc    # ← Can ignore (contains project ID)
# DO NOT IGNORE: firebase.json  ← This should be committed!
```

**Prevention:**
- Review `.gitignore` during project setup
- Document required configuration files in README
- Add firebase.json to initial commit
- Code review: Check for missing config files

**References:**
- Project initialization
- Version control best practices

---

### Pitfall 18: Missing Cross-Platform Script Compatibility

**Problem:**
Scripts written for Unix (Mac/Linux) don't work on Windows:
- `export VAR=value` (Unix) vs `set VAR=value` (Windows)
- Path separators: `/` vs `\`
- Command availability: `rm` vs `del`

**Impact:**
- Windows developers can't run automation scripts
- Manual workarounds needed
- Team fragmentation (some on Mac, some on Windows)

**Solution:**
Use cross-platform Node.js scripts instead of shell scripts:

```javascript
// ✅ CORRECT: Cross-platform Node.js script
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Works on Windows, Mac, Linux
const envFile = path.join(__dirname, '..', 'apps', 'web', '.env.local');
if (fs.existsSync(envFile)) {
  console.log('.env.local exists');
}

// Execute commands (works everywhere)
const isWindows = process.platform === 'win32';
const firebaseCmd = isWindows ? 'firebase.cmd' : 'firebase';
execSync(`${firebaseCmd} emulators:start`, { stdio: 'inherit' });
```

```bash
# ❌ INCORRECT: Unix-only shell script
#!/bin/bash
export FIREBASE_PROJECT=my-project
firebase emulators:start
```

**Prevention:**
- Use Node.js for all automation scripts
- Test scripts on Windows if team uses Windows
- Use `cross-env` package for environment variables
- Avoid shell-specific syntax

**References:**
- Story 4.5: Automated Development Setup
- `scripts/setup.js` - Cross-platform implementation

---

## Quick Reference

### Emulator Pitfalls Summary

| # | Pitfall | Quick Fix | Time Saved |
|---|---------|-----------|------------|
| 1 | Hardcoded ports | Use ConfigService | 30-60 min |
| 2 | Port conflicts | Single source in firebase.json | 2-3 hours |
| 3 | Missing env vars | Set before Admin SDK init | 4-6 hours |
| 4 | Connection timeouts | Health check script | 30-45 min |
| 5 | SDK format differences | Document both formats | 15-30 min |

### Workspace Pitfalls Summary

| # | Pitfall | Quick Fix | Time Saved |
|---|---------|-----------|------------|
| 6 | Monorepo config | Proper workspace setup | 2-4 hours |
| 7 | Package resolution | Bundle as tarballs in CI | 6-8 hours |
| 8 | Cross-workspace imports | Shared types package | 2-3 hours |

### CI/CD Pitfalls Summary

| # | Pitfall | Quick Fix | Time Saved |
|---|---------|-----------|------------|
| 9 | Workspace bundling | npm pack workflow | 2-3 hours |
| 10 | Service account permissions | Assign required roles | 1-2 hours |
| 11 | Secret rotation | 90-day rotation policy | Risk mitigation |
| 12 | Environment differences | Lock Node/npm versions | 1-2 hours |

### Testing Pitfalls Summary

| # | Pitfall | Quick Fix | Time Saved |
|---|---------|-----------|------------|
| 13 | State pollution | Clear emulator in beforeEach | 2-3 hours |
| 14 | Timing issues | Use waitFor | 3-4 hours |
| 15 | Coverage thresholds | Realistic targets (70%) | Velocity |
| 16 | Parallel execution | Run sequentially or isolate | Config |

### Additional Pitfalls Summary

| # | Pitfall | Quick Fix | Time Saved |
|---|---------|-----------|------------|
| 17 | firebase.json not tracked | Commit to version control | Team consistency |
| 18 | Platform compatibility | Use Node.js scripts | Windows support |

---

## Total Impact

**Time Savings Per Project:**
- Avoiding emulator pitfalls: **8-12 hours**
- Avoiding workspace pitfalls: **10-15 hours**
- Avoiding CI/CD pitfalls: **6-10 hours**
- Avoiding testing pitfalls: **8-12 hours**

**Total: 32-49 hours saved** by learning from these documented pitfalls.

**Frequency:**
- Epic 4: Encountered all 18 pitfalls over 2-week period
- Cost: ~40 hours of debugging and rework
- Benefit of this document: Avoid repeating the same mistakes

---

## Contributing

Found a new pitfall? Add it to this document:

1. Follow the structure: Problem → Impact → Solution → Prevention
2. Include code examples
3. Reference related stories or commits
4. Update quick reference table

**Document maintained by:** SavvyProxy Team
**Last updated:** 2025-10-16
**License:** MIT

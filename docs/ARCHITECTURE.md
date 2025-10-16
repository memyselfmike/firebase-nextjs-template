# Architecture Overview

This document explains the technical architecture and design patterns used in this Firebase + Next.js template.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Configuration Management](#configuration-management)
3. [Development Workflow](#development-workflow)
4. [Deployment Architecture](#deployment-architecture)

## System Architecture

### Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend Layer                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Next.js 15 + React 19 + TypeScript             │  │
│  │  - App Router (React Server Components)         │  │
│  │  - Tailwind CSS                                  │  │
│  │  - ConfigService (centralized config)           │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                     Firebase Services                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Authentication | Firestore | Cloud Functions   │  │
│  │  Storage | Hosting                              │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Monorepo Structure

```
firebase-nextjs-template/
├── apps/
│   ├── web/                    # Next.js frontend application
│   └── functions/              # Firebase Cloud Functions
├── packages/
│   └── shared-types/          # Shared TypeScript types
└── scripts/                   # Automation scripts
```

## Configuration Management

### ConfigService Pattern

The template uses a **Singleton ConfigService** for centralized configuration management.

#### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Configuration Sources                 │
│  (Priority: High → Low)                                 │
├─────────────────────────────────────────────────────────┤
│  1. Process Environment Variables                       │
│  2. .env.local File (Next.js)                          │
│  3. firebase.json (Server-side only)                   │
│  4. Hardcoded Defaults                                 │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│               ConfigService Singleton                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │  - Loads and validates configuration            │  │
│  │  - Provides type-safe access                    │  │
│  │  - Handles browser/Node.js environments        │  │
│  │  - Dynamic emulator port discovery             │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  Application Code                        │
│  Uses getConfig() for all configuration access         │
└─────────────────────────────────────────────────────────┘
```

#### Key Features

1. **Environment Detection**
   - Automatically detects development/staging/production
   - Configures emulators in development
   - Uses production credentials in production

2. **Type Safety**
   - All configuration values are strongly typed
   - Compile-time checks prevent invalid usage

3. **Validation**
   - Fail-fast validation on startup
   - Clear error messages with resolution steps

4. **Cross-Environment**
   - Works in both Node.js and browser
   - Gracefully handles missing features (e.g., file system in browser)

#### Usage Example

```typescript
import { ConfigService } from '@/config';

// Get singleton instance
const config = ConfigService.getInstance();

// Access configuration
const emulators = config.getEmulatorConfig();
if (emulators) {
  // Connect to emulators
  connectFirestoreEmulator(db, emulators.firestore.host, emulators.firestore.port);
}

// Check environment
if (config.isProduction()) {
  // Production-only logic
}
```

## Development Workflow

### Local Development

```
┌─────────────────────────────────────────────────────────┐
│  Developer runs: npm run dev:all                        │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  Firebase Emulators Start                               │
│  ├── Auth Emulator       (port 9099)                   │
│  ├── Firestore Emulator  (port 8080)                   │
│  ├── Functions Emulator  (port 5001)                   │
│  ├── Storage Emulator    (port 9199)                   │
│  └── Hosting Emulator    (port 5000)                   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  ConfigService Initialization                           │
│  1. Reads firebase.json for emulator ports             │
│  2. Loads .env.local variables                         │
│  3. Validates configuration                            │
│  4. Provides config to application                     │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  Next.js Dev Server Starts (port 3004)                 │
│  - Hot reload enabled                                   │
│  - Auto-connects to emulators                          │
│  - TypeScript type checking                            │
└─────────────────────────────────────────────────────────┘
```

### Automated Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `setup.js` | One-time environment setup | First time setup or onboarding new developers |
| `e2e-start.js` | Start all services for E2E testing | Before running E2E tests |
| `e2e-stop.js` | Stop all services | Cleanup after testing or when switching projects |
| `e2e-health.js` | Health check all services | Verify all services are running correctly |

## Deployment Architecture

### CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────┐
│  Pull Request Created / Code Pushed                     │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  GitHub Actions: CI Testing Workflow                    │
│  ├── Type Check (npm run typecheck)                    │
│  ├── Lint (npm run lint)                               │
│  ├── Unit Tests (npm test)                             │
│  ├── Build Validation (npm run build:all)              │
│  └── E2E Tests (optional)                              │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  Merge to Main Branch                                   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  GitHub Actions: Deploy Workflow                        │
│  1. Run all tests again                                │
│  2. Build production bundle                            │
│  3. Deploy to Firebase:                                │
│     ├── Hosting (Next.js app)                         │
│     ├── Functions (Cloud Functions)                   │
│     └── Firestore Rules                               │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  Production Environment                                  │
│  🌐 https://your-project.web.app                        │
└─────────────────────────────────────────────────────────┘
```

### Production Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Users                                                   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  Firebase Hosting (CDN)                                 │
│  - Next.js Static/SSR Pages                            │
│  - Global CDN Distribution                             │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  Firebase Services                                       │
│  ├── Authentication (User management)                   │
│  ├── Firestore (Database)                              │
│  ├── Cloud Functions (API/Backend)                     │
│  └── Storage (File uploads)                            │
└─────────────────────────────────────────────────────────┘
```

## Key Design Patterns

### 1. Singleton Pattern (ConfigService)

**Why**: Ensures single source of truth for configuration across the application.

```typescript
export class ConfigService {
  private static instance: ConfigService | null = null;

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }
}
```

### 2. Fail-Fast Validation

**Why**: Catch configuration errors at startup, not runtime.

```typescript
const validation = this.validate();
if (!validation.valid) {
  throw new ConfigurationError(
    'Configuration validation failed',
    validation.errors?.join('\n'),
    'Check your .env.local file'
  );
}
```

### 3. Environment-Based Configuration

**Why**: Different config for dev/staging/production without code changes.

```typescript
if (this.getEnvironment() === 'development') {
  config.emulators = this.loadEmulatorConfig();
}
```

### 4. Cross-Platform Scripts

**Why**: Works on Windows, Mac, and Linux without changes.

```typescript
const isWindows = process.platform === 'win32';
const command = isWindows ? 'firebase.cmd' : 'firebase';
```

## Security Considerations

### 1. Environment Variables

- ✅ Prefix client-side vars with `NEXT_PUBLIC_`
- ✅ Never commit `.env.local` to git
- ✅ Use separate credentials for dev/prod
- ✅ Rotate service account keys regularly

### 2. Firebase Security Rules

- ✅ Start with restrictive rules
- ✅ Test rules with Firebase Emulator
- ✅ Use authentication-based rules
- ✅ Validate data structure in rules

### 3. API Security

- ✅ Validate all function inputs
- ✅ Use Firebase Auth tokens
- ✅ Rate limit public endpoints
- ✅ Log security events

## Performance Optimizations

### 1. Next.js App Router

- Server Components by default (reduce client JS)
- Streaming and Suspense for faster page loads
- Automatic code splitting

### 2. Firebase

- Use Firestore indexes for complex queries
- Implement pagination for large datasets
- Cache static data in client

### 3. Build Optimizations

- TypeScript strict mode for better optimization
- Tree shaking of unused code
- Production builds use minification

## Extending the Template

### Adding a New Firebase Service

1. **Enable service in Firebase Console**
2. **Add to ConfigService types** (if needed)
3. **Initialize in application code**
4. **Add to emulator config** in `firebase.json`
5. **Update documentation**

### Adding a New Package

1. **Create in `packages/` directory**
2. **Add to workspace** in root `package.json`
3. **Build before use**: `npm run build --workspace=packages/your-package`
4. **Import in apps**: `import { ... } from '@packages/your-package'`

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions.

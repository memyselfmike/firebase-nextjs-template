# Firebase + Next.js Project Setup Guide

**Complete guide for setting up a Firebase + Next.js project with CI/CD pipeline**

**Version:** 1.0
**Last Updated:** 2025-10-16
**Based On:** SavvyProxy Epic 4 - Firebase Infrastructure Modernization

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Project Initialization](#project-initialization)
4. [ConfigService Pattern Implementation](#configservice-pattern-implementation)
5. [Firebase Emulator Configuration](#firebase-emulator-configuration)
6. [Environment Variable Management](#environment-variable-management)
7. [CI/CD Pipeline Setup](#cicd-pipeline-setup)
8. [Testing Strategies](#testing-strategies)
9. [Development Workflow](#development-workflow)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides a comprehensive, step-by-step process for setting up a production-ready Firebase + Next.js project with full CI/CD pipeline integration. Following this guide, you should be able to go from zero to a fully functional development environment in **under 1 day**.

### What You'll Build

- **Next.js 15** monorepo structure with TypeScript
- **Firebase** integration (Auth, Firestore, Functions, Storage, Hosting)
- **Centralized Configuration** using ConfigService singleton pattern
- **Firebase Emulators** for local development with zero hardcoded ports
- **Automated Setup Scripts** for rapid onboarding
- **GitHub Actions CI/CD** for testing and deployment
- **Comprehensive Testing** (unit, integration, E2E)

### Key Benefits

- ✅ **Zero Configuration**: No manual port configuration needed
- ✅ **Rapid Setup**: <5 minutes for new developers to get started
- ✅ **Type Safety**: Full TypeScript support throughout
- ✅ **CI/CD Ready**: Automated testing and deployment
- ✅ **Cross-Platform**: Works on Windows, Mac, and Linux

---

## Prerequisites

Before starting, ensure you have the following installed:

### Required Software

1. **Node.js 18+**
   ```bash
   node --version  # Should be v18.0.0 or higher
   ```

   If not installed: https://nodejs.org/

2. **npm 8+**
   ```bash
   npm --version  # Should be 8.0.0 or higher
   ```

3. **Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase --version
   ```

4. **Git**
   ```bash
   git --version
   ```

### Accounts & Access

1. **Firebase Project**: Create a new Firebase project at https://console.firebase.google.com/
2. **GitHub Account**: For repository hosting and CI/CD
3. **GitHub Token**: Personal access token with `repo` scope for CI/CD

### Knowledge Prerequisites

- Basic understanding of TypeScript
- Familiarity with React/Next.js
- Basic Firebase concepts (Auth, Firestore, Functions)
- Git fundamentals

---

## Project Initialization

### Step 1: Create Next.js Monorepo Structure

```bash
# Create project root
mkdir my-firebase-project
cd my-firebase-project

# Initialize npm workspace
npm init -y

# Create monorepo structure
mkdir -p apps/web
mkdir -p apps/functions
mkdir -p packages/shared-types
mkdir -p scripts
mkdir -p docs
mkdir -p .github/workflows
```

### Step 2: Configure Root package.json

Edit `package.json`:

```json
{
  "name": "my-firebase-project",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "setup": "node scripts/setup.js",
    "dev:all": "concurrently \"npm run firebase:emulators\" \"npm run dev\"",
    "dev": "npm run dev --workspace=apps/web",
    "dev:functions": "npm run dev --workspace=apps/functions",
    "build": "npm run build --workspace=apps/web",
    "build:functions": "npm run build --workspace=apps/functions",
    "build:all": "npm run build --workspace=packages/shared-types && npm run build:functions && npm run build",
    "start": "npm run start --workspace=apps/web",
    "lint": "npm run lint --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "firebase:emulators": "firebase emulators:start",
    "firebase:deploy": "firebase deploy"
  },
  "devDependencies": {
    "concurrently": "^9.2.1",
    "firebase-tools": "^13.35.1",
    "typescript": "^5.6.3"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

### Step 3: Initialize Next.js Application

```bash
cd apps/web
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
cd ../..
```

When prompted:
- ✅ TypeScript: Yes
- ✅ ESLint: Yes
- ✅ Tailwind CSS: Yes
- ✅ App Router: Yes
- ❌ src/ directory: No
- ✅ Import alias (@/*): Yes

### Step 4: Initialize Firebase Project

```bash
# Login to Firebase (if not already logged in)
firebase login

# Initialize Firebase in project root
firebase init

# Select the following:
# ✓ Firestore: Configure security rules and indexes files
# ✓ Functions: Configure a Cloud Functions directory
# ✓ Hosting: Configure files for Firebase Hosting
# ✓ Storage: Configure a security rules file for Cloud Storage
# ✓ Emulators: Set up local emulators for Firebase products

# Configuration choices:
# - Use an existing project: Select your Firebase project
# - Firestore rules file: firestore.rules
# - Firestore indexes file: firestore.indexes.json
# - Functions language: TypeScript
# - Use ESLint: Yes
# - Functions source directory: apps/functions
# - Hosting public directory: apps/web/.next
# - Configure as single-page app: No
# - Set up automatic builds: No
# - Storage rules file: storage.rules
# - Which Firebase emulators: Auth, Functions, Firestore, Storage, Hosting
```

### Step 5: Configure firebase.json

Edit `firebase.json` to match your monorepo structure:

```json
{
  "functions": [
    {
      "source": "apps/functions",
      "codebase": "default",
      "runtime": "nodejs18"
    }
  ],
  "hosting": {
    "public": "apps/web/.next",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "hosting": {
      "port": 5000
    },
    "storage": {
      "port": 9199
    },
    "ui": {
      "enabled": false
    },
    "singleProjectMode": true
  }
}
```

**IMPORTANT:** These emulator ports are your default ports. The ConfigService pattern will automatically discover and use these ports, eliminating hardcoded configuration.

---

## ConfigService Pattern Implementation

The ConfigService pattern is the **foundation** of zero-configuration Firebase setup. It centralizes all configuration management and eliminates hardcoded values.

### Benefits

- ✅ **Single Source of Truth**: All config in one place
- ✅ **Dynamic Port Discovery**: Reads from firebase.json automatically
- ✅ **Environment-Aware**: Different config for dev/staging/production
- ✅ **Type-Safe**: Full TypeScript support
- ✅ **Fail-Fast Validation**: Catches config errors early

### Architecture

```
ConfigService (Singleton)
├── Environment Detection
├── Firebase Config Loading
│   ├── Process Environment Variables (Priority 1)
│   ├── .env.local File (Priority 2)
│   ├── firebase.json (Priority 3 - Server-side only)
│   └── Hardcoded Defaults (Priority 4)
├── Emulator Config Loading
├── Validation
└── Logging
```

### Step 1: Create Type Definitions

Create `apps/web/src/config/types.ts`:

```typescript
/**
 * Firebase Infrastructure Configuration Types
 *
 * Provides type-safe interfaces for all configuration values
 * used throughout the application.
 *
 * @module config/types
 */

/**
 * Emulator endpoint configuration
 */
export interface EmulatorEndpoint {
  host: string;
  port: number;
}

/**
 * Complete emulator configuration for all Firebase services
 */
export interface EmulatorConfig {
  auth: EmulatorEndpoint & { url: string };
  firestore: EmulatorEndpoint;
  functions: EmulatorEndpoint & { baseUrl: string };
  storage: EmulatorEndpoint;
  hosting: EmulatorEndpoint;
}

/**
 * Firebase project configuration
 */
export interface FirebaseConfig {
  projectId: string;
  apiKey?: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  emulators?: EmulatorConfig;
}

/**
 * Complete application configuration
 */
export interface AppConfig {
  environment: 'development' | 'staging' | 'production';
  firebase: FirebaseConfig;
  api: {
    baseUrl: string;
  };
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Base configuration error class
 */
export class ConfigurationError extends Error {
  constructor(
    message: string,
    public details?: string,
    public resolution?: string
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Error thrown when Firebase emulators are not running
 */
export class EmulatorNotRunningError extends ConfigurationError {
  constructor() {
    super(
      'Firebase emulators are not running',
      'Unable to detect running Firebase emulators on configured ports',
      'Resolution:\n1. Run: npm run dev:all\n2. Or: firebase emulators:start\n3. Check firebase.json for emulator ports'
    );
  }
}
```

### Step 2: Implement ConfigService Singleton

Create `apps/web/src/config/firebase-config.ts`:

```typescript
/**
 * Firebase Configuration Service
 *
 * Centralized configuration management for the application.
 * Loads configuration from multiple sources in priority order:
 * 1. Process environment variables
 * 2. .env.local file (Next.js)
 * 3. firebase.json (emulator defaults - server-side only)
 * 4. Hardcoded safe defaults
 *
 * NOTE: This module works in both Node.js and browser environments.
 * File system access (firebase.json reading) is only available server-side.
 *
 * @module config/firebase-config
 */

import {
  AppConfig,
  FirebaseConfig,
  EmulatorConfig,
  ValidationResult,
  ConfigurationError,
} from './types';

// Check if we're in a Node.js environment (not browser)
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

/**
 * Centralized Configuration Service
 *
 * Singleton pattern that loads and validates configuration from multiple sources.
 * Provides type-safe access to all configuration values.
 */
export class ConfigService {
  private static instance: ConfigService | null = null;
  private config: AppConfig;

  private constructor() {
    console.log('[ConfigService] Initializing configuration...');

    this.config = {
      environment: this.getEnvironment(),
      firebase: this.loadFirebaseConfig(),
      api: {
        baseUrl: '', // Will be set after Firebase config is loaded
      },
    };

    // Set API base URL after Firebase config is loaded
    this.config.api.baseUrl = this.getApiBaseUrl();

    // Validate configuration
    const validation = this.validate();
    if (!validation.valid) {
      throw new ConfigurationError(
        'Configuration validation failed',
        validation.errors?.join('\n'),
        'Check your .env.local file and ensure Firebase emulators are running'
      );
    }

    console.log('[ConfigService] ✅ Configuration loaded successfully');
    this.logConfiguration();
  }

  /**
   * Get singleton instance of ConfigService
   */
  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Reset instance (for testing only)
   * @internal
   */
  static resetInstance(): void {
    ConfigService.instance = null;
  }

  /**
   * Get current environment
   */
  getEnvironment(): 'development' | 'staging' | 'production' {
    const env = process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV;
    if (env === 'production') return 'production';
    if (env === 'staging') return 'staging';
    return 'development';
  }

  /**
   * Get complete Firebase configuration
   */
  getFirebaseConfig(): FirebaseConfig {
    return this.config.firebase;
  }

  /**
   * Get emulator configuration (null if not in emulator mode)
   */
  getEmulatorConfig(): EmulatorConfig | null {
    return this.config.firebase.emulators || null;
  }

  /**
   * Get API base URL
   */
  getApiUrl(): string {
    return this.config.api.baseUrl;
  }

  /**
   * Check if running in emulator mode
   */
  isEmulatorMode(): boolean {
    return this.config.environment === 'development' && !!this.config.firebase.emulators;
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return this.config.environment === 'production';
  }

  /**
   * Validate configuration
   */
  validate(): ValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!this.config.firebase.projectId) {
      errors.push('Firebase projectId is required');
    }

    // Development/emulator validation
    if (this.config.environment === 'development') {
      if (!this.config.firebase.emulators) {
        errors.push('Emulator configuration missing in development mode');
      }
    }

    // Production validation
    if (this.config.environment === 'production') {
      if (!this.config.firebase.apiKey) {
        errors.push('Firebase apiKey required for production');
      }
      if (!this.config.firebase.authDomain) {
        errors.push('Firebase authDomain required for production');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Load Firebase configuration from all sources
   */
  private loadFirebaseConfig(): FirebaseConfig {
    const config: FirebaseConfig = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'demo-project',
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    // Load emulator configuration if in development
    if (this.getEnvironment() === 'development') {
      config.emulators = this.loadEmulatorConfig();
    }

    return config;
  }

  /**
   * Load emulator configuration from firebase.json (server-side only)
   * In browser, falls back to defaults immediately
   */
  private loadEmulatorConfig(): EmulatorConfig | undefined {
    // In browser environment, skip file reading and use defaults
    if (!isNode) {
      console.log('[ConfigService] Browser environment detected, using default emulator ports');
      return this.getDefaultEmulatorConfig();
    }

    try {
      // Dynamic require for Node.js-only modules
      const fs = require('fs');
      const path = require('path');

      const firebasePath = path.join(process.cwd(), 'firebase.json');

      if (!fs.existsSync(firebasePath)) {
        console.warn('[ConfigService] ⚠️ firebase.json not found, using defaults');
        return this.getDefaultEmulatorConfig();
      }

      const firebaseJson = JSON.parse(fs.readFileSync(firebasePath, 'utf-8'));

      if (!firebaseJson.emulators) {
        console.warn('[ConfigService] ⚠️ No emulator config in firebase.json');
        return this.getDefaultEmulatorConfig();
      }

      const emulators = firebaseJson.emulators;
      const host = 'localhost';
      const projectId = this.config?.firebase?.projectId || 'demo-project';

      return {
        auth: {
          host,
          port: emulators.auth?.port || 9099,
          url: `http://${host}:${emulators.auth?.port || 9099}`,
        },
        firestore: {
          host,
          port: emulators.firestore?.port || 8080,
        },
        functions: {
          host,
          port: emulators.functions?.port || 5001,
          baseUrl: `http://${host}:${emulators.functions?.port || 5001}/${projectId}/us-central1`,
        },
        storage: {
          host,
          port: emulators.storage?.port || 9199,
        },
        hosting: {
          host,
          port: emulators.hosting?.port || 5000,
        },
      };
    } catch (error) {
      console.error('[ConfigService] ❌ Error loading firebase.json:', error);
      return this.getDefaultEmulatorConfig();
    }
  }

  /**
   * Get default emulator configuration (fallback)
   */
  private getDefaultEmulatorConfig(): EmulatorConfig {
    const host = 'localhost';
    const projectId = this.config?.firebase?.projectId || 'demo-project';

    return {
      auth: { host, port: 9099, url: `http://${host}:9099` },
      firestore: { host, port: 8080 },
      functions: { host, port: 5001, baseUrl: `http://${host}:5001/${projectId}/us-central1` },
      storage: { host, port: 9199 },
      hosting: { host, port: 5000 },
    };
  }

  /**
   * Get API base URL from environment or emulator config
   */
  private getApiBaseUrl(): string {
    // Explicit environment variable takes priority
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }

    // Use emulator config if available
    if (this.config.firebase.emulators) {
      return this.config.firebase.emulators.functions.baseUrl;
    }

    // Production URL (if set)
    if (process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL) {
      return process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL;
    }

    throw new ConfigurationError(
      'API base URL not configured',
      'No NEXT_PUBLIC_API_URL or Firebase Functions URL found',
      'Set NEXT_PUBLIC_API_URL in .env.local or ensure Firebase emulators are configured'
    );
  }

  /**
   * Log configuration for debugging
   */
  private logConfiguration(): void {
    console.log('[ConfigService] Configuration Summary:');
    console.log(`  Environment: ${this.config.environment}`);
    console.log(`  Project ID: ${this.config.firebase.projectId}`);
    console.log(`  Emulator Mode: ${this.isEmulatorMode()}`);
    console.log(`  API Base URL: ${this.config.api.baseUrl}`);

    if (this.isEmulatorMode() && this.config.firebase.emulators) {
      console.log('  Emulator Endpoints:');
      console.log(`    Auth: ${this.config.firebase.emulators.auth.url}`);
      console.log(`    Firestore: http://${this.config.firebase.emulators.firestore.host}:${this.config.firebase.emulators.firestore.port}`);
      console.log(`    Functions: ${this.config.firebase.emulators.functions.baseUrl}`);
    }
  }
}

/**
 * Export convenience function for getting config instance
 */
export function getConfig(): ConfigService {
  return ConfigService.getInstance();
}
```

### Step 3: Create Public Exports

Create `apps/web/src/config/index.ts`:

```typescript
/**
 * Configuration Module - Public Exports
 *
 * Central export point for all configuration-related functionality.
 * Use this module to import configuration throughout your application.
 *
 * @example
 * ```typescript
 * import { getConfig } from '@/config';
 *
 * const config = getConfig();
 * const emulators = config.getEmulatorConfig();
 * ```
 */

export { ConfigService, getConfig } from './firebase-config';
export type {
  AppConfig,
  FirebaseConfig,
  EmulatorConfig,
  EmulatorEndpoint,
  ValidationResult,
} from './types';
export { ConfigurationError, EmulatorNotRunningError } from './types';
```

### Step 4: Using ConfigService in Your Application

**Client-Side Firebase Initialization (Browser):**

Create `apps/web/src/lib/firebase.ts`:

```typescript
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';
import { getConfig } from '@/config';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

/**
 * Initialize Firebase (Client-side)
 * Safe to call multiple times - only initializes once
 */
export function initializeFirebase() {
  if (getApps().length > 0) {
    app = getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    return { app, auth, db, storage };
  }

  const config = getConfig();
  const firebaseConfig = config.getFirebaseConfig();

  // Initialize Firebase
  app = initializeApp({
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
  });

  // Initialize services
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  // Connect to emulators if in development
  if (config.isEmulatorMode()) {
    const emulators = config.getEmulatorConfig()!;

    connectAuthEmulator(auth, emulators.auth.url, { disableWarnings: true });
    connectFirestoreEmulator(db, emulators.firestore.host, emulators.firestore.port);
    connectStorageEmulator(storage, emulators.storage.host, emulators.storage.port);

    console.log('[Firebase] ✅ Connected to emulators');
  }

  return { app, auth, db, storage };
}

// Export initialized instances
export { app, auth, db, storage };
```

**Server-Side Firebase Admin Initialization:**

Create `apps/functions/src/config/firebase-admin.ts`:

```typescript
import * as admin from 'firebase-admin';
import { getConfig } from '../config';

let app: admin.app.App;

/**
 * Initialize Firebase Admin SDK
 * Safe to call multiple times - only initializes once
 */
export function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    app = admin.apps[0];
    return app;
  }

  const config = getConfig();
  const emulators = config.getEmulatorConfig();

  // Set emulator environment variables if in development
  if (emulators) {
    process.env.FIRESTORE_EMULATOR_HOST = `${emulators.firestore.host}:${emulators.firestore.port}`;
    process.env.FIREBASE_AUTH_EMULATOR_HOST = `${emulators.auth.host}:${emulators.auth.port}`;
  }

  // Initialize Firebase Admin
  app = admin.initializeApp({
    projectId: config.getFirebaseConfig().projectId,
  });

  return app;
}

export { app };
export const auth = admin.auth;
export const firestore = admin.firestore;
export const storage = admin.storage;
```

---

## Firebase Emulator Configuration

Firebase Emulators allow you to develop and test locally without touching production data.

### Emulator Architecture

```
Firebase Emulators (Single Process)
├── Auth Emulator          (Port 9099)
├── Firestore Emulator     (Port 8080)
├── Functions Emulator     (Port 5001)
├── Storage Emulator       (Port 9199)
└── Hosting Emulator       (Port 5000)
```

### Starting Emulators

**Method 1: Using npm script (Recommended)**
```bash
npm run firebase:emulators
```

**Method 2: Direct Firebase CLI**
```bash
firebase emulators:start
```

**Method 3: With UI**
```bash
firebase emulators:start --import=./emulator-data --export-on-exit
```

### Emulator Data Management

**Export emulator data:**
```bash
firebase emulators:export ./emulator-data
```

**Import emulator data on startup:**
```bash
firebase emulators:start --import=./emulator-data
```

**Auto-export on shutdown:**
```bash
firebase emulators:start --import=./emulator-data --export-on-exit
```

### Port Configuration Best Practices

**DO:**
- ✅ Define all ports in `firebase.json`
- ✅ Use ConfigService to read ports dynamically
- ✅ Document default ports in README
- ✅ Use standard ports across team

**DON'T:**
- ❌ Hardcode ports in application code
- ❌ Use different ports for different developers
- ❌ Forget to document port changes
- ❌ Mix production and emulator configuration

### Checking Emulator Status

Create `scripts/e2e-health.js`:

```javascript
#!/usr/bin/env node

/**
 * Health Check Script
 *
 * Verifies that all required services are running:
 * - Firebase Emulators (Auth, Firestore, Functions)
 * - Next.js Dev Server
 */

const http = require('http');

const services = [
  { name: 'Firebase Auth Emulator', url: 'http://localhost:9099' },
  { name: 'Firebase Firestore Emulator', url: 'http://localhost:8080' },
  { name: 'Firebase Functions Emulator', url: 'http://localhost:5001' },
  { name: 'Next.js Dev Server', url: 'http://localhost:3004' },
];

async function checkService(service) {
  return new Promise((resolve) => {
    const url = new URL(service.url);
    const req = http.get({ hostname: url.hostname, port: url.port, path: '/', timeout: 2000 }, (res) => {
      resolve({ ...service, status: 'online', statusCode: res.statusCode });
    });

    req.on('error', () => {
      resolve({ ...service, status: 'offline' });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ ...service, status: 'offline' });
    });
  });
}

async function main() {
  console.log('🔍 Checking service health...\n');

  const results = await Promise.all(services.map(checkService));

  let allHealthy = true;

  results.forEach((result) => {
    const icon = result.status === 'online' ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.status}`);
    if (result.status !== 'online') {
      allHealthy = false;
    }
  });

  console.log('');

  if (allHealthy) {
    console.log('✅ All services are healthy!');
    process.exit(0);
  } else {
    console.log('❌ Some services are not running.');
    console.log('   Run: npm run dev:all');
    process.exit(1);
  }
}

main();
```

Make it executable and add to package.json:
```json
{
  "scripts": {
    "e2e:health": "node scripts/e2e-health.js"
  }
}
```

---

## Environment Variable Management

### Priority Hierarchy

ConfigService loads environment variables in this order (highest to lowest priority):

1. **Process Environment Variables** (Highest - Runtime overrides)
2. **.env.local File** (Local development configuration)
3. **firebase.json** (Emulator defaults - Server-side only)
4. **Hardcoded Defaults** (Lowest - Fallback values)

### Creating .env.local.example

Create `apps/web/.env.local.example`:

```bash
# Firebase Project Configuration
# Get these values from Firebase Console > Project Settings

# Firebase Project ID (Required)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id

# Firebase Web App Configuration (Required for Production)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Optional: Override API URL (useful for custom domains)
# NEXT_PUBLIC_API_URL=http://localhost:5001/your-project-id/us-central1

# Optional: Override Firebase Functions URL for production
# NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL=https://us-central1-your-project-id.cloudfunctions.net

# Environment (development, staging, production)
NEXT_PUBLIC_APP_ENV=development
NODE_ENV=development
```

### Setting Up Local Environment

```bash
# Copy example to actual .env.local
cp apps/web/.env.local.example apps/web/.env.local

# Edit .env.local with your Firebase project values
# Get values from: https://console.firebase.google.com/ > Project Settings
```

### Environment Variable Naming Conventions

**Next.js Environment Variables:**
- `NEXT_PUBLIC_*` - Exposed to browser (use for client-side config)
- `*` (without prefix) - Server-side only (use for secrets)

**Firebase-specific:**
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Project ID (public, used everywhere)
- `NEXT_PUBLIC_FIREBASE_API_KEY` - API key (public, safe to expose)
- `FIREBASE_SERVICE_ACCOUNT` - Service account JSON (server-only, secret)

### Security Best Practices

**DO:**
- ✅ Add `.env.local` to `.gitignore`
- ✅ Provide `.env.local.example` with placeholders
- ✅ Use `NEXT_PUBLIC_*` only for truly public values
- ✅ Store secrets in CI/CD secret management
- ✅ Rotate API keys regularly

**DON'T:**
- ❌ Commit `.env.local` to Git
- ❌ Expose server-side secrets to browser
- ❌ Hardcode sensitive values in code
- ❌ Share `.env.local` via unsecure channels

---

## CI/CD Pipeline Setup

Setting up automated testing and deployment with GitHub Actions.

### Prerequisites

1. **GitHub Repository** - Your project must be on GitHub
2. **Firebase Project** - With deployment targets set up
3. **Service Account** - For Firebase deployment authentication

### Step 1: Create Firebase Service Account

```bash
# Login to Firebase
firebase login

# Create service account key
# Go to Firebase Console > Project Settings > Service Accounts
# Click "Generate new private key"
# Download the JSON file (keep it secure!)
```

### Step 2: Add GitHub Secrets

Go to your GitHub repo: **Settings > Secrets and variables > Actions > New repository secret**

Add the following secrets:

- `FIREBASE_SERVICE_ACCOUNT`: Paste the entire JSON content from service account key
- `FIREBASE_PROJECT_ID`: Your Firebase project ID

### Step 3: Create CI Testing Workflow

Create `.github/workflows/ci-testing.yml`:

```yaml
name: CI - Testing

on:
  push:
    branches: ['main', 'develop']
  pull_request:
    branches: ['main', 'develop']

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run typecheck

      - name: Run unit tests
        run: npm run test

      - name: Build project
        run: npm run build:all

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: |
            apps/web/.next
            apps/functions/lib
          retention-days: 7
```

### Step 4: Create Deployment Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build web app
        run: npm run build --workspace=apps/web

      - name: Build functions
        run: npm run build --workspace=apps/functions

      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: '${{ secrets.FIREBASE_PROJECT_ID }}'
          channelId: live
```

### Step 5: Handling Workspace Dependencies in CI

If you have workspace packages (like `packages/shared-types`), you need to bundle them for CI:

**Problem:** npm workspaces use `link:` protocol which doesn't work when packages aren't published to registry.

**Solution:** Bundle workspace packages as tarballs during CI build.

Add to `.github/workflows/ci-testing.yml` before build step:

```yaml
      - name: Bundle workspace packages
        run: |
          # Build shared-types package
          npm run build --workspace=packages/shared-types

          # Pack it as tarball
          cd packages/shared-types
          npm pack

          # Install the tarball in functions workspace
          cd ../../apps/functions
          npm install ../../packages/shared-types/*.tgz
```

This ensures the `shared-types` package is properly bundled and available during the functions build.

### Step 6: Testing the CI/CD Pipeline

```bash
# Create a test branch
git checkout -b test-ci-pipeline

# Make a small change (e.g., update README)
echo "Testing CI/CD" >> README.md

# Commit and push
git add .
git commit -m "test: CI/CD pipeline"
git push origin test-ci-pipeline

# Create pull request on GitHub
# Watch GitHub Actions tab for workflow execution
```

---

## Testing Strategies

### Test Pyramid

```
         E2E Tests (Few, Slow)
       /                      \
      Integration Tests (Some)
     /                          \
   Unit Tests (Many, Fast)
```

### Unit Testing with Firebase Emulators

**Setup Jest with Firebase Emulators:**

Create `apps/web/jest.config.js`:

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
```

Create `apps/web/jest.setup.js`:

```javascript
// Set test environment variables
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'demo-test-project';
process.env.NODE_ENV = 'test';

// Mock Firebase if needed
jest.mock('firebase/app');
jest.mock('firebase/auth');
jest.mock('firebase/firestore');
```

**Example Unit Test:**

```typescript
// src/config/__tests__/firebase-config.test.ts

import { ConfigService } from '../firebase-config';

describe('ConfigService', () => {
  beforeEach(() => {
    ConfigService.resetInstance();
  });

  it('should be a singleton', () => {
    const instance1 = ConfigService.getInstance();
    const instance2 = ConfigService.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should detect development environment', () => {
    const config = ConfigService.getInstance();
    expect(config.getEnvironment()).toBe('development');
  });

  it('should load emulator config in development', () => {
    const config = ConfigService.getInstance();
    const emulators = config.getEmulatorConfig();

    expect(emulators).toBeDefined();
    expect(emulators?.auth.port).toBe(9099);
    expect(emulators?.firestore.port).toBe(8080);
  });

  it('should validate required configuration', () => {
    const config = ConfigService.getInstance();
    const validation = config.validate();

    expect(validation.valid).toBe(true);
    expect(validation.errors).toBeUndefined();
  });
});
```

### Integration Testing

**Example Integration Test with Firestore Emulator:**

```typescript
// src/__tests__/firestore-integration.test.ts

import { initializeFirebaseAdmin } from '@/config/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

describe('Firestore Integration', () => {
  let db: FirebaseFirestore.Firestore;

  beforeAll(() => {
    const app = initializeFirebaseAdmin();
    db = getFirestore(app);
  });

  beforeEach(async () => {
    // Clear Firestore emulator data
    const collections = await db.listCollections();
    const deletePromises = collections.map(async (collection) => {
      const docs = await collection.listDocuments();
      return Promise.all(docs.map((doc) => doc.delete()));
    });
    await Promise.all(deletePromises);
  });

  it('should create and retrieve a document', async () => {
    const testData = { name: 'Test User', email: 'test@example.com' };

    // Create document
    const docRef = await db.collection('users').add(testData);

    // Retrieve document
    const doc = await docRef.get();

    expect(doc.exists).toBe(true);
    expect(doc.data()).toEqual(expect.objectContaining(testData));
  });
});
```

### E2E Testing with Playwright

**Install Playwright:**

```bash
npm install -D @playwright/test
npx playwright install
```

**Configure Playwright:**

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3004',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3004',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

**Example E2E Test:**

```typescript
// tests/e2e/auth.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should allow user to sign in', async ({ page }) => {
    await page.goto('/');

    // Click sign in button
    await page.click('text=Sign In');

    // Fill in credentials
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard');

    // Verify user is signed in
    await expect(page.locator('text=Welcome')).toBeVisible();
  });
});
```

### Test Isolation Strategies

**Problem:** Tests can pollute each other's data in Firebase emulators.

**Solutions:**

1. **Clear emulator data between tests** (shown in integration test example above)

2. **Use unique collection/document IDs per test:**
   ```typescript
   const testId = `test-${Date.now()}`;
   const collection = db.collection(`users-${testId}`);
   ```

3. **Run tests sequentially** (not in parallel):
   ```json
   {
     "scripts": {
       "test:integration": "jest --runInBand"
     }
   }
   ```

---

## Development Workflow

### Daily Development Flow

```bash
# 1. Start all services
npm run dev:all

# This starts:
# - Firebase Emulators (Auth, Firestore, Functions)
# - Next.js Dev Server (http://localhost:3004)

# 2. Check health status
npm run e2e:health

# 3. Develop your features
# - Edit files in apps/web/src
# - Hot reload works automatically

# 4. Run tests
npm run test

# 5. Commit changes
git add .
git commit -m "feat: your feature description"
git push
```

### Automated Setup Script

The setup script (`scripts/setup.js`) from earlier automates initial developer onboarding. New developers can get started with:

```bash
# Clone repository
git clone <repository-url>
cd <repository-name>

# Run automated setup
npm run setup

# Start development
npm run dev:all
```

The script:
1. ✅ Validates Node.js version
2. ✅ Checks Firebase CLI installation
3. ✅ Installs npm dependencies
4. ✅ Creates `.env.local` from example
5. ✅ Runs health check

### Debugging Tips

**View Emulator Logs:**
```bash
# Firebase emulator logs are shown in terminal where you ran:
npm run firebase:emulators

# Look for:
# - Port binding messages
# - Error messages
# - Request logs
```

**Debug ConfigService:**
```typescript
// Enable verbose logging
const config = ConfigService.getInstance();
console.log('Config:', config.getFirebaseConfig());
console.log('Emulators:', config.getEmulatorConfig());
```

**Check Emulator Connectivity:**
```bash
# Test Auth emulator
curl http://localhost:9099

# Test Firestore emulator
curl http://localhost:8080

# Test Functions emulator
curl http://localhost:5001
```

---

## Troubleshooting

### Common Issues

#### Issue 1: "Firebase emulators are not running"

**Symptoms:**
- Application fails to start
- ConfigurationError thrown
- Cannot connect to emulators

**Solutions:**
1. Start emulators: `npm run firebase:emulators`
2. Check emulator status: `npm run e2e:health`
3. Verify ports in `firebase.json` match expected ports
4. Check if ports are already in use:
   ```bash
   # Windows
   netstat -ano | findstr :9099

   # Mac/Linux
   lsof -i :9099
   ```

#### Issue 2: "Port already in use"

**Symptoms:**
- Error: "EADDRINUSE: address already in use"
- Emulators fail to start

**Solutions:**
1. Find process using port:
   ```bash
   # Windows
   netstat -ano | findstr :<PORT>
   taskkill /PID <PID> /F

   # Mac/Linux
   lsof -ti :<PORT> | xargs kill -9
   ```

2. Change port in `firebase.json` (if necessary)

#### Issue 3: "Configuration validation failed"

**Symptoms:**
- ConfigurationError during startup
- Missing required fields

**Solutions:**
1. Check `.env.local` exists: `ls apps/web/.env.local`
2. Verify `NEXT_PUBLIC_FIREBASE_PROJECT_ID` is set
3. For production, ensure all required fields are set
4. Review ConfigService validation output in console

#### Issue 4: "firebase.json not found"

**Symptoms:**
- Warning: "firebase.json not found, using defaults"
- Emulator config falls back to defaults

**Solutions:**
1. Ensure `firebase.json` is in project root
2. Run `firebase init` if missing
3. Verify file path in ConfigService

#### Issue 5: Workspace Package Resolution in CI

**Symptoms:**
- CI build fails with "Cannot find module 'shared-types'"
- Works locally but not in GitHub Actions

**Solutions:**
1. Bundle workspace packages as tarballs (see CI/CD section)
2. Ensure build order is correct (shared packages first)
3. Use `npm pack` to create tarball
4. Install tarball with absolute path: `npm install ../../package.tgz`

#### Issue 6: Next.js Build Fails

**Symptoms:**
- "Module not found" errors
- Type errors during build

**Solutions:**
1. Clear Next.js cache:
   ```bash
   rm -rf apps/web/.next
   npm run build
   ```

2. Reinstall dependencies:
   ```bash
   rm -rf node_modules apps/*/node_modules
   npm install
   ```

3. Check TypeScript configuration in `tsconfig.json`

#### Issue 7: Environment Variables Not Loading

**Symptoms:**
- `process.env.NEXT_PUBLIC_*` is undefined
- Config values are falling back to defaults

**Solutions:**
1. Restart Next.js dev server (required for `.env.local` changes)
2. Verify variable names start with `NEXT_PUBLIC_` for client-side
3. Check `.env.local` is in `apps/web/` directory
4. Ensure no trailing spaces in `.env.local`

### Getting Help

If you're still stuck:

1. **Check logs**: Review console output for detailed error messages
2. **Review documentation**: See Firebase docs at https://firebase.google.com/docs
3. **Search issues**: Check GitHub issues for similar problems
4. **Ask for help**: Reach out to team or create new GitHub issue

---

## Next Steps

Congratulations! You now have a fully functional Firebase + Next.js project with CI/CD pipeline.

### Recommended Next Actions

1. **Add Firebase Security Rules**
   - Edit `firestore.rules`
   - Edit `storage.rules`
   - Test rules with Firebase Emulator

2. **Implement Authentication**
   - Add sign-in/sign-up pages
   - Implement protected routes
   - Add user profile management

3. **Create Firebase Functions**
   - Add HTTP endpoints
   - Add Firestore triggers
   - Add scheduled functions

4. **Enhance Testing**
   - Add more unit tests
   - Create integration test suite
   - Build E2E test coverage

5. **Deploy to Production**
   - Configure production Firebase project
   - Set up custom domain
   - Enable monitoring and analytics

### Further Reading

- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Epic 4 Case Study](./EPIC-4-CASE-STUDY.md) - Learn from our experience
- [Common Pitfalls](./PITFALLS-AND-SOLUTIONS.md) - Avoid known issues
- [Reusable Patterns](./REUSABLE-PATTERNS.md) - Implementation patterns

---

**Document Version:** 1.0
**Last Updated:** 2025-10-16
**Maintained By:** SavvyProxy Team
**License:** MIT

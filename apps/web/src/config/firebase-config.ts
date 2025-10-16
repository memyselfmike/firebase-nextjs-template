/**
 * Firebase Configuration Service
 *
 * Centralized configuration management for your Firebase + Next.js application.
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
 *
 * @example
 * ```typescript
 * import { ConfigService } from '@/config/firebase-config';
 *
 * const config = ConfigService.getInstance();
 * const emulators = config.getEmulatorConfig();
 *
 * if (emulators) {
 *   connectFirestoreEmulator(db, emulators.firestore.host, emulators.firestore.port);
 * }
 * ```
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
    // IMPORTANT: Replace 'demo-project' with your actual Firebase project ID
    // Or set NEXT_PUBLIC_FIREBASE_PROJECT_ID in your .env.local file
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
        console.warn('[ConfigService] ⚠️  firebase.json not found, using defaults');
        return this.getDefaultEmulatorConfig();
      }

      const firebaseJson = JSON.parse(fs.readFileSync(firebasePath, 'utf-8'));

      if (!firebaseJson.emulators) {
        console.warn('[ConfigService] ⚠️  No emulator config in firebase.json');
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

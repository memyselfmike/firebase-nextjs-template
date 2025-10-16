/**
 * Firebase Infrastructure Configuration Types
 *
 * Provides type-safe interfaces for all configuration values
 * used throughout your Firebase + Next.js application.
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

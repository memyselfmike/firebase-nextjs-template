/**
 * Firebase Configuration Module
 *
 * Re-exports all configuration utilities and types for convenient importing.
 *
 * @example
 * ```typescript
 * import { ConfigService, getConfig } from '@/config';
 *
 * const config = getConfig();
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

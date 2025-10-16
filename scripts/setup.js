#!/usr/bin/env node

/**
 * Firebase + Next.js Template - Development Environment Setup Script
 *
 * Automates initial setup for new developers:
 * 1. Validates Node.js version (>= 18)
 * 2. Checks Firebase CLI is installed
 * 3. Installs npm dependencies if needed
 * 4. Creates .env.local from .env.local.example if missing
 * 5. Runs health check to validate setup
 * 6. Displays success message with next steps
 *
 * Usage: npm run setup
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('\n' + '═'.repeat(64));
  log(message, 'bright');
  console.log('═'.repeat(64) + '\n');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'blue');
}

/**
 * Check Node.js version
 */
function checkNodeVersion() {
  logStep('1/5', 'Validating Node.js version...');

  const currentVersion = process.version;
  const versionNumber = parseInt(currentVersion.slice(1).split('.')[0]);
  const requiredVersion = 18;

  logInfo(`Current version: ${currentVersion}`);

  if (versionNumber >= requiredVersion) {
    logSuccess(`Node.js ${requiredVersion}+ requirement met`);
    return true;
  } else {
    logError(`Node.js ${requiredVersion} or higher is required`);
    logInfo(`Please upgrade Node.js: https://nodejs.org/`);
    return false;
  }
}

/**
 * Check if Firebase CLI is installed
 */
function checkFirebaseCli() {
  logStep('2/5', 'Checking Firebase CLI...');

  try {
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'firebase.cmd' : 'firebase';
    const version = execSync(`${command} --version`, { encoding: 'utf8' }).trim();
    logInfo(`Firebase CLI version: ${version}`);
    logSuccess('Firebase CLI is installed');
    return true;
  } catch (error) {
    logError('Firebase CLI is not installed');
    logInfo('Install with: npm install -g firebase-tools');
    logInfo('Or visit: https://firebase.google.com/docs/cli');
    return false;
  }
}

/**
 * Check and install npm dependencies
 */
function checkDependencies() {
  logStep('3/5', 'Checking npm dependencies...');

  const rootNodeModules = path.join(__dirname, '..', 'node_modules');
  const webNodeModules = path.join(__dirname, '..', 'apps', 'web', 'node_modules');

  const rootExists = fs.existsSync(rootNodeModules);
  const webExists = fs.existsSync(webNodeModules);

  if (rootExists && webExists) {
    logSuccess('Dependencies already installed');
    return true;
  }

  logWarning('Some dependencies are missing');
  logInfo('Installing dependencies... (this may take a few minutes)');

  try {
    execSync('npm install', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    logSuccess('Dependencies installed successfully');
    return true;
  } catch (error) {
    logError('Failed to install dependencies');
    logInfo('Please run: npm install');
    return false;
  }
}

/**
 * Create .env.local from .env.local.example if missing
 */
function setupEnvironmentFile() {
  logStep('4/5', 'Setting up environment configuration...');

  const envExample = path.join(__dirname, '..', 'apps', 'web', '.env.local.example');
  const envLocal = path.join(__dirname, '..', 'apps', 'web', '.env.local');

  if (!fs.existsSync(envExample)) {
    logError('.env.local.example not found');
    logInfo('Expected location: apps/web/.env.local.example');
    return false;
  }

  if (fs.existsSync(envLocal)) {
    logSuccess('.env.local already exists');
    return true;
  }

  try {
    fs.copyFileSync(envExample, envLocal);
    logSuccess('Created .env.local from .env.local.example');
    logWarning('Please update .env.local with your Firebase project credentials');
    logInfo('Location: apps/web/.env.local');
    return true;
  } catch (error) {
    logError('Failed to create .env.local');
    logInfo(`Error: ${error.message}`);
    return false;
  }
}

/**
 * Run health check to validate setup
 */
async function runHealthCheck() {
  logStep('5/5', 'Validating setup with health check...');

  const healthScript = path.join(__dirname, 'e2e-health.js');

  if (!fs.existsSync(healthScript)) {
    logWarning('Health check script not found');
    logInfo('You can manually verify setup by running: npm run dev:all');
    return true; // Not a critical failure
  }

  logInfo('This will check if Firebase emulators and Next.js are running...');
  logInfo('If services are not running, this check will fail (expected)');

  return new Promise((resolve) => {
    const child = spawn('node', [healthScript], {
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      if (code === 0) {
        logSuccess('Services are running and healthy!');
        resolve(true);
      } else {
        logWarning('Services are not currently running (this is normal)');
        logInfo('Start services with: npm run dev:all');
        resolve(true); // Not a critical failure for setup
      }
    });

    child.on('error', (error) => {
      logWarning('Could not run health check');
      logInfo('You can manually verify setup by running: npm run dev:all');
      resolve(true); // Not a critical failure
    });
  });
}

/**
 * Display success message with next steps
 */
function displaySuccessMessage() {
  logHeader('✅ Setup Complete!');

  console.log('Your Firebase + Next.js development environment is ready.\n');

  log('Next Steps:', 'bright');
  console.log('');
  console.log('  1. Start the development environment:');
  log('     npm run dev:all', 'cyan');
  console.log('');
  console.log('  2. This will start:');
  console.log('     • Firebase Emulators (Auth, Firestore, Functions)');
  console.log('     • Next.js Dev Server');
  console.log('');
  console.log('  3. Access the application:');
  log('     http://localhost:3004', 'cyan');
  console.log('');
  console.log('  4. Other useful commands:');
  log('     npm run e2e:health     ', 'cyan') + '- Check service health';
  log('     npm run test:e2e       ', 'cyan') + '- Run E2E tests';
  log('     npm run seed:all       ', 'cyan') + '- Seed sample data';
  console.log('');

  logInfo('Documentation: See README.md for detailed guides');
  console.log('');
}

/**
 * Display failure message with troubleshooting steps
 */
function displayFailureMessage(failedChecks) {
  logHeader('❌ Setup Incomplete');

  console.log('The following issues need to be resolved:\n');

  failedChecks.forEach((check, index) => {
    console.log(`  ${index + 1}. ${check.message}`);
    if (check.resolution) {
      log(`     → ${check.resolution}`, 'cyan');
    }
    console.log('');
  });

  logInfo('Please resolve these issues and run: npm run setup');
  console.log('');
}

/**
 * Main execution
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Firebase + Next.js Template - Environment Setup        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const failedChecks = [];

  // Step 1: Check Node.js version
  if (!checkNodeVersion()) {
    failedChecks.push({
      message: 'Node.js version requirement not met',
      resolution: 'Install Node.js 18 or higher from https://nodejs.org/',
    });
  }

  // Step 2: Check Firebase CLI
  if (!checkFirebaseCli()) {
    failedChecks.push({
      message: 'Firebase CLI not installed',
      resolution: 'Run: npm install -g firebase-tools',
    });
  }

  // Step 3: Install dependencies
  if (!checkDependencies()) {
    failedChecks.push({
      message: 'Failed to install npm dependencies',
      resolution: 'Run: npm install',
    });
  }

  // Step 4: Setup environment file
  if (!setupEnvironmentFile()) {
    failedChecks.push({
      message: 'Failed to create .env.local',
      resolution: 'Manually copy apps/web/.env.local.example to apps/web/.env.local',
    });
  }

  // Step 5: Run health check
  await runHealthCheck();

  // Display results
  console.log('');
  if (failedChecks.length === 0) {
    displaySuccessMessage();
    process.exit(0);
  } else {
    displayFailureMessage(failedChecks);
    process.exit(1);
  }
}

// Run the setup
main().catch((error) => {
  logError(`Setup failed with error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

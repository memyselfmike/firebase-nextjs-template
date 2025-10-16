#!/usr/bin/env node

/**
 * E2E Environment Startup Script
 *
 * Starts all services required for E2E testing:
 * 1. Firebase Emulators (Auth, Firestore, Functions, Storage, Hosting)
 * 2. Next.js Dev Server (port 3004)
 *
 * This script handles:
 * - Checking if services are already running
 * - Starting services in background
 * - Waiting for services to be ready
 * - Health checks for all services
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const isWindows = process.platform === 'win32';

// Service configuration
const SERVICES = {
  emulators: {
    name: 'Firebase Emulators',
    command: isWindows ? 'firebase.cmd' : 'firebase',
    args: ['emulators:start'],
    cwd: path.resolve(__dirname, '../../..'), // Root directory
    healthChecks: [
      { name: 'Auth', url: 'http://localhost:9099' },
      { name: 'Firestore', url: 'http://localhost:8081' },
      { name: 'Functions', url: 'http://localhost:5002' },
    ],
    pidFile: path.resolve(__dirname, '../.e2e-emulators.pid'),
  },
  nextjs: {
    name: 'Next.js Dev Server',
    command: isWindows ? 'npm.cmd' : 'npm',
    args: ['run', 'dev'],
    cwd: path.resolve(__dirname, '..'),
    healthChecks: [
      { name: 'Next.js', url: 'http://localhost:3004' },
    ],
    pidFile: path.resolve(__dirname, '../.e2e-nextjs.pid'),
  },
};

const runningProcesses = [];

/**
 * Check if a service is already running
 */
async function isServiceRunning(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: '/',
      method: 'GET',
      timeout: 2000,
    }, (res) => {
      resolve(true);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Wait for a service to become available
 */
async function waitForService(name, url, maxAttempts = 60, interval = 2000) {
  console.log(`⏳ Waiting for ${name} at ${url}...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const isRunning = await isServiceRunning(url);

    if (isRunning) {
      console.log(`✅ ${name} is ready!`);
      return true;
    }

    process.stdout.write(`   Attempt ${attempt}/${maxAttempts}...\r`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  console.error(`❌ ${name} failed to start after ${maxAttempts} attempts`);
  return false;
}

/**
 * Start a service
 */
async function startService(serviceConfig) {
  const { name, command, args, cwd, healthChecks, pidFile } = serviceConfig;

  console.log(`\n🚀 Starting ${name}...`);
  console.log(`   Command: ${command} ${args.join(' ')}`);
  console.log(`   Directory: ${cwd}`);

  // Check if already running
  const firstHealthCheck = healthChecks[0];
  if (await isServiceRunning(firstHealthCheck.url)) {
    console.log(`✅ ${name} is already running`);
    return true;
  }

  // Start the service
  const proc = spawn(command, args, {
    cwd,
    detached: !isWindows,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWindows,
  });

  // Save PID for cleanup
  if (pidFile) {
    fs.writeFileSync(pidFile, proc.pid.toString());
  }

  runningProcesses.push({ name, proc, pidFile });

  // Log output for debugging
  proc.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`   [${name}] ${output}`);
    }
  });

  proc.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output && !output.includes('Debugger attached')) {
      console.error(`   [${name} ERROR] ${output}`);
    }
  });

  proc.on('error', (error) => {
    console.error(`❌ ${name} process error:`, error);
  });

  proc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`❌ ${name} exited with code ${code}`);
    }
  });

  // Wait for all health checks to pass
  console.log(`\n⏳ Performing health checks for ${name}...`);

  for (const healthCheck of healthChecks) {
    const ready = await waitForService(healthCheck.name, healthCheck.url);
    if (!ready) {
      console.error(`❌ Health check failed for ${healthCheck.name}`);
      return false;
    }
  }

  return true;
}

/**
 * Cleanup on exit
 */
function cleanup() {
  console.log('\n\n🧹 Cleaning up...');

  runningProcesses.forEach(({ name, proc, pidFile }) => {
    try {
      if (isWindows) {
        spawn('taskkill', ['/pid', proc.pid, '/f', '/t'], { shell: true });
      } else {
        process.kill(-proc.pid, 'SIGTERM');
      }
      console.log(`   Stopped ${name}`);

      if (pidFile && fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
      }
    } catch (error) {
      console.error(`   Failed to stop ${name}:`, error.message);
    }
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      E2E Environment Startup - SavvyProxy                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });

  // Start Firebase Emulators
  const emulatorsStarted = await startService(SERVICES.emulators);
  if (!emulatorsStarted) {
    console.error('\n❌ Failed to start Firebase Emulators');
    cleanup();
    process.exit(1);
  }

  // Start Next.js Dev Server
  const nextjsStarted = await startService(SERVICES.nextjs);
  if (!nextjsStarted) {
    console.error('\n❌ Failed to start Next.js Dev Server');
    cleanup();
    process.exit(1);
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ E2E Environment Ready!                                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n📍 Service URLs:');
  console.log('   Next.js:   http://localhost:3004');
  console.log('   Auth:      http://localhost:9099');
  console.log('   Firestore: http://localhost:8081');
  console.log('   Functions: http://localhost:5002');
  console.log('\n💡 Services are running in the background');
  console.log('   Run "npm run e2e:stop" to stop all services\n');
}

main().catch((error) => {
  console.error('❌ Startup failed:', error);
  cleanup();
  process.exit(1);
});

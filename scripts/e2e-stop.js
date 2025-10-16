#!/usr/bin/env node

/**
 * E2E Environment Shutdown Script
 *
 * Stops all services started by e2e-start.js:
 * 1. Next.js Dev Server
 * 2. Firebase Emulators
 *
 * This script handles:
 * - Finding running processes by PID files
 * - Graceful shutdown with fallback to force kill
 * - Port cleanup on Windows
 * - Cleanup of PID files
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);
const isWindows = process.platform === 'win32';

// PID file locations
const PID_FILES = {
  emulators: path.resolve(__dirname, '../.e2e-emulators.pid'),
  nextjs: path.resolve(__dirname, '../.e2e-nextjs.pid'),
};

// Port configuration (for Windows cleanup)
const PORTS = [3004, 9099, 8081, 5002, 9199, 5000];

/**
 * Kill process by PID
 */
async function killProcess(pid, name) {
  try {
    if (isWindows) {
      // On Windows, use taskkill with /T to kill child processes
      await execAsync(`taskkill /pid ${pid} /f /t`);
    } else {
      // On Unix, kill the process group
      process.kill(-pid, 'SIGTERM');

      // Wait a bit, then force kill if still running
      await new Promise(resolve => setTimeout(resolve, 2000));

      try {
        process.kill(-pid, 'SIGKILL');
      } catch (error) {
        // Process already dead, ignore
      }
    }

    console.log(`✅ Stopped ${name} (PID: ${pid})`);
    return true;
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('No such process')) {
      console.log(`   ${name} (PID: ${pid}) was not running`);
      return true;
    }
    console.error(`❌ Failed to stop ${name} (PID: ${pid}):`, error.message);
    return false;
  }
}

/**
 * Stop service using PID file
 */
async function stopServiceByPidFile(pidFile, name) {
  if (!fs.existsSync(pidFile)) {
    console.log(`   No PID file for ${name}`);
    return true;
  }

  try {
    const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim());

    if (isNaN(pid)) {
      console.log(`   Invalid PID in ${pidFile}`);
      fs.unlinkSync(pidFile);
      return true;
    }

    const stopped = await killProcess(pid, name);

    // Clean up PID file
    if (fs.existsSync(pidFile)) {
      fs.unlinkSync(pidFile);
    }

    return stopped;
  } catch (error) {
    console.error(`   Error reading PID file for ${name}:`, error.message);

    if (fs.existsSync(pidFile)) {
      fs.unlinkSync(pidFile);
    }

    return false;
  }
}

/**
 * Find and kill processes by port (Windows fallback)
 */
async function killProcessOnPort(port) {
  if (!isWindows) return;

  try {
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    const lines = stdout.trim().split('\n');

    for (const line of lines) {
      const match = line.match(/LISTENING\s+(\d+)/);
      if (match) {
        const pid = match[1];
        try {
          await execAsync(`taskkill /pid ${pid} /f /t`);
          console.log(`   Killed process on port ${port} (PID: ${pid})`);
        } catch (error) {
          // Process might already be dead
        }
      }
    }
  } catch (error) {
    // No process found on port, that's fine
  }
}

/**
 * Stop Firebase Emulators using Firebase CLI
 */
async function stopFirebaseEmulators() {
  try {
    const firebaseCmd = isWindows ? 'firebase.cmd' : 'firebase';
    const projectRoot = path.resolve(__dirname, '../../..');

    console.log('🔥 Stopping Firebase Emulators...');

    await execAsync(`${firebaseCmd} emulators:kill`, {
      cwd: projectRoot,
      timeout: 10000,
    });

    console.log('✅ Firebase Emulators stopped');
  } catch (error) {
    // Emulators might not be running, that's okay
    console.log('   Firebase Emulators were not running');
  }
}

/**
 * Clean up all ports (Windows)
 */
async function cleanupPorts() {
  if (!isWindows) return;

  console.log('\n🧹 Cleaning up ports...');

  for (const port of PORTS) {
    await killProcessOnPort(port);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      E2E Environment Shutdown - SavvyProxy                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Stop Next.js Dev Server
  console.log('⏹️  Stopping Next.js Dev Server...');
  await stopServiceByPidFile(PID_FILES.nextjs, 'Next.js');

  // Stop Firebase Emulators (try multiple methods)
  console.log('\n⏹️  Stopping Firebase Emulators...');
  await stopServiceByPidFile(PID_FILES.emulators, 'Firebase Emulators');
  await stopFirebaseEmulators();

  // Clean up ports on Windows
  if (isWindows) {
    await cleanupPorts();
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ E2E Environment Stopped                                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

main().catch((error) => {
  console.error('❌ Shutdown failed:', error);
  process.exit(1);
});

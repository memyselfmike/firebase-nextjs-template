#!/usr/bin/env node

/**
 * E2E Environment Health Check Script
 *
 * Validates that all required services are running and responding:
 * 1. Next.js Dev Server (port 3004)
 * 2. Firebase Auth Emulator (port 9099)
 * 3. Firebase Firestore Emulator (port 8081)
 * 4. Firebase Functions Emulator (port 5002)
 *
 * Exit codes:
 * 0 - All services healthy
 * 1 - One or more services not responding
 */

const http = require('http');

// Health check configuration
const HEALTH_CHECKS = [
  { name: 'Next.js Dev Server', url: 'http://localhost:3004', required: true },
  { name: 'Firebase Auth', url: 'http://localhost:9099', required: true },
  { name: 'Firebase Firestore', url: 'http://localhost:8081', required: true },
  { name: 'Firebase Functions', url: 'http://localhost:5002', required: true },
  { name: 'Firebase Storage', url: 'http://localhost:9199', required: false },
  { name: 'Firebase Hosting', url: 'http://localhost:5000', required: false },
];

/**
 * Check if a service is responding
 */
async function checkService(name, url, timeout = 5000) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const startTime = Date.now();

    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: '/',
      method: 'GET',
      timeout,
    }, (res) => {
      const responseTime = Date.now() - startTime;
      resolve({
        healthy: true,
        responseTime,
        status: res.statusCode,
      });
    });

    req.on('error', (error) => {
      resolve({
        healthy: false,
        error: error.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        healthy: false,
        error: 'Connection timeout',
      });
    });

    req.end();
  });
}

/**
 * Format response time
 */
function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      E2E Environment Health Check - SavvyProxy            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const results = [];
  let hasFailures = false;

  console.log('🔍 Checking services...\n');

  for (const check of HEALTH_CHECKS) {
    process.stdout.write(`   ${check.name.padEnd(30)} `);

    const result = await checkService(check.name, check.url);

    if (result.healthy) {
      const timeStr = formatTime(result.responseTime);
      console.log(`✅ OK (${timeStr})`);
      results.push({ ...check, ...result, passed: true });
    } else {
      if (check.required) {
        console.log(`❌ FAILED - ${result.error}`);
        results.push({ ...check, ...result, passed: false });
        hasFailures = true;
      } else {
        console.log(`⚠️  NOT RUNNING (optional)`);
        results.push({ ...check, ...result, passed: true });
      }
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(64));

  if (hasFailures) {
    console.log('\n❌ Health Check FAILED\n');
    console.log('The following required services are not responding:');

    results.forEach(result => {
      if (!result.passed && result.required) {
        console.log(`   - ${result.name}: ${result.error}`);
      }
    });

    console.log('\n💡 To start the E2E environment:');
    console.log('   npm run e2e:start\n');

    process.exit(1);
  }

  console.log('\n✅ All Services Healthy!\n');
  console.log('📍 Service URLs:');
  results.forEach(result => {
    if (result.healthy) {
      console.log(`   ${result.name.padEnd(30)} ${result.url}`);
    }
  });

  console.log('\n🎉 E2E environment is ready for testing!\n');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Health check failed:', error);
  process.exit(1);
});

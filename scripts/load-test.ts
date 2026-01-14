// ==================== gRPC LOAD TEST ====================
// Performance testing script using Node.js

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.join(__dirname, '../proto/user/user_service.proto');
const USER_SERVICE_ADDR = process.env.USER_SERVICE_GRPC || 'localhost:50051';

// Load proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: [path.join(__dirname, '../proto')],
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const UserService = protoDescriptor.user.UserService;

// Create client
const client = new UserService(
  USER_SERVICE_ADDR,
  grpc.credentials.createInsecure()
);

/**
 * Performance test: Measure latency
 */
async function testLatency(iterations: number = 100): Promise<void> {
  console.log(`\n🚀 Testing gRPC latency (${iterations} iterations)...\n`);

  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();

    await new Promise((resolve, reject) => {
      client.searchCandidates(
        {
          pagination: { page: 1, limit: 10 },
        },
        (err: any, response: any) => {
          if (err) reject(err);
          else resolve(response);
        }
      );
    });

    const latency = Date.now() - start;
    latencies.push(latency);

    if ((i + 1) % 20 === 0) {
      process.stdout.write(`Progress: ${i + 1}/${iterations}\r`);
    }
  }

  // Calculate stats
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const sorted = latencies.sort((a, b) => a - b);
  const p50 = sorted[Math.floor(latencies.length * 0.5)];
  const p95 = sorted[Math.floor(latencies.length * 0.95)];
  const p99 = sorted[Math.floor(latencies.length * 0.99)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  console.log('\n📊 Latency Statistics:');
  console.log(`   Average: ${avg.toFixed(2)}ms`);
  console.log(`   P50:     ${p50}ms`);
  console.log(`   P95:     ${p95}ms`);
  console.log(`   P99:     ${p99}ms`);
  console.log(`   Min:     ${min}ms`);
  console.log(`   Max:     ${max}ms`);
}

/**
 * Performance test: Measure throughput
 */
async function testThroughput(duration: number = 10000): Promise<void> {
  console.log(`\n🚀 Testing gRPC throughput (${duration}ms duration)...\n`);

  const startTime = Date.now();
  let requests = 0;
  let errors = 0;

  const promises: Promise<void>[] = [];

  // Send requests continuously for the duration
  while (Date.now() - startTime < duration) {
    const promise = new Promise<void>((resolve) => {
      client.searchCandidates(
        {
          pagination: { page: 1, limit: 10 },
        },
        (err: any) => {
          if (err) errors++;
          else requests++;
          resolve();
        }
      );
    });

    promises.push(promise);
  }

  await Promise.all(promises);

  const actualDuration = (Date.now() - startTime) / 1000;
  const rps = requests / actualDuration;

  console.log('📊 Throughput Statistics:');
  console.log(`   Total Requests:  ${requests}`);
  console.log(`   Errors:          ${errors}`);
  console.log(`   Duration:        ${actualDuration.toFixed(2)}s`);
  console.log(`   Requests/Second: ${rps.toFixed(2)}`);
  console.log(`   Error Rate:      ${((errors / (requests + errors)) * 100).toFixed(2)}%`);
}

/**
 * Compare batch vs individual requests
 */
async function testBatchVsIndividual(userIds: string[]): Promise<void> {
  console.log('\n🚀 Testing Batch vs Individual requests...\n');

  // Test individual requests
  console.log('Testing individual requests...');
  const individualStart = Date.now();
  const individualPromises = userIds.map(
    (userId) =>
      new Promise((resolve, reject) => {
        client.getUser({ user_id: userId }, (err: any, response: any) => {
          if (err) reject(err);
          else resolve(response);
        });
      })
  );

  try {
    await Promise.all(individualPromises);
    const individualTime = Date.now() - individualStart;
    console.log(`✅ Individual requests: ${individualTime}ms (${userIds.length} requests)`);
  } catch (error: any) {
    console.log(`❌ Individual requests failed:`, error.message);
  }

  // Test batch request
  console.log('Testing batch request...');
  const batchStart = Date.now();

  try {
    await new Promise((resolve, reject) => {
      client.batchGetUsers({ user_ids: userIds }, (err: any, response: any) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
    const batchTime = Date.now() - batchStart;
    console.log(`✅ Batch request: ${batchTime}ms (1 request for ${userIds.length} users)`);

    // Calculate improvement
    const individualTime = Date.now() - individualStart;
    const improvement = ((individualTime - batchTime) / individualTime) * 100;
    console.log(`\n💡 Batch is ${improvement.toFixed(1)}% faster!`);
  } catch (error: any) {
    console.log(`❌ Batch request failed:`, error.message);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     gRPC Performance Test Suite        ║');
  console.log('╚════════════════════════════════════════╝');

  const testType = process.argv[2] || 'latency';

  try {
    switch (testType) {
      case 'latency':
        await testLatency(100);
        break;

      case 'throughput':
        await testThroughput(10000);
        break;

      case 'batch':
        // Replace with actual user IDs
        const userIds = ['user1', 'user2', 'user3', 'user4', 'user5'];
        await testBatchVsIndividual(userIds);
        break;

      case 'all':
        await testLatency(50);
        await testThroughput(5000);
        break;

      default:
        console.log('\nUsage: node load-test.js [latency|throughput|batch|all]');
    }

    console.log('\n✅ Tests completed!\n');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    client.close();
  }
}

main();

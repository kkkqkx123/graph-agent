/**
 * Web application entry point for Modular Agent Framework
 */
import { sleep } from '@modular-agent/common-utils';
import { sdk } from '@modular-agent/sdk';

async function main(): Promise<void> {
  console.log('Starting Modular Agent Web Application...');

  // Example usage of common utils
  console.log('Waiting for 1 second...');
  await sleep(1000);
  console.log('Waited successfully!');

  // Example usage of SDK
  console.log('SDK initialized with workflows API:', !!sdk.workflows);
  console.log('SDK initialized with threads API:', !!sdk.threads);
  console.log('SDK initialized with tools API:', !!sdk.tools);

  // Perform a simple health check
  const health = await sdk.healthCheck();
  console.log('SDK Health Status:', health.status);

  console.log('Modular Agent Web Application started successfully!');
}

// Run the application
if (require.main === module) {
  main().catch(console.error);
}

export { main };
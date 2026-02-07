/**
 * Web application entry point for Modular Agent Framework
 */
import { sleep } from '@modular-agent/common-utils';
import { createExecutionEngine } from '@modular-agent/sdk';

async function main(): Promise<void> {
  console.log('Starting Modular Agent Web Application...');
  
  // Example usage of common utils
  console.log('Waiting for 1 second...');
  await sleep(1000);
  console.log('Waited successfully!');
  
  // Example usage of SDK
  const engine = createExecutionEngine();
  console.log('Execution engine created:', !!engine);
  
  console.log('Modular Agent Web Application started successfully!');
}

// Run the application
if (require.main === module) {
  main().catch(console.error);
}

export { main };
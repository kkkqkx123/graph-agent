/**
 * Web application entry point for Modular Agent Framework
 */
import { sleep } from '@modular-agent/common-utils';
import { sdk } from '@modular-agent/sdk';
import { createAppConfigManager } from './config-manager';

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
  
  // Example usage of application layer config manager
  console.log('\n--- 应用层配置管理示例 ---');
  const configManager = createAppConfigManager();
  
  // 获取初始配置摘要
  const initialSummary = await configManager.getConfigSummary();
  console.log('初始配置摘要:', initialSummary);
  
  // 注意：实际使用时需要提供配置目录路径
  // await configManager.loadAndRegisterConfigs('./configs');
  
  console.log('Modular Agent Web Application started successfully!');
}

// Run the application
if (require.main === module) {
  main().catch(console.error);
}

export { main };
/**
 * Modular Agent SDK - Main Entry Point
 *
 * This is the main entry point for the Modular Agent SDK.
 * It re-exports the most commonly used APIs and utilities.
 */

// Import and create package-level logger
import { createPackageLogger } from '@modular-agent/common-utils';

/**
 * SDK包级别日志器
 * 用于记录SDK级别的日志信息
 */
export const logger = createPackageLogger('sdk', {
  level: (process.env['SDK_LOG_LEVEL'] as any) || 'info',
  json: process.env['NODE_ENV'] === 'production'
});

// Export the main SDK instance
export { sdk } from './api';

// Also export the API factory and other core components for advanced usage
export { APIFactory, apiFactory } from './api/core/api-factory';

// Export core types
export type { SDKOptions, SDKDependencies } from './api/types';

// Export the main API interfaces
export type { AllAPIs } from './api/core/api-factory';

// Export common utilities
// Result类型 - 从核心层导入
export { ok, err, tryCatch, tryCatchAsync, all, any } from '@modular-agent/common-utils';
export type { Result, Ok, Err } from '@modular-agent/types/result';
export * from '@modular-agent/common-utils';

// Export execution result types
export * from './api/types/execution-result';
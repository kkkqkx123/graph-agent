/**
 * Modular Agent SDK - Main Entry Point
 * 
 * This is the main entry point for the Modular Agent SDK.
 * It re-exports the most commonly used APIs and utilities.
 */

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
export { ok, err, tryCatch, tryCatchAsync, all, any } from './utils/result-utils';
export type { Result, Ok, Err } from '@modular-agent/types/result';
export * from './api/utils/observable';

// Export execution result types
export * from './api/types/execution-result';
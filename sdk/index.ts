/**
 * Modular Agent SDK - Main Entry Point
 *
 * This is the main entry point for the Modular Agent SDK.
 * It re-exports all API layer content.
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

// Re-export all API layer content
export * from './api';

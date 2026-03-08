/**
 * Modular Agent SDK - Main Entry Point
 *
 * This is the main entry point for the Modular Agent SDK.
 * It re-exports all API layer content.
 */

import { initializeContainer } from './core/di/container-config.js';

// 初始化 DI 容器
initializeContainer();

// Re-export all API layer content
export * from './api/index.js';

// Re-export utilities
export * from './utils/index.js';

/**
 * Graph Agent SDK 主入口模块
 *
 * 提供统一的编程式 API 用于创建、配置和执行工作流
 *
 * @module @graph-agent/sdk
 *
 * @example
 * ```typescript
 * import { WorkflowBuilder, NodeBuilder, EdgeBuilder } from '@graph-agent/sdk';
 *
 * const workflow = WorkflowBuilder.create('my-workflow')
 *   .name('我的工作流')
 *   .addNode(NodeBuilder.start('start').build())
 *   .addNode(NodeBuilder.llm('llm').prompt({ type: 'direct', content: '你好' }).build())
 *   .addNode(NodeBuilder.end('end').build())
 *   .addEdge(EdgeBuilder.create().from('start').to('llm').build())
 *   .addEdge(EdgeBuilder.create().from('llm').to('end').build())
 *   .build();
 * ```
 */

// ============================================================================
// 导出所有类型定义
// ============================================================================

export * from './types';

// ============================================================================
// 导出 Builder API
// ============================================================================

export { WorkflowBuilder } from './builders/workflow-builder';
export { NodeBuilder } from './builders/node-builder';
export { EdgeBuilder } from './builders/edge-builder';
export { ThreadBuilder } from './builders/thread-builder';

// ============================================================================
// 导出函数式 API
// ============================================================================

export { workflow } from './functional/workflow';
export { node } from './functional/node';
export { edge } from './functional/edge';
export { pipe, map, filter, reduce, forEach, find, some, every, groupBy, sortBy, chunk, flatten, flatMap, unique, partition } from './functional/operators';

// ============================================================================
// 导出对象创建 API
// ============================================================================

export { createWorkflow, createWorkflowFromConfig } from './creators/workflow';
export { createNode, createNodeFromConfig } from './creators/node';
export { createEdge, createEdgeFromConfig, createSimpleEdge, createConditionalEdge, createWeightedEdge, createFunctionEdge, createExpressionEdge, createScriptEdge } from './creators/edge';

// ============================================================================
// 导出错误类
// ============================================================================

export {
  SDKError,
  ValidationError,
  BuildError,
  ExecutionError,
  TimeoutError,
  CancellationError,
  ConfigError,
  DependencyError,
  isSDKError,
  isValidationError,
  isBuildError,
  isExecutionError,
  isTimeoutError,
  isCancellationError,
  isConfigError,
  isDependencyError,
  formatError,
  getErrorStack,
} from './errors';

// ============================================================================
// 导出工具函数
// ============================================================================

export { Validators } from './utils';
export type { ValidationResult } from './utils/validators';
export { Helpers } from './utils/helpers';

// ============================================================================
// SDK 版本信息
// ============================================================================

/**
 * SDK 版本
 */
export const SDK_VERSION = '1.0.0';

/**
 * SDK 构建时间
 */
export const SDK_BUILD_TIME = new Date().toISOString();

/**
 * SDK 信息
 */
export const SDK_INFO = {
  version: SDK_VERSION,
  buildTime: SDK_BUILD_TIME,
  name: '@graph-agent/sdk',
  description: 'Graph Agent SDK - 编程式工作流创建和执行 API',
} as const;

/**
 * 获取 SDK 版本信息
 * @returns SDK 版本信息对象
 */
export function getSDKVersion(): typeof SDK_INFO {
  return SDK_INFO;
}

/**
 * 检查 SDK 是否已初始化
 * @returns 是否已初始化
 */
export function isSDKInitialized(): boolean {
  // TODO: 实现初始化检查逻辑
  return true;
}

/**
 * 初始化 SDK
 * @param config SDK 配置
 */
export function initializeSDK(config?: {
  enableLogging?: boolean;
  defaultTimeout?: number;
  defaultCheckpointInterval?: number;
}): void {
  // TODO: 实现初始化逻辑
  if (config?.enableLogging) {
    console.log('[SDK] SDK 已初始化', SDK_INFO);
  }
}
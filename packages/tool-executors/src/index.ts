/**
 * 工具执行器包
 * 提供各种工具执行器的实现
 */

import { createPackageLogger } from '@modular-agent/common-utils';

/**
 * 包级别日志器
 * 用于记录工具执行器包的日志信息
 */
export const logger = createPackageLogger('tool-executors', {
  level: (process.env['TOOL_EXECUTORS_LOG_LEVEL'] as any) || 'info',
  json: process.env['NODE_ENV'] === 'production'
});

// 核心接口和基类
export { IToolExecutor } from './core/interfaces/IToolExecutor.js';
export { BaseExecutor } from './core/base/BaseExecutor.js';
export { ParameterValidator } from './core/base/ParameterValidator.js';
export { RetryStrategy } from './core/base/RetryStrategy.js';
export { TimeoutController } from './core/base/TimeoutController.js';
export { ExecutorType, ExecutorConfig, ExecutorMetadata } from './core/types.js';

// MCP执行器
export { McpExecutor } from './mcp/McpExecutor.js';
export { StdioTransport } from './mcp/transport/StdioTransport.js';
export type {
  McpToolDefinition,
  McpToolResult,
  McpServerConfig,
  McpSessionState,
  McpSessionInfo,
  McpMessage,
  IMcpTransport
} from './mcp/types.js';

// REST执行器
export { RestExecutor } from './rest/RestExecutor.js';
export type {
  HttpRequestConfig,
  HttpResponse,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  RestExecutorConfig
} from './rest/types.js';

// Stateful执行器
export { StatefulExecutor } from './stateful/StatefulExecutor.js';
export type {
  StatefulExecutorConfig
} from './stateful/types.js';

// Stateless执行器
export { StatelessExecutor } from './stateless/StatelessExecutor.js';
export { FunctionRegistry } from './stateless/registry/FunctionRegistry.js';
export type {
  FunctionRegistryItem,
  FunctionRegistryConfig
} from './stateless/types.js';

// 辅助函数
export { toSdkTool, toSdkTools } from './utils.js';
export type { ToolDefinitionLike } from './utils.js';
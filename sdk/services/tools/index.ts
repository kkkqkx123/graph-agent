/**
 * Tool Executor Package
 * Provides implementations for various tool executors
 */

// Logger Export
export { logger, createModuleLogger } from "./logger.js";

// Core interfaces and base classes
export { IToolExecutor } from "./core/interfaces.js";
export {
  BaseExecutor,
  ParameterValidator,
  RetryStrategy,
  TimeoutController,
  type RetryStrategyConfig,
} from "./core/base.js";
export { ToolType, ExecutorConfig, ExecutorMetadata } from "./core/types.js";

// REST Executor
export { RestExecutor } from "./executors/rest.js";
export type {
  HttpRequestConfig,
  HttpResponse,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  RestExecutorConfig,
} from "./executors/rest.js";

// Stateful Executor
export { StatefulExecutor } from "./executors/stateful.js";
export type { StatefulExecutorConfig } from "./executors/stateful.js";

// Stateless executor
export { StatelessExecutor } from "./executors/stateless.js";
export type { FunctionRegistryItem, FunctionRegistryConfig } from "./executors/stateless.js";

// Builtin executor
export { BuiltinExecutor } from "./executors/builtin.js";
export type { BuiltinExecutorConfig } from "./executors/builtin.js";

// Auxiliary functions
export { toSdkTool, toSdkTools } from "./utils.js";
export type { ToolDefinitionLike } from "./utils.js";

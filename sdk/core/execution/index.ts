/**
 * Execution模块导出
 * 提供Thread执行引擎、节点处理函数、路由器和事件管理器
 */

// 执行上下文
export { WorkflowContext, ThreadContext } from './context';

// 执行上下文（依赖注入容器）
export {
  ExecutionContext,
  getWorkflowRegistry,
  getThreadRegistry,
  getEventManager,
  getCheckpointManager,
  getThreadLifecycleManager,
  resetDefaultContext
} from './context/execution-context';

// 主要执行引擎
export { ThreadExecutor } from './thread-executor';

// Thread构建器
export { ThreadBuilder } from './thread-builder';

// Thread生命周期管理器
export { ThreadLifecycleManager } from './thread-lifecycle-manager';

// Thread注册表
export { ThreadRegistry } from '../registry/thread-registry';

// 变量管理器
export { VariableManager } from './managers/variable-manager';

// Workflow注册器
export { WorkflowRegistry } from '../registry/workflow-registry';
export type { WorkflowSummary, WorkflowVersion, ValidationResult } from '../registry/workflow-registry';

// 事件管理器
export { EventManager } from './managers/event-manager';

// Thread协调器
export { ThreadCoordinator } from './thread-coordinator';

// Thread操作工具函数
export {
  fork,
  join,
  copy,
  type ForkConfig,
  type JoinStrategy,
  type JoinResult
} from './utils/thread-operations';

// 触发器管理器
export { TriggerManager } from './managers/trigger-manager';

// LLM执行相关
export { ConversationManager } from './conversation';
export type { ConversationManagerOptions, ConversationManagerEventCallbacks } from './conversation';
export { LLMExecutor } from './llm-executor';
export { TokenUsageTracker } from './token-usage-tracker';
export type { TokenUsageStats, TokenUsageTrackerOptions } from './token-usage-tracker';

// Hook处理函数
export * from './handlers/hook-handlers';
export * from './handlers/hook-utils';

// 节点处理函数
export * from './handlers/node-handlers';

// 触发器处理函数
export * from './handlers/trigger-handlers';

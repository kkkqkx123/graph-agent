/**
 * Execution模块导出
 * 提供Thread执行引擎、节点处理函数、路由器和事件管理器
 */

// 执行上下文
export { ThreadContext, ExecutionState } from './context';

// 执行上下文（依赖注入容器）
export { ExecutionContext } from './context/execution-context';

// 主要执行引擎
export { ThreadExecutor } from './thread-executor';

// Thread构建器
export { ThreadBuilder } from './thread-builder';

// Thread生命周期管理器
export { ThreadLifecycleManager } from './thread-lifecycle-manager';

// Thread状态验证工具函数
export {
  validateTransition,
  isValidTransition,
  getAllowedTransitions,
  isTerminalStatus,
  isActiveStatus
} from './utils/thread-state-validator';

// Thread生命周期协调器
export { ThreadLifecycleCoordinator } from './coordinators/thread-lifecycle-coordinator';

// Thread注册表
export { ThreadRegistry } from '../services/thread-registry';

// 变量管理器
export { VariableManager } from './managers/variable-manager';

// 对话状态管理器
export { ConversationStateManager, type ConversationState } from './managers/conversation-state-manager';

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
export { TriggerCoordinator as TriggerManager } from './coordinators/trigger-coordinator';

// LLM执行相关
export { ConversationManager } from './conversation';
export type { ConversationManagerOptions } from './conversation';
export { LLMExecutor } from './llm-executor';
export { TokenUsageTracker } from './token-usage-tracker';
export type { TokenUsageStats, TokenUsageTrackerOptions, FullTokenUsageStats } from './token-usage-tracker';

// 消息索引管理
export { MessageIndexManager } from './message-index-manager';

// Hook处理函数
export * from './handlers/hook-handlers';

// 节点处理函数
export * from './handlers/node-handlers';

// 触发器处理函数
export * from './handlers/trigger-handlers';

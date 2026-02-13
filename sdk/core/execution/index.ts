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

// Thread状态验证工具函数
export {
  validateTransition,
  isValidTransition,
  getAllowedTransitions,
  isTerminalStatus,
  isActiveStatus
} from './utils/thread-state-validator';

// Thread注册表
export { ThreadRegistry } from '../services/thread-registry';

// 变量协调器和状态管理器
export { VariableCoordinator } from './coordinators/variable-coordinator';
export { VariableStateManager } from './managers/variable-state-manager';

// LLM执行相关
export { ConversationManager, type ConversationState } from './managers/conversation-manager';
export type { ConversationManagerOptions } from './managers/conversation-manager';
export { TokenUsageTracker } from './token-usage-tracker';
export type { TokenUsageTrackerOptions, FullTokenUsageStats } from './token-usage-tracker';
export type { TokenUsageStats } from '@modular-agent/types/llm';

// Hook处理函数
export * from './handlers/hook-handlers';

// 节点处理函数
export * from './handlers/node-handlers';

// 触发器处理函数
export * from './handlers/trigger-handlers';

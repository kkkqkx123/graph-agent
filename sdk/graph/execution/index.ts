/**
 * Execution模块导出
 * 提供Thread执行引擎、节点处理函数、路由器和事件管理器
 */

// 执行实体
export { ThreadEntity, ExecutionState, type SubgraphContext } from '../entities/index.js';

// 主要执行引擎
export { ThreadExecutor, type ThreadExecutorDependencies } from './thread-executor.js';

// Thread构建器
export { ThreadBuilder } from './thread-builder.js';

// Thread状态验证工具函数
export {
  validateTransition,
  isValidTransition,
  getAllowedTransitions,
  isTerminalStatus,
  isActiveStatus
} from './utils/thread-state-validator.js';

// Thread注册表
export { ThreadRegistry } from '../services/thread-registry.js';

// 变量协调器和状态管理器
export { VariableCoordinator } from './coordinators/variable-coordinator.js';
export { VariableStateManager } from './managers/variable-state-manager.js';

// LLM执行相关 - 从通用执行核心重新导出
export { ConversationManager, type ConversationState, type ConversationManagerOptions } from '../../core/managers/conversation-manager.js';
export { TokenUsageTracker, type TokenUsageTrackerOptions, type FullTokenUsageStats } from '../../core/utils/token/token-usage-tracker.js';
export type { TokenUsageStats } from '@modular-agent/types';

// Hook处理函数
export * from './handlers/hook-handlers/index.js';

// Hook创建器工具
export * from './utils/hook-creators.js';

// 节点处理函数
export * from './handlers/node-handlers/index.js';

// 触发器处理函数
export * from './handlers/trigger-handlers/index.js';

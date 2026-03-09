/**
 * 管理器模块
 *
 * 管理器是有状态的组件，负责管理运行时状态
 *
 * 设计原则：
 * - 有状态设计：维护运行时状态
 * - 状态管理：提供状态的增删改查操作
 * - 线程隔离：每个线程有独立的状态实例
 * - 生命周期管理：实现LifecycleCapable接口，提供统一的初始化和清理机制
 *
 * 包含的管理器：
 * - TriggerStateManager: 触发器状态管理器
 * - VariableStateManager: 变量状态管理器
 * - ToolContextManager: 工具上下文管理器
 * - MessageHistoryManager: 消息历史管理器
 * - InterruptionManager: 中断状态管理器（从 @modular-agent/core/execution 重新导出）
 * - InterruptionDetector: 中断检测器
 * - LifecycleCapable: 统一的生命周期管理能力接口
 * - CheckpointCleanupPolicy: 检查点清理策略
 */

export { TriggerStateManager } from './trigger-state-manager.js';
export type { TriggerRuntimeState } from '@modular-agent/types';
export { VariableStateManager } from './variable-state-manager.js';
export { ToolContextManager, type ToolScope, type ToolMetadata, type ToolContext } from './tool-context-manager.js';
export { MessageHistoryManager, type MessageHistoryState } from './message-history-manager.js';
export { type LifecycleCapable } from './lifecycle-capable.js';

// 从通用执行核心重新导出
export {
  ConversationManager,
  type ConversationManagerOptions,
  type ConversationState
} from '../../../core/execution/managers/conversation-manager.js';

export {
  InterruptionManager,
  type InterruptionType
} from '../../../core/execution/managers/interruption-manager.js';

export { InterruptionDetector, InterruptionDetectorImpl } from './interruption-detector.js';

// 工具可见性管理器
export { ToolVisibilityManager } from './tool-visibility-manager.js';

// 任务队列相关
export { TaskQueueManager } from './task-queue-manager.js';

// 动态线程相关
export { CallbackManager, type GenericCallbackInfo } from './callback-manager.js';
export { DynamicThreadManager } from './dynamic-thread-manager.js';

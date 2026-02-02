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
 * - CheckpointManager: 检查点管理器
 * - TriggerStateManager: 触发器状态管理器
 * - VariableStateManager: 变量状态管理器
 * - LifecycleCapable: 统一的生命周期管理能力接口
 * - CheckpointCleanupPolicy: 检查点清理策略
 */

export { CheckpointManager } from "./checkpoint-manager";
export { TriggerStateManager, type TriggerRuntimeState } from "./trigger-state-manager";
export { VariableStateManager } from "./variable-state-manager";
export { type LifecycleCapable } from "./lifecycle-capable";
export {
  TimeBasedCleanupStrategy,
  CountBasedCleanupStrategy,
  SizeBasedCleanupStrategy,
  createCleanupStrategy,
  type CleanupPolicy,
  type CleanupStrategyType,
  type TimeBasedCleanupPolicy,
  type CountBasedCleanupPolicy,
  type SizeBasedCleanupPolicy,
  type CheckpointCleanupStrategy,
  type CheckpointInfo
} from "./checkpoint-cleanup-policy";

export {
  ConversationManager,
  ConversationManagerOptions,
  ConversationState
} from "./conversation-manager";

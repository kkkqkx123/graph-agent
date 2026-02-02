/**
 * 管理器模块
 *
 * 管理器是有状态的组件，负责管理运行时状态
 *
 * 设计原则：
 * - 有状态设计：维护运行时状态
 * - 状态管理：提供状态的增删改查操作
 * - 线程隔离：每个线程有独立的状态实例
 *
 * 包含的管理器：
 * - CheckpointManager: 检查点管理器
 * - TriggerStateManager: 触发器状态管理器
 * - VariableStateManager: 变量状态管理器
 * - ConversationStateManager: 对话状态管理器
 */

export { CheckpointManager } from "./checkpoint-manager";
export { TriggerStateManager, type TriggerRuntimeState } from "./trigger-state-manager";
export { VariableStateManager } from "./variable-state-manager";
export { ConversationStateManager, type ConversationState } from "./conversation-state-manager";

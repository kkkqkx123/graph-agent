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
 */

export { EventManager } from "../../services/event-manager";
export { TriggerStateManager, type TriggerRuntimeState } from "./trigger-state-manager";
export { VariableManager } from "../coordinators/variable-coordinator";
export { VariableAccessor, VariableNamespace } from "../coordinators/utils/variable-accessor";

// 向后兼容：导出 TriggerManager 别名
export { TriggerCoordinator as TriggerManager } from "../coordinators/trigger-coordinator";

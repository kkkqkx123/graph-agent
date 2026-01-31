/**
 * 协调器模块
 *
 * 协调器是无状态的组件，负责协调各个管理器之间的交互
 *
 * 设计原则：
 * - 无状态设计：不维护可变状态
 * - 协调逻辑：封装复杂的协调逻辑
 * - 依赖注入：通过构造函数接收依赖的管理器
 *
 * 包含的协调器：
 * - EventCoordinator: 事件协调器
 * - NodeExecutionCoordinator: 节点执行协调器
 * - TriggerCoordinator: 触发器协调器
 */

export { EventCoordinator } from './event-coordinator';
export { NodeExecutionCoordinator } from './node-execution-coordinator';
export { TriggerCoordinator } from './trigger-coordinator';
export { VariableAccessor, VariableNamespace } from '../utils/variable-accessor';
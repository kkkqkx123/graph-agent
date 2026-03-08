/**
 * 协调器模块
 *
 * 协调器是无状态的组件，负责协调各个管理器之间的交互
 *
 * 设计原则：
 * - 协调逻辑：封装复杂的协调逻辑
 * - 依赖注入：通过构造函数接收依赖的管理器
 *
 * 包含的协调器：
 * - NodeExecutionCoordinator: 节点执行协调器
 * - TriggerCoordinator: 触发器协调器
 * - LLMExecutionCoordinator: LLM 执行协调器
 * - ThreadLifecycleCoordinator: Thread 生命周期协调器
 * - ThreadOperationCoordinator: Thread 操作协调器
 * - VariableCoordinator: 变量协调器
 * - ToolVisibilityCoordinator: 工具可见性协调器
 */

export {
  NodeExecutionCoordinator,
  type NodeExecutionCoordinatorConfig
} from './node-execution-coordinator.js';
export { TriggerCoordinator } from './trigger-coordinator.js';
export { LLMExecutionCoordinator } from './llm-execution-coordinator.js';
export { ThreadLifecycleCoordinator } from './thread-lifecycle-coordinator.js';
export { ThreadOperationCoordinator } from './thread-operation-coordinator.js';
export { ThreadExecutionCoordinator } from './thread-execution-coordinator.js';
export { VariableCoordinator } from './variable-coordinator.js';
export { VariableAccessor, VariableNamespace } from '../utils/variable-accessor.js';
export { ToolVisibilityCoordinator } from './tool-visibility-coordinator.js';
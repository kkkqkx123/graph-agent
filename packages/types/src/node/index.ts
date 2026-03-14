/**
 * Node类型定义统一导出
 * 定义工作流节点的类型和结构
 */

// 导出基础类型（包含可辨识联合 Node 类型和类型守卫）
export * from './base.js';

// 导出节点配置类型（详细版本，用于外部引用）
export * from './configs/index.js';

// 导出Hook相关类型
export * from './hooks.js';

// 导出节点属性类型
export * from './properties.js';

// 导出Agent Loop类型
export * from './agent-loop.js';

// 导出所有节点配置的联合类型（用于 NodeTemplate 等场景）
import type {
  StartNodeConfig,
  EndNodeConfig,
  RouteNodeConfig
} from './configs/control-configs.js';

import type { VariableNodeConfig } from './configs/variable-configs.js';

import type {
  ForkNodeConfig,
  JoinNodeConfig
} from './configs/fork-join-configs.js';

import type {
  LoopStartNodeConfig,
  LoopEndNodeConfig
} from './configs/loop-configs.js';

import type {
  ScriptNodeConfig,
  LLMNodeConfig,
  AddToolNodeConfig
} from './configs/execution-configs.js';

import type { UserInteractionNodeConfig } from './configs/interaction-configs.js';

import type { ContextProcessorNodeConfig } from './configs/context-configs.js';

import type {
  SubgraphNodeConfig,
  StartFromTriggerNodeConfig,
  ContinueFromTriggerNodeConfig
} from './configs/subgraph-configs.js';

import type { AgentLoopNodeConfig } from './agent-loop.js';

/**
 * 节点配置联合类型
 * 用于需要接受任意节点配置的场景（如 NodeTemplate）
 */
export type NodeConfig =
  | StartNodeConfig
  | EndNodeConfig
  | VariableNodeConfig
  | ForkNodeConfig
  | JoinNodeConfig
  | ScriptNodeConfig
  | LLMNodeConfig
  | AddToolNodeConfig
  | UserInteractionNodeConfig
  | RouteNodeConfig
  | ContextProcessorNodeConfig
  | LoopStartNodeConfig
  | LoopEndNodeConfig
  | AgentLoopNodeConfig
  | SubgraphNodeConfig
  | StartFromTriggerNodeConfig
  | ContinueFromTriggerNodeConfig;

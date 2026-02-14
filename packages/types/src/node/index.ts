/**
 * Node类型定义统一导出
 * 定义工作流节点的类型和结构
 */

// 导出基础类型
export * from './base';

// 导出节点配置类型
export * from './configs';

// 导出Hook相关类型
export * from './hooks';

// 导出节点属性类型
export * from './properties';

// 导出所有节点配置的联合类型
import type {
  StartNodeConfig,
  EndNodeConfig,
  RouteNodeConfig
} from './configs/control-configs';

import type { VariableNodeConfig } from './configs/variable-configs';

import type {
  ForkNodeConfig,
  JoinNodeConfig
} from './configs/fork-join-configs';

import type {
  LoopStartNodeConfig,
  LoopEndNodeConfig
} from './configs/loop-configs';

import type {
  CodeNodeConfig,
  LLMNodeConfig,
  ToolNodeConfig
} from './configs/execution-configs';

import type { UserInteractionNodeConfig } from './configs/interaction-configs';

import type { ContextProcessorNodeConfig } from './configs/context-configs';

import type {
  SubgraphNodeConfig,
  StartFromTriggerNodeConfig,
  ContinueFromTriggerNodeConfig
} from './configs/subgraph-configs';

/**
 * 节点配置联合类型
 */
export type NodeConfig =
  | StartNodeConfig
  | EndNodeConfig
  | VariableNodeConfig
  | ForkNodeConfig
  | JoinNodeConfig
  | CodeNodeConfig
  | LLMNodeConfig
  | ToolNodeConfig
  | UserInteractionNodeConfig
  | RouteNodeConfig
  | ContextProcessorNodeConfig
  | LoopStartNodeConfig
  | LoopEndNodeConfig
  | SubgraphNodeConfig
  | StartFromTriggerNodeConfig
  | ContinueFromTriggerNodeConfig;

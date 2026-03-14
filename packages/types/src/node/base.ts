/**
 * 基础节点类型定义
 * 使用可辨识联合类型（Discriminated Unions）实现类型安全
 */

import type { ID, Metadata } from '../common.js';

// 导入所有节点配置类型
import type {
  StartNodeConfig,
  EndNodeConfig,
  RouteNodeConfig
} from './configs/control-configs.js';

import type { VariableNodeConfig } from './configs/variable-configs.js';

import type {
  ForkNodeConfig
} from './configs/fork-join-configs.js';

import type { JoinNodeConfig } from './configs/fork-join-configs.js';

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
 * 节点类型
 */
export type NodeType =
  /** 开始节点。作为工作流开始标志，必须唯一。入度必须为0。 */
  'START' |
  /** 结束节点。作为工作流结束标志，必须唯一。出度必须为0。 */
  'END' |
  /** 变量操作节点。主要用途是更改工作流变量的值，为边条件评估提供数据。 */
  'VARIABLE' |
  /** 分叉节点。用于控制thread的fork操作。 */
  'FORK' |
  /** 连接节点。用于控制thread的join操作。 */
  'JOIN' |
  /** 子图节点。用于链接到子工作流。在workflow处理阶段由merge自动把该节点替换为子工作流，以子工作流的start节点连接。 */
  'SUBGRAPH' |
  /** 脚本节点。用于执行脚本。 */
  'SCRIPT' |
  /** LLM节点。用于执行LLM api调用。不添加提示词，提示词操作有上下文处理节点负责。 */
  'LLM' |
  /** 工具添加节点。用于动态添加工具到工具上下文。 */
  'ADD_TOOL' |
  /** 用户交互节点。用于触发展示前端用户交互。仅提供输入、输出渠道，不关心前端实现细节。 */
  'USER_INTERACTION' |
  /** 路由节点。用于根据条件路由到下一个节点。 */
  'ROUTE' |
  /** 上下文处理器节点。用于对提示词上下文(消息数组)进行处理。 */
  'CONTEXT_PROCESSOR' |
  /** 循环开始节点。标记循环开始，设置循环变量。循环变量可以被VARIABLE节点修改。不关心条件以外的退出条件 */
  'LOOP_START' |
  /** 循环结束节点。标记循环结束。让循环次数变量自增，并根据循环次数是否达到 */
  'LOOP_END' |
  /** Agent自循环节点。用于简单任务的LLM-工具自循环，或作为主协调引擎。复杂控制请使用LOOP_START/LOOP_END + 图编排。 */
  'AGENT_LOOP' |
  /** 从触发器开始的节点。标识由触发器启动的孤立子工作流的起始点。无特殊配置，与START节点类似。 */
  'START_FROM_TRIGGER' |
  /** 从触发器继续的节点。用于在子工作流执行完成后恢复到主工作流的执行位置。无特殊配置，类似END节点。 */
  'CONTINUE_FROM_TRIGGER';

/**
 * 节点状态（高级功能，用于审计，不承担工作流执行逻辑）
 */
export type NodeStatus =
  /** 等待执行 */
  'PENDING' |
  /** 正在执行 */
  'RUNNING' |
  /** 执行完成 */
  'COMPLETED' |
  /** 执行失败 */
  'FAILED' |
  /** 已跳过（执行过程中由图算法标记，是可选的高级功能） */
  'SKIPPED' |
  /** 已取消 */
  'CANCELLED';

// ============================================================================
// 基础节点属性
// ============================================================================

/**
 * 基础节点属性（所有节点共有）
 */
interface BaseNodeProps {
  /** 节点唯一标识符 */
  id: ID;
  /** 节点名称 */
  name: string;
  /** 可选的节点描述 */
  description?: string;
  /** 可选的元数据 */
  metadata?: Metadata;
  /** 出边ID数组，用于路由决策 */
  outgoingEdgeIds: ID[];
  /** 入边ID数组，用于反向追踪 */
  incomingEdgeIds: ID[];
  /** 可选的动态属性对象 */
  properties?: any[];
  /** 可选的Hook配置数组 */
  hooks?: any[];
  /** 节点执行前是否创建检查点 */
  checkpointBeforeExecute?: boolean;
  /** 节点执行后是否创建检查点 */
  checkpointAfterExecute?: boolean;
}

// ============================================================================
// 节点类型到配置类型的映射
// ============================================================================

/**
 * 节点类型到配置类型的映射接口
 * 用于类型推导和自动生成节点类型
 */
export interface NodeConfigMap {
  'START': StartNodeConfig;
  'END': EndNodeConfig;
  'VARIABLE': VariableNodeConfig;
  'FORK': ForkNodeConfig;
  'JOIN': JoinNodeConfig;
  'SUBGRAPH': SubgraphNodeConfig;
  'SCRIPT': ScriptNodeConfig;
  'LLM': LLMNodeConfig;
  'ADD_TOOL': AddToolNodeConfig;
  'USER_INTERACTION': UserInteractionNodeConfig;
  'ROUTE': RouteNodeConfig;
  'CONTEXT_PROCESSOR': ContextProcessorNodeConfig;
  'LOOP_START': LoopStartNodeConfig;
  'LOOP_END': LoopEndNodeConfig;
  'AGENT_LOOP': AgentLoopNodeConfig;
  'START_FROM_TRIGGER': StartFromTriggerNodeConfig;
  'CONTINUE_FROM_TRIGGER': ContinueFromTriggerNodeConfig;
}

/**
 * 根据节点类型获取对应的具体节点类型
 * 辅助类型，用于类型推导
 */
export type NodeOfType<T extends NodeType> = BaseNodeProps & {
  type: T;
  config: NodeConfigMap[T];
};

// ============================================================================
// 具体节点类型定义（使用映射类型自动生成）
// ============================================================================

/**
 * 开始节点
 */
export type StartNode = NodeOfType<'START'>;

/**
 * 结束节点
 */
export type EndNode = NodeOfType<'END'>;

/**
 * 变量节点
 */
export type VariableNode = NodeOfType<'VARIABLE'>;

/**
 * 分叉节点
 */
export type ForkNode = NodeOfType<'FORK'>;

/**
 * 连接节点
 */
export type JoinNode = NodeOfType<'JOIN'>;

/**
 * 子图节点
 */
export type SubgraphNode = NodeOfType<'SUBGRAPH'>;

/**
 * 脚本节点
 */
export type ScriptNode = NodeOfType<'SCRIPT'>;

/**
 * LLM节点
 */
export type LLMNode = NodeOfType<'LLM'>;

/**
 * 工具添加节点
 */
export type AddToolNode = NodeOfType<'ADD_TOOL'>;

/**
 * 用户交互节点
 */
export type UserInteractionNode = NodeOfType<'USER_INTERACTION'>;

/**
 * 路由节点
 */
export type RouteNode = NodeOfType<'ROUTE'>;

/**
 * 上下文处理器节点
 */
export type ContextProcessorNode = NodeOfType<'CONTEXT_PROCESSOR'>;

/**
 * 循环开始节点
 */
export type LoopStartNode = NodeOfType<'LOOP_START'>;

/**
 * 循环结束节点
 */
export type LoopEndNode = NodeOfType<'LOOP_END'>;

/**
 * Agent Loop节点
 */
export type AgentLoopNode = NodeOfType<'AGENT_LOOP'>;

/**
 * 从触发器开始节点
 */
export type StartFromTriggerNode = NodeOfType<'START_FROM_TRIGGER'>;

/**
 * 从触发器继续节点
 */
export type ContinueFromTriggerNode = NodeOfType<'CONTINUE_FROM_TRIGGER'>;

// ============================================================================
// 节点联合类型
// ============================================================================

/**
 * 节点联合类型（可辨识联合）
 * TypeScript 会根据 type 字段自动收窄 config 类型
 */
export type Node =
  | StartNode
  | EndNode
  | VariableNode
  | ForkNode
  | JoinNode
  | SubgraphNode
  | ScriptNode
  | LLMNode
  | AddToolNode
  | UserInteractionNode
  | RouteNode
  | ContextProcessorNode
  | LoopStartNode
  | LoopEndNode
  | AgentLoopNode
  | StartFromTriggerNode
  | ContinueFromTriggerNode;

// ============================================================================
// 类型守卫函数
// ============================================================================

/**
 * 通用类型守卫工厂函数
 * 用于创建特定节点类型的类型守卫
 *
 * @example
 * const isStartNode = createNodeTypeGuard('START');
 * if (isStartNode(node)) {
 *   // node 自动收窄为 StartNode
 * }
 */
export function createNodeTypeGuard<T extends NodeType>(type: T) {
  return (node: unknown): node is NodeOfType<T> =>
    typeof node === 'object' && node !== null && (node as Node).type === type;
}

/**
 * 检查节点是否为指定类型
 * 通用类型守卫函数，适用于所有节点类型
 *
 * @example
 * if (isNodeType(node, 'START')) {
 *   // node 自动收窄为 StartNode
 * }
 */
export function isNodeType<T extends NodeType>(
  node: unknown,
  type: T
): node is NodeOfType<T> {
  return typeof node === 'object' && node !== null && (node as Node).type === type;
}

// ============================================================================
// 具体类型守卫函数（使用工厂函数创建，保持向后兼容）
// ============================================================================

/**
 * 检查节点是否为 START 类型
 */
export const isStartNode = createNodeTypeGuard('START');

/**
 * 检查节点是否为 END 类型
 */
export const isEndNode = createNodeTypeGuard('END');

/**
 * 检查节点是否为 VARIABLE 类型
 */
export const isVariableNode = createNodeTypeGuard('VARIABLE');

/**
 * 检查节点是否为 FORK 类型
 */
export const isForkNode = createNodeTypeGuard('FORK');

/**
 * 检查节点是否为 JOIN 类型
 */
export const isJoinNode = createNodeTypeGuard('JOIN');

/**
 * 检查节点是否为 SUBGRAPH 类型
 */
export const isSubgraphNode = createNodeTypeGuard('SUBGRAPH');

/**
 * 检查节点是否为 SCRIPT 类型
 */
export const isScriptNode = createNodeTypeGuard('SCRIPT');

/**
 * 检查节点是否为 LLM 类型
 */
export const isLLMNode = createNodeTypeGuard('LLM');

/**
 * 检查节点是否为 ADD_TOOL 类型
 */
export const isAddToolNode = createNodeTypeGuard('ADD_TOOL');

/**
 * 检查节点是否为 USER_INTERACTION 类型
 */
export const isUserInteractionNode = createNodeTypeGuard('USER_INTERACTION');

/**
 * 检查节点是否为 ROUTE 类型
 */
export const isRouteNode = createNodeTypeGuard('ROUTE');

/**
 * 检查节点是否为 CONTEXT_PROCESSOR 类型
 */
export const isContextProcessorNode = createNodeTypeGuard('CONTEXT_PROCESSOR');

/**
 * 检查节点是否为 LOOP_START 类型
 */
export const isLoopStartNode = createNodeTypeGuard('LOOP_START');

/**
 * 检查节点是否为 LOOP_END 类型
 */
export const isLoopEndNode = createNodeTypeGuard('LOOP_END');

/**
 * 检查节点是否为 AGENT_LOOP 类型
 */
export const isAgentLoopNode = createNodeTypeGuard('AGENT_LOOP');

/**
 * 检查节点是否为 START_FROM_TRIGGER 类型
 */
export const isStartFromTriggerNode = createNodeTypeGuard('START_FROM_TRIGGER');

/**
 * 检查节点是否为 CONTINUE_FROM_TRIGGER 类型
 */
export const isContinueFromTriggerNode = createNodeTypeGuard('CONTINUE_FROM_TRIGGER');

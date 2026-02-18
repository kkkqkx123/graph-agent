/**
 * 基础节点类型定义
 */

import type { ID, Metadata } from '../common.js';

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
  /** 工具节点。通过内部事件通知llm执行器。 */
  'TOOL' |
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

/**
 * 节点定义类型
 */
export interface Node {
  /** 节点唯一标识符 */
  id: ID;
  /** 节点类型(NodeType枚举类型) */
  type: NodeType;
  /** 节点名称 */
  name: string;
  /** 可选的节点描述 */
  description?: string;
  /** 节点配置，根据节点类型不同而不同 */
  config: any;
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
  /** 节点执行前是否创建检查点（新增，优先级高于全局配置） */
  checkpointBeforeExecute?: boolean;
  /** 节点执行后是否创建检查点（新增，优先级高于全局配置） */
  checkpointAfterExecute?: boolean;
}
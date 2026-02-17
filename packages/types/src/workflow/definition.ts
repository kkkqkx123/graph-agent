/**
 * 工作流定义类型
 */

import type { Node } from '../node/index.js';
import type { Edge } from '../edge.js';
import type { ID, Version, Timestamp } from '../common.js';
import type { WorkflowTrigger } from '../trigger/index.js';
import type { TriggerReference } from '../trigger-template.js';
import type { WorkflowType } from './type.js';
import type { WorkflowVariable } from './variables.js';
import type { WorkflowConfig } from './config.js';
import type { WorkflowMetadata } from './metadata.js';
import type { TriggeredSubworkflowConfig } from './config.js';

/**
 * 工作流定义类型
 * 包含工作流的基本信息和结构
 */
export interface WorkflowDefinition {
  /** 工作流唯一标识符 */
  id: ID;
  /** 工作流名称 */
  name: string;
  /** 工作流类型 */
  type: WorkflowType;
  /** 可选的工作流描述 */
  description?: string;
  /** 节点数组，定义工作流的所有节点 */
  nodes: Node[];
  /** 边数组，定义节点之间的连接关系 */
  edges: Edge[];
  /** 工作流变量定义数组，用于声明工作流执行所需的变量 */
  variables?: WorkflowVariable[];
  /** 工作流触发器定义数组，用于声明工作流级别的触发器 */
  triggers?: (WorkflowTrigger | TriggerReference)[];
  /** 触发子工作流专用配置（仅用于包含START_FROM_TRIGGER节点的工作流） */
  triggeredSubworkflowConfig?: TriggeredSubworkflowConfig;
  /** 可选的工作流配置 */
  config?: WorkflowConfig;
  /** 可选的元数据信息 */
  metadata?: WorkflowMetadata;
  /** 工作流版本号 */
  version: Version;
  /** 创建时间 */
  createdAt: Timestamp;
  /** 更新时间 */
  updatedAt: Timestamp;
  /** 可用工具配置 */
  availableTools?: {
    /** 初始可用工具集合（工具ID或名称） */
    initial: Set<string>;
  };
}
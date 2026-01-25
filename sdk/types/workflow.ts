/**
 * Workflow类型定义
 * 定义工作流的完整结构，包括节点和边
 */

// 前向声明，避免循环依赖
// Node和Edge的实际定义在node.ts和edge.ts中
interface Node {
  id: string;
  type: string;
  name: string;
  description?: string;
  config: any;
  inputs?: any[];
  outputs?: any[];
  metadata?: any;
  outgoingEdgeIds: string[];
  incomingEdgeIds: string[];
  properties?: any;
}

interface Edge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: string;
  condition?: any;
  label?: string;
  description?: string;
  weight?: number;
  priority?: number;
  metadata?: any;
}

/**
 * 工作流状态枚举
 */
export enum WorkflowStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE'
}

/**
 * 工作流配置类型
 * 定义工作流执行时的行为选项
 */
export interface WorkflowConfig {
  /** 执行超时时间（毫秒） */
  timeout?: number;
  /** 最大执行步数 */
  maxSteps?: number;
  /** 是否启用检查点 */
  enableCheckpoints?: boolean;
  /** 重试策略配置 */
  retryPolicy?: {
    maxRetries?: number;
    retryDelay?: number;
    backoffMultiplier?: number;
  };
  /** 错误处理策略 */
  errorHandling?: {
    stopOnError?: boolean;
    continueOnError?: boolean;
    fallbackNodeId?: string;
  };
}

/**
 * 工作流元数据类型
 * 用于存储扩展信息
 */
export interface WorkflowMetadata {
  /** 作者信息 */
  author?: string;
  /** 标签数组 */
  tags?: string[];
  /** 分类 */
  category?: string;
  /** 自定义字段对象 */
  customFields?: Record<string, any>;
}

/**
 * 工作流定义类型
 * 包含工作流的基本信息和结构
 */
export interface WorkflowDefinition {
  /** 工作流唯一标识符 */
  id: string;
  /** 工作流名称 */
  name: string;
  /** 可选的工作流描述 */
  description?: string;
  /** 节点数组，定义工作流的所有节点 */
  nodes: Node[];
  /** 边数组，定义节点之间的连接关系 */
  edges: Edge[];
  /** 可选的工作流配置 */
  config?: WorkflowConfig;
  /** 可选的元数据信息 */
  metadata?: WorkflowMetadata;
  /** 工作流版本号 */
  version: string;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}
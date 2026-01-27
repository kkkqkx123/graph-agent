/**
 * Workflow类型定义
 * 定义工作流的完整结构，包括节点和边
 */

// 导入类型定义
import type { Node } from './node';
import type { Edge } from './edge';
import type { ID, Timestamp, Version, Metadata } from './common';

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
    fallbackNodeId?: ID;
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
  customFields?: Metadata;
}

/**
 * 工作流变量定义类型
 * 用于在工作流定义阶段声明变量，提供类型安全和初始值
 */
export interface WorkflowVariable {
  /** 变量名称 */
  name: string;
  /** 变量类型 */
  type: 'number' | 'string' | 'boolean' | 'array' | 'object';
  /** 变量初始值 */
  defaultValue?: any;
  /** 变量描述 */
  description?: string;
  /** 是否必需 */
  required?: boolean;
  /** 是否只读 */
  readonly?: boolean;
  /** 变量作用域 */
  scope?: 'local' | 'global';
}

/**
 * 工作流定义类型
 * 包含工作流的基本信息和结构
 */
export interface WorkflowDefinition {
  /** 工作流唯一标识符 */
  id: ID;
  /** 工作流名称 */
  name: string;
  /** 可选的工作流描述 */
  description?: string;
  /** 节点数组，定义工作流的所有节点 */
  nodes: Node[];
  /** 边数组，定义节点之间的连接关系 */
  edges: Edge[];
  /** 工作流变量定义数组，用于声明工作流执行所需的变量 */
  variables?: WorkflowVariable[];
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
}
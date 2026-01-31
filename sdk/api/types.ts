/**
 * API层类型定义
 * 定义API层使用的类型和接口
 */

import type { ThreadStatus } from '../types/thread';
import type { ToolType } from '../types/tool';
import type { EventType } from '../types/events';
import type {
  TriggerTemplateFilter,
  TriggerTemplateSummary
} from '../types/trigger-template';

/**
 * 执行选项
 */
export interface ExecuteOptions {
  /** 输入数据 */
  input?: Record<string, any>;
  /** 最大执行步数 */
  maxSteps?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否启用检查点 */
  enableCheckpoints?: boolean;
  /** 节点执行回调 */
  onNodeExecuted?: (result: any) => void | Promise<void>;
  /** 错误回调 */
  onError?: (error: any) => void | Promise<void>;
}

/**
 * 工作流过滤器
 */
export interface WorkflowFilter {
  /** 工作流ID */
  id?: string;
  /** 工作流名称 */
  name?: string;
  /** 标签数组 */
  tags?: string[];
  /** 分类 */
  category?: string;
  /** 作者 */
  author?: string;
  /** 版本 */
  version?: string;
}

/**
 * 线程过滤器
 */
export interface ThreadFilter {
  /** 线程ID */
  threadId?: string;
  /** 工作流ID */
  workflowId?: string;
  /** 线程状态 */
  status?: ThreadStatus;
  /** 创建时间范围（开始时间戳） */
  startTimeFrom?: number;
  /** 创建时间范围（结束时间戳） */
  startTimeTo?: number;
  /** 标签数组 */
  tags?: string[];
  /** 创建者 */
  creator?: string;
}

/**
 * 工作流摘要
 */
export interface WorkflowSummary {
  /** 工作流ID */
  id: string;
  /** 工作流名称 */
  name: string;
  /** 描述 */
  description?: string;
  /** 版本 */
  version: string;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
  /** 元数据 */
  metadata?: any;
}

/**
 * 线程摘要
 */
export interface ThreadSummary {
  /** 线程ID */
  threadId: string;
  /** 工作流ID */
  workflowId: string;
  /** 工作流版本 */
  workflowVersion: string;
  /** 线程状态 */
  status: ThreadStatus;
  /** 当前节点ID */
  currentNodeId?: string;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime?: number;
  /** 执行时间（毫秒） */
  executionTime?: number;
  /** 元数据 */
  metadata?: any;
}

/**
 * 工具过滤器
 */
export interface ToolFilter {
  /** 工具名称 */
  name?: string;
  /** 工具类型 */
  type?: ToolType;
  /** 工具分类 */
  category?: string;
  /** 标签数组 */
  tags?: string[];
}

/**
 * 工具执行选项
 */
export interface ToolOptions {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 是否启用日志 */
  enableLogging?: boolean;
}

/**
 * 工具执行结果
 */
export interface ToolExecutionResult {
  /** 执行是否成功 */
  success: boolean;
  /** 执行结果数据 */
  result?: any;
  /** 错误信息 */
  error?: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 工具名称 */
  toolName: string;
}

/**
 * 工具测试结果
 */
export interface ToolTestResult {
  /** 测试是否通过 */
  passed: boolean;
  /** 测试结果数据 */
  result?: any;
  /** 错误信息 */
  error?: string;
  /** 测试时间（毫秒） */
  testTime: number;
  /** 工具名称 */
  toolName: string;
}

/**
 * 事件过滤器
 */
export interface EventFilter {
  /** 事件类型 */
  eventType?: EventType;
  /** 线程ID */
  threadId?: string;
  /** 工作流ID */
  workflowId?: string;
  /** 节点ID */
  nodeId?: string;
  /** 开始时间戳 */
  startTimeFrom?: number;
  /** 结束时间戳 */
  startTimeTo?: number;
}

/**
 * SDK配置选项
 */
export interface SDKOptions {
  /** 是否启用版本管理 */
  enableVersioning?: boolean;
  /** 最大版本数 */
  maxVersions?: number;
  /** 自定义WorkflowRegistry */
  workflowRegistry?: any;
  /** 自定义ThreadRegistry */
  threadRegistry?: any;
}

/**
 * 检查点过滤器
 */
export interface CheckpointFilter {
  /** 线程ID */
  threadId?: string;
  /** 工作流ID */
  workflowId?: string;
  /** 开始时间戳 */
  startTimeFrom?: number;
  /** 结束时间戳 */
  startTimeTo?: number;
  /** 标签数组 */
  tags?: string[];
}

/**
 * 检查点摘要
 */
export interface CheckpointSummary {
  /** 检查点ID */
  checkpointId: string;
  /** 线程ID */
  threadId: string;
  /** 工作流ID */
  workflowId: string;
  /** 时间戳 */
  timestamp: number;
  /** 元数据 */
  metadata?: any;
}

/**
 * 变量更新选项
 */
export interface VariableUpdateOptions {
  /** 是否验证变量类型 */
  validateType?: boolean;
  /** 是否允许更新只读变量 */
  allowReadonlyUpdate?: boolean;
}

/**
 * 变量过滤器
 */
export interface VariableFilter {
  /** 变量名称 */
  name?: string;
  /** 变量类型 */
  type?: string;
  /** 变量作用域 */
  scope?: 'local' | 'global';
  /** 是否只读 */
  readonly?: boolean;
}

/**
 * 节点模板过滤器
 */
export interface NodeTemplateFilter {
  /** 节点模板名称 */
  name?: string;
  /** 节点类型 */
  type?: string;
  /** 分类 */
  category?: string;
  /** 标签数组 */
  tags?: string[];
}

/**
 * 节点模板摘要
 */
export interface NodeTemplateSummary {
  /** 节点模板名称 */
  name: string;
  /** 节点类型 */
  type: string;
  /** 节点描述 */
  description?: string;
  /** 分类 */
  category?: string;
  /** 标签数组 */
  tags?: string[];
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否验证通过 */
  valid: boolean;
  /** 错误信息数组 */
  errors: string[];
  /** 警告信息数组 */
  warnings?: string[];
}

/**
 * 触发器过滤器
 */
export interface TriggerFilter {
  /** 触发器ID */
  triggerId?: string;
  /** 触发器名称 */
  name?: string;
  /** 触发器状态 */
  status?: string;
  /** 关联的工作流ID */
  workflowId?: string;
  /** 关联的线程ID */
  threadId?: string;
}

// 重新导出触发器模板类型
export type { TriggerTemplateFilter, TriggerTemplateSummary };
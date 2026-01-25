/**
 * Thread类型定义
 * 定义工作流执行线程的结构（执行实例）
 */

import { Node } from './node';

/**
 * 线程状态枚举
 */
export enum ThreadStatus {
  /** 已创建 */
  CREATED = 'CREATED',
  /** 正在运行 */
  RUNNING = 'RUNNING',
  /** 已暂停 */
  PAUSED = 'PAUSED',
  /** 已完成 */
  COMPLETED = 'COMPLETED',
  /** 已失败 */
  FAILED = 'FAILED',
  /** 已取消 */
  CANCELLED = 'CANCELLED',
  /** 超时 */
  TIMEOUT = 'TIMEOUT'
}

/**
 * 线程变量类型
 */
export interface ThreadVariable {
  /** 变量名称 */
  name: string;
  /** 变量值 */
  value: any;
  /** 变量类型 */
  type: string;
  /** 变量作用域（local、global） */
  scope: 'local' | 'global';
  /** 是否只读 */
  readonly: boolean;
  /** 变量元数据 */
  metadata?: Record<string, any>;
}

/**
 * 线程元数据类型
 */
export interface ThreadMetadata {
  /** 创建者 */
  creator?: string;
  /** 标签数组 */
  tags?: string[];
  /** 自定义字段对象 */
  customFields?: Record<string, any>;
  /** 父线程ID（用于fork场景） */
  parentThreadId?: string;
  /** 子线程ID数组（用于fork场景） */
  childThreadIds?: string[];
}

/**
 * 节点执行结果类型
 */
export interface NodeExecutionResult {
  /** 节点ID */
  nodeId: string;
  /** 节点类型 */
  nodeType: string;
  /** 执行状态 */
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'CANCELLED';
  /** 输出数据 */
  output?: any;
  /** 错误信息 */
  error?: any;
  /** 执行时间（毫秒） */
  executionTime?: number;
  /** 开始时间 */
  startTime?: number;
  /** 结束时间 */
  endTime?: number;
}

/**
 * 执行历史记录类型
 */
export interface ExecutionHistoryEntry {
  /** 步骤序号 */
  step: number;
  /** 节点ID */
  nodeId: string;
  /** 节点类型 */
  nodeType: string;
  /** 执行状态 */
  status: string;
  /** 时间戳 */
  timestamp: number;
  /** 输入数据 */
  input?: any;
  /** 输出数据 */
  output?: any;
  /** 错误信息 */
  error?: any;
}

/**
 * 线程定义类型（执行实例）
 */
export interface Thread {
  /** 线程唯一标识符 */
  id: string;
  /** 关联的工作流ID */
  workflowId: string;
  /** 工作流版本 */
  workflowVersion: string;
  /** 线程状态 */
  status: ThreadStatus;
  /** 当前执行节点ID */
  currentNodeId: string;
  /** 变量对象数组 */
  variables: ThreadVariable[];
  /** 输入数据 */
  input: Record<string, any>;
  /** 输出数据 */
  output: Record<string, any>;
  /** 节点执行结果映射 */
  nodeResults: Map<string, NodeExecutionResult>;
  /** 执行历史记录 */
  executionHistory: ExecutionHistoryEntry[];
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime?: number;
  /** 错误信息数组 */
  errors: any[];
  /** 线程元数据 */
  metadata?: ThreadMetadata;
}

/**
 * 线程执行选项类型
 */
export interface ThreadOptions {
  /** 输入数据对象 */
  input?: Record<string, any>;
  /** 最大执行步数 */
  maxSteps?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否启用检查点 */
  enableCheckpoints?: boolean;
  /** 节点执行完成回调 */
  onNodeExecuted?: (result: NodeExecutionResult) => void | Promise<void>;
  /** 工具调用回调 */
  onToolCalled?: (toolName: string, parameters: any) => void | Promise<void>;
  /** 错误回调 */
  onError?: (error: any) => void | Promise<void>;
}

/**
 * 线程执行结果类型
 */
export interface ThreadResult {
  /** 线程ID */
  threadId: string;
  /** 是否成功 */
  success: boolean;
  /** 输出数据 */
  output: Record<string, any>;
  /** 错误信息（如果有） */
  error?: any;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 节点执行结果数组 */
  nodeResults: NodeExecutionResult[];
  /** 执行元数据 */
  metadata?: Record<string, any>;
}
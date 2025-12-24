import { ID } from '@domain/common/value-objects/id';
import { Timestamp } from '@domain/common/value-objects/timestamp';
import { WorkflowState } from '@domain/workflow/state/workflow-state';
import { IExecutionContext, ExecutionContext } from './execution-context.interface';

/**
 * 执行状态枚举
 */
export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
  RESUMED = 'resumed'
}

/**
 * 执行模式枚举
 */
export enum ExecutionMode {
  SYNC = 'sync',
  ASYNC = 'async',
  BATCH = 'batch',
  STREAMING = 'streaming'
}

/**
 * 执行优先级枚举
 */
export enum ExecutionPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 执行配置接口
 */
export interface ExecutionConfig {
  /** 超时时间（毫秒） */
  timeout?: number;
  
  /** 重试次数 */
  maxRetries?: number;
  
  /** 优先级 */
  priority?: ExecutionPriority;
  
  /** 模式 */
  mode?: ExecutionMode;
  
  /** 是否启用调试 */
  debug?: boolean;
  
  /** 并发限制 */
  concurrencyLimit?: number;
  
  /** 错误处理策略 */
  errorHandling?: 'fail-fast' | 'continue-on-error' | 'retry-on-error';
  
  /** 执行上下文参数 */
  contextParams?: Record<string, any>;
}

/**
 * 执行结果接口
 */
export interface ExecutionResult {
  /** 执行ID */
  executionId: ID;
  
  /** 执行状态 */
  status: ExecutionStatus;
  
  /** 执行结果数据 */
  data?: any;
  
  /** 错误信息 */
  error?: Error;
  
  /** 执行统计 */
  statistics: ExecutionStatistics;
  
  /** 执行完成时间 */
  completedAt?: Timestamp;
}

/**
 * 执行统计接口
 */
export interface ExecutionStatistics {
  /** 总执行时间（毫秒） */
  totalTime: number;
  
  /** 节点执行时间 */
  nodeExecutionTime: number;
  
  /** 成功执行的节点数 */
  successfulNodes: number;
  
  /** 失败的节点数 */
  failedNodes: number;
  
  /** 跳过的节点数 */
  skippedNodes: number;
  
  /** 重试次数 */
  retries: number;
}

/**
 * 执行进度接口
 */
export interface ExecutionProgress {
  /** 执行ID */
  executionId: ID;
  
  /** 总节点数 */
  totalNodes: number;
  
  /** 已完成节点数 */
  completedNodes: number;
  
  /** 当前执行的节点 */
  currentNodeId?: ID;
  
  /** 进度百分比 */
  progress: number;
  
  /** 预估剩余时间 */
  estimatedRemainingTime?: number;
}

/**
 * 执行事件回调类型
 */
export type ExecutionEventCallback = (event: ExecutionEvent) => void;

/**
 * 执行事件接口
 */
export interface ExecutionEvent {
  /** 事件类型 */
  type: 'started' | 'progress' | 'completed' | 'failed' | 'paused' | 'resumed' | 'node-executed';
  
  /** 执行ID */
  executionId: ID;
  
  /** 事件时间戳 */
  timestamp: Timestamp;
  
  /** 附加数据 */
  data?: any;
}

/**
 * 执行上下文管理器接口
 */
export interface IExecutionContextManager {
  /** 获取执行上下文 */
  getExecutionContext(executionId: string): Promise<IExecutionContext | undefined>;

  /** 设置执行上下文 */
  setExecutionContext(context: IExecutionContext): Promise<void>;

  /** 更新执行上下文 */
  updateExecutionContext(executionId: string, updates: Partial<IExecutionContext>): Promise<void>;

  /** 删除执行上下文 */
  removeExecutionContext(executionId: string): Promise<void>;

  /** 检查执行上下文是否存在 */
  hasExecutionContext(executionId: string): Promise<boolean>;

  /** 创建执行上下文 */
  createContext(context: IExecutionContext): Promise<void>;

  /** 更新状态 */
  updateStatus(executionId: string, status: ExecutionStatus): Promise<void>;

  /** 清理过期上下文 */
  cleanupExpiredContexts(): Promise<void>;

  /** 导出上下文 */
  exportContext(executionId: string): Promise<IExecutionContext | null>;

  /** 导入上下文 */
  importContext(context: IExecutionContext): Promise<void>;

  /** 获取上下文 */
  getContext(executionId: string): Promise<IExecutionContext | undefined>;
}
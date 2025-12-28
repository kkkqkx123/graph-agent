/**
 * 线程协调服务接口
 *
 * 定义线程协调和管理的业务契约
 * 具体实现在基础设施层提供
 */

import { ID } from '../../common/value-objects/id';

/**
 * 线程执行上下文接口
 * 用于线程协调服务的执行上下文
 */
export interface ThreadExecutionContext {
  executionId: string;
  workflowId: string;
  data: Record<string, any>;
  workflowState?: any;
  executionHistory?: any[];
  metadata?: Record<string, any>;
  startTime?: Date;
  status?: string;
  getVariable: (path: string) => any;
  setVariable: (path: string, value: any) => void;
  getAllVariables: () => Record<string, any>;
  getAllMetadata: () => Record<string, any>;
  getInput: () => Record<string, any>;
  getExecutedNodes: () => string[];
  getNodeResult: (nodeId: string) => any;
  getElapsedTime: () => number;
  getWorkflow: () => any;
}

/**
 * 执行状态枚举
 */
export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * 执行结果接口
 */
export interface ExecutionResult {
  executionId: ID;
  status: ExecutionStatus;
  data: any;
  statistics?: {
    totalTime: number;
    nodeExecutionTime: number;
    successfulNodes: number;
    failedNodes: number;
    skippedNodes: number;
    retries: number;
  };
}

/**
 * 线程池状态接口
 */
export interface ThreadPoolStatus {
  activeThreads: number;
  maxThreads: number;
  queuedTasks: number;
  totalThreads?: number;
  pendingThreads?: number;
  completedThreads?: number;
  failedThreads?: number;
  resourceUsage?: Record<string, any>;
}

/**
 * 线程协调服务接口
 */
export interface ThreadCoordinatorService {
  /**
   * 提交线程执行任务
   * @param threadId 线程ID
   * @param workflowId 工作流ID
   * @param resourceRequirement 资源需求
   * @param context 执行上下文
   */
  submitThreadExecution(
    threadId: ID,
    workflowId: ID,
    resourceRequirement: any,
    context: ThreadExecutionContext
  ): Promise<void>;

  /**
   * 获取线程池状态
   * @returns 线程池状态
   */
  getThreadPoolStatus(): ThreadPoolStatus;

  /**
   * 取消线程执行
   * @param threadId 线程ID
   */
  cancelThreadExecution(threadId: ID): Promise<void>;

  /**
   * 暂停线程执行
   * @param threadId 线程ID
   */
  pauseThreadExecution(threadId: ID): Promise<void>;

  /**
   * 恢复线程执行
   * @param threadId 线程ID
   */
  resumeThreadExecution(threadId: ID): Promise<void>;

  /**
   * 协调执行
   * @param workflowId 工作流ID
   * @param context 执行上下文
   * @returns 线程ID
   */
  coordinateExecution(workflowId: ID, context: ThreadExecutionContext): Promise<ID>;

  /**
   * 分叉线程
   * @param parentThreadId 父线程ID
   * @param forkPoint 分叉点
   * @returns 新线程ID
   */
  forkThread(parentThreadId: ID, forkPoint: string): Promise<ID>;

  /**
   * 合并线程
   * @param threadIds 线程ID列表
   * @returns 合并结果
   */
  joinThreads(threadIds: ID[]): Promise<ExecutionResult>;

  /**
   * 分配资源
   * @param threadId 线程ID
   * @param requirements 资源需求列表
   */
  allocateResources(threadId: ID, requirements: any[]): Promise<void>;

  /**
   * 释放资源
   * @param threadId 线程ID
   */
  releaseResources(threadId: ID): Promise<void>;

  /**
   * 监控线程池
   * @param sessionId 会话ID
   * @returns 线程池状态
   */
  monitorThreadPool(sessionId: ID): Promise<ThreadPoolStatus>;

  /**
   * 等待线程完成
   * @param threadId 线程ID
   * @returns 执行结果
   */
  waitForCompletion(threadId: ID): Promise<ExecutionResult>;
}
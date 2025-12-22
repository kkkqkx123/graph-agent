import { ID } from '../../common/value-objects/id';
import { ExecutionContext } from '../../workflow/execution';
import { ExecutionResult } from '../../workflow/execution';

/**
 * 资源需求接口
 */
export interface ResourceRequirement {
  readonly type: string;
  readonly amount: number;
  readonly priority: number;
}

/**
 * 线程池状态接口
 */
export interface ThreadPoolStatus {
  readonly totalThreads: number;
  readonly activeThreads: number;
  readonly pendingThreads: number;
  readonly completedThreads: number;
  readonly failedThreads: number;
  readonly resourceUsage: Record<string, number>;
}

/**
 * ThreadCoordinatorService接口
 * 
 * 职责：协调多个线程的执行
 */
export interface ThreadCoordinatorService {
  /**
   * 协调执行
   * @param workflowId 工作流ID
   * @param context 执行上下文
   * @returns 线程ID
   */
  coordinateExecution(workflowId: ID, context: ExecutionContext): Promise<ID>;

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
  allocateResources(threadId: ID, requirements: ResourceRequirement[]): Promise<void>;

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
import { ID } from '../../../domain/common/value-objects/id';
import { WorkflowExecutionResultDto } from '../../workflow/dtos';

/**
 * 线程动作类型
 */
export type ThreadAction = 'start' | 'pause' | 'resume' | 'complete' | 'fail' | 'cancel';

/**
 * 状态变更接口
 */
export interface StateChange {
  readonly type: 'thread' | 'session' | 'resource';
  readonly id: ID;
  readonly oldState: string;
  readonly newState: string;
  readonly timestamp: Date;
}

/**
 * SessionOrchestrationService接口
 * 
 * 职责：编排会话内的多个线程执行
 */
export interface SessionOrchestrationService {
  /**
   * 编排工作流执行
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @param context 执行上下文
   * @returns 执行结果
   */
  orchestrateWorkflowExecution(sessionId: ID, workflowId: ID, context: Record<string, unknown>): Promise<WorkflowExecutionResultDto>;

  /**
   * 编排并行执行
   * @param sessionId 会话ID
   * @param workflowIds 工作流ID列表
   * @param context 执行上下文
   * @returns 执行结果列表
   */
  orchestrateParallelExecution(sessionId: ID, workflowIds: ID[], context: Record<string, unknown>): Promise<WorkflowExecutionResultDto[]>;

  /**
   * 创建线程
   * @param sessionId 会话ID
   * @param workflowId 工作流ID
   * @returns 线程ID
   */
  createThread(sessionId: ID, workflowId?: ID): Promise<ID>;

  /**
   * 管理线程生命周期
   * @param sessionId 会话ID
   * @param threadId 线程ID
   * @param action 线程动作
   */
  manageThreadLifecycle(sessionId: ID, threadId: ID, action: ThreadAction): Promise<void>;

  /**
   * 同步会话状态
   * @param sessionId 会话ID
   */
  syncSessionState(sessionId: ID): Promise<void>;

  /**
   * 广播状态变更
   * @param sessionId 会话ID
   * @param change 状态变更
   */
  broadcastStateChange(sessionId: ID, change: StateChange): Promise<void>;
}
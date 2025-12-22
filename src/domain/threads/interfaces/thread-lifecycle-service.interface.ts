import { ExecutionContext } from '../../workflow/execution';
import { ThreadStatus } from '../value-objects/thread-status';

/**
 * ThreadLifecycleService接口
 * 
 * 职责：管理线程的生命周期操作
 */
export interface ThreadLifecycleService {
  /**
   * 启动线程
   * @param threadId 线程ID
   * @param context 执行上下文
   */
  start(threadId: string, context: ExecutionContext): Promise<void>;

  /**
   * 暂停线程
   * @param threadId 线程ID
   * @param reason 暂停原因
   */
  pause(threadId: string, reason?: string): Promise<void>;

  /**
   * 恢复线程
   * @param threadId 线程ID
   * @param reason 恢复原因
   */
  resume(threadId: string, reason?: string): Promise<void>;

  /**
   * 完成线程
   * @param threadId 线程ID
   * @param result 执行结果
   */
  complete(threadId: string, result?: unknown): Promise<void>;

  /**
   * 失败线程
   * @param threadId 线程ID
   * @param error 错误信息
   */
  fail(threadId: string, error: Error): Promise<void>;

  /**
   * 取消线程
   * @param threadId 线程ID
   * @param reason 取消原因
   */
  cancel(threadId: string, reason?: string): Promise<void>;

  /**
   * 获取线程状态
   * @param threadId 线程ID
   * @returns 线程状态
   */
  getStatus(threadId: string): Promise<ThreadStatus>;

  /**
   * 获取线程进度
   * @param threadId 线程ID
   * @returns 线程进度（0-100）
   */
  getProgress(threadId: string): Promise<number>;

  /**
   * 获取执行上下文
   * @param threadId 线程ID
   * @returns 执行上下文
   */
  getExecutionContext(threadId: string): Promise<ExecutionContext>;
}
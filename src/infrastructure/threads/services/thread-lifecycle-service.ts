/**
 * ThreadLifecycleService基础设施实现
 */

import { injectable } from 'inversify';
import { ID } from '../../../domain/common/value-objects/id';
import { ExecutionContext } from '../../../domain/workflow/execution';
import { ThreadStatus } from '../../../domain/threads/value-objects/thread-status';
import { ThreadLifecycleService } from '../../../domain/threads/interfaces/thread-lifecycle-service.interface';
import { ThreadDefinitionRepository } from '../../../domain/threads/interfaces/thread-definition-repository.interface';
import { ThreadExecutionRepository } from '../../../domain/threads/interfaces/thread-execution-repository.interface';

/**
 * ThreadLifecycleService基础设施实现
 */
@injectable()
export class ThreadLifecycleInfrastructureService implements ThreadLifecycleService {
  constructor(
    private readonly threadDefinitionRepository: ThreadDefinitionRepository,
    private readonly threadExecutionRepository: ThreadExecutionRepository
  ) {}

  /**
   * 启动线程
   * @param threadId 线程ID
   * @param context 执行上下文
   */
  async start(threadId: string, context: ExecutionContext): Promise<void> {
    const threadExecution = await this.threadExecutionRepository.findByThreadDefinitionId(ID.fromString(threadId));
    if (!threadExecution) {
      throw new Error(`线程执行记录不存在: ${threadId}`);
    }

    // 使用正确的方法更新线程执行状态
    threadExecution.start();
    await this.threadExecutionRepository.save(threadExecution);
  }

  /**
   * 暂停线程
   * @param threadId 线程ID
   * @param reason 暂停原因
   */
  async pause(threadId: string, reason?: string): Promise<void> {
    const threadExecution = await this.threadExecutionRepository.findByThreadDefinitionId(ID.fromString(threadId));
    if (!threadExecution) {
      throw new Error(`线程执行记录不存在: ${threadId}`);
    }

    threadExecution.pause();
    await this.threadExecutionRepository.save(threadExecution);
  }

  /**
   * 恢复线程
   * @param threadId 线程ID
   * @param reason 恢复原因
   */
  async resume(threadId: string, reason?: string): Promise<void> {
    const threadExecution = await this.threadExecutionRepository.findByThreadDefinitionId(ID.fromString(threadId));
    if (!threadExecution) {
      throw new Error(`线程执行记录不存在: ${threadId}`);
    }

    threadExecution.resume();
    await this.threadExecutionRepository.save(threadExecution);
  }

  /**
   * 完成线程
   * @param threadId 线程ID
   * @param result 执行结果
   */
  async complete(threadId: string, result?: unknown): Promise<void> {
    const threadExecution = await this.threadExecutionRepository.findByThreadDefinitionId(ID.fromString(threadId));
    if (!threadExecution) {
      throw new Error(`线程执行记录不存在: ${threadId}`);
    }

    threadExecution.complete();
    await this.threadExecutionRepository.save(threadExecution);
  }

  /**
   * 失败线程
   * @param threadId 线程ID
   * @param error 错误信息
   */
  async fail(threadId: string, error: Error): Promise<void> {
    const threadExecution = await this.threadExecutionRepository.findByThreadDefinitionId(ID.fromString(threadId));
    if (!threadExecution) {
      throw new Error(`线程执行记录不存在: ${threadId}`);
    }

    threadExecution.fail(error.message);
    await this.threadExecutionRepository.save(threadExecution);
  }

  /**
   * 取消线程
   * @param threadId 线程ID
   * @param reason 取消原因
   */
  async cancel(threadId: string, reason?: string): Promise<void> {
    const threadExecution = await this.threadExecutionRepository.findByThreadDefinitionId(ID.fromString(threadId));
    if (!threadExecution) {
      throw new Error(`线程执行记录不存在: ${threadId}`);
    }

    threadExecution.cancel();
    await this.threadExecutionRepository.save(threadExecution);
  }

  /**
   * 获取线程状态
   * @param threadId 线程ID
   * @returns 线程状态
   */
  async getStatus(threadId: string): Promise<ThreadStatus> {
    const threadExecution = await this.threadExecutionRepository.findByThreadDefinitionId(ID.fromString(threadId));
    if (!threadExecution) {
      throw new Error(`线程执行记录不存在: ${threadId}`);
    }

    return threadExecution.status;
  }

  /**
   * 获取线程进度
   * @param threadId 线程ID
   * @returns 线程进度（0-100）
   */
  async getProgress(threadId: string): Promise<number> {
    const threadExecution = await this.threadExecutionRepository.findByThreadDefinitionId(ID.fromString(threadId));
    if (!threadExecution) {
      throw new Error(`线程执行记录不存在: ${threadId}`);
    }

    return threadExecution.progress;
  }

  /**
   * 获取执行上下文
   * @param threadId 线程ID
   * @returns 执行上下文
   */
  async getExecutionContext(threadId: string): Promise<ExecutionContext> {
    const threadExecution = await this.threadExecutionRepository.findByThreadDefinitionId(ID.fromString(threadId));
    if (!threadExecution) {
      throw new Error(`线程执行记录不存在: ${threadId}`);
    }

    return threadExecution.executionContext;
  }
}
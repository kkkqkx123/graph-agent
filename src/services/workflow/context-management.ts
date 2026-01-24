/**
 * 工作流上下文管理服务
 *
 * 负责管理工作流上下文的生命周期，包括创建、获取、更新和删除
 * 采用不可变更新模式，确保线程安全
 */

import { injectable, inject } from 'inversify';
import { WorkflowContext } from '../../domain/workflow/value-objects/context/workflow-context';
import { ILogger } from '../../domain/common/types/logger-types';
import { EntityNotFoundError } from '../../domain/common/exceptions';

/**
 * 上下文更新器类型
 */
export type ContextUpdater = (context: WorkflowContext) => WorkflowContext;

/**
 * 工作流上下文管理服务
 */
@injectable()
export class ContextManagement {
  private readonly contexts: Map<string, WorkflowContext>;

  constructor(@inject('Logger') private readonly logger: ILogger) {
    this.contexts = new Map();
  }

  /**
   * 创建工作流上下文
   * @param workflowId 工作流ID
   * @param executionId 执行ID
   * @returns 工作流上下文实例
   */
  createContext(workflowId: string, executionId: string): WorkflowContext {
    const context = WorkflowContext.create(workflowId, executionId);
    this.contexts.set(executionId, context);

    this.logger.debug('创建工作流上下文', {
      workflowId,
      executionId,
    });

    return context;
  }

  /**
   * 获取工作流上下文
   * @param executionId 执行ID
   * @returns 工作流上下文实例，如果不存在则返回null
   */
  getContext(executionId: string): WorkflowContext | null {
    return this.contexts.get(executionId) || null;
  }

  /**
   * 更新工作流上下文（不可变更新）
   * @param executionId 执行ID
   * @param updater 上下文更新器函数
   * @returns 更新后的工作流上下文实例
   * @throws 如果上下文不存在则抛出错误
   */
  updateContext(executionId: string, updater: ContextUpdater): WorkflowContext {
    const context = this.contexts.get(executionId);
    if (!context) {
      throw new EntityNotFoundError('WorkflowContext', executionId);
    }

    const newContext = updater(context);
    this.contexts.set(executionId, newContext);

    this.logger.debug('更新工作流上下文', {
      executionId,
      variablesCount: newContext.variables.size,
      promptHistoryLength: newContext.promptState.history.length,
    });

    return newContext;
  }

  /**
   * 删除工作流上下文
   * @param executionId 执行ID
   */
  deleteContext(executionId: string): void {
    const deleted = this.contexts.delete(executionId);

    if (deleted) {
      this.logger.debug('删除工作流上下文', { executionId });
    }
  }

  /**
   * 检查工作流上下文是否存在
   * @param executionId 执行ID
   * @returns 是否存在
   */
  hasContext(executionId: string): boolean {
    return this.contexts.has(executionId);
  }

  /**
   * 获取所有活跃的执行ID
   * @returns 执行ID列表
   */
  getActiveExecutionIds(): string[] {
    return Array.from(this.contexts.keys());
  }

  /**
   * 获取活跃上下文数量
   * @returns 活跃上下文数量
   */
  getActiveContextCount(): number {
    return this.contexts.size;
  }

  /**
   * 清理所有上下文
   */
  clearAll(): void {
    const count = this.contexts.size;
    this.contexts.clear();

    this.logger.info('清理所有工作流上下文', { count });
  }

  /**
   * 获取上下文统计信息
   * @param executionId 执行ID
   * @returns 统计信息
   */
  getContextStatistics(executionId: string): {
    variablesCount: number;
    promptHistoryLength: number;
    nodeExecutionsCount: number;
    metadataKeysCount: number;
  } | null {
    const context = this.contexts.get(executionId);
    if (!context) {
      return null;
    }

    return {
      variablesCount: context.variables.size,
      promptHistoryLength: context.promptState.history.length,
      nodeExecutionsCount: context.executionState.nodeExecutions.size,
      metadataKeysCount: Object.keys(context.metadata).length,
    };
  }
}
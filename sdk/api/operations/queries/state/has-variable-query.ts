/**
 * HasVariableQuery - 检查变量是否存在
 */

import { BaseQuery, QueryMetadata, querySuccess, queryFailure } from '../../../core/query';
import { threadRegistry, type ThreadRegistry } from '../../../../core/services/thread-registry';
import type { Thread } from '../../../../types/thread';
import { NotFoundError } from '../../../../types/errors';

/**
 * 检查变量参数
 */
export interface HasVariableParams {
  /** 线程ID */
  threadId: string;
  /** 变量名称 */
  name: string;
}

/**
 * HasVariableQuery - 检查线程的指定变量是否存在
 */
export class HasVariableQuery extends BaseQuery<boolean> {
  constructor(
    private readonly params: HasVariableParams,
    private readonly threadRegistry: ThreadRegistry = threadRegistry
  ) {
    super();
  }

  /**
   * 获取查询元数据
   */
  getMetadata(): QueryMetadata {
    return {
      name: 'HasVariable',
      description: '检查线程的指定变量是否存在',
      category: 'state',
      requiresAuth: false,
      version: '1.0.0'
    };
  }

  /**
   * 执行查询
   */
  async execute() {
    try {
      const thread = await this.getThread(this.params.threadId);
      const exists = this.params.name in thread.variableScopes.thread;

      return querySuccess(exists, this.getExecutionTime());
    } catch (error) {
      return queryFailure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        this.getExecutionTime()
      );
    }
  }

  /**
   * 获取线程实例
   */
  private async getThread(threadId: string): Promise<Thread> {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'thread', threadId);
    }
    return threadContext.thread;
  }
}
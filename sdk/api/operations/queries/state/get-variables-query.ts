/**
 * GetVariablesQuery - 获取所有变量值
 */

import { BaseQuery, QueryMetadata, querySuccess, queryFailure } from '../../../core/query';
import { threadRegistry, type ThreadRegistry } from '../../../../core/services/thread-registry';
import type { Thread } from '../../../../types/thread';
import { NotFoundError } from '../../../../types/errors';

/**
 * 获取变量参数
 */
export interface GetVariablesParams {
  /** 线程ID */
  threadId: string;
}

/**
 * GetVariablesQuery - 获取线程的所有变量值
 */
export class GetVariablesQuery extends BaseQuery<Record<string, any>> {
  constructor(
    private readonly params: GetVariablesParams,
    private readonly threadRegistry: ThreadRegistry = threadRegistry
  ) {
    super();
  }

  /**
   * 获取查询元数据
   */
  getMetadata(): QueryMetadata {
    return {
      name: 'GetVariables',
      description: '获取线程的所有变量值',
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
      const variables = { ...thread.variableScopes.thread };

      return querySuccess(variables, this.getExecutionTime());
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
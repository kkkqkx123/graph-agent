/**
 * GetVariableQuery - 获取变量值
 */

import { BaseQuery, QueryMetadata, querySuccess, queryFailure } from '../../../core/query';
import { threadRegistry, type ThreadRegistry } from '../../../../core/services/thread-registry';
import type { Thread } from '../../../../types/thread';
import { NotFoundError } from '../../../../types/errors';

/**
 * 获取变量参数
 */
export interface GetVariableParams {
  /** 线程ID */
  threadId: string;
  /** 变量名称 */
  name: string;
}

/**
 * GetVariableQuery - 获取线程的指定变量值
 */
export class GetVariableQuery extends BaseQuery<any> {
  constructor(
    private readonly params: GetVariableParams,
    private readonly threadRegistry: ThreadRegistry = threadRegistry
  ) {
    super();
  }

  /**
   * 获取查询元数据
   */
  getMetadata(): QueryMetadata {
    return {
      name: 'GetVariable',
      description: '获取线程的指定变量值',
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

      if (!(this.params.name in thread.variableScopes.thread)) {
        return queryFailure(
          new NotFoundError(`Variable not found: ${this.params.name}`, 'variable', this.params.name).message,
          this.getExecutionTime()
        );
      }

      const value = thread.variableScopes.thread[this.params.name];

      return querySuccess(value, this.getExecutionTime());
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
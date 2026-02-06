/**
 * GetVariableCommand - 获取变量值
 */

import { BaseCommand } from '../../../../core/command';
import { CommandValidationResult } from '../../../../core/command';
import { threadRegistry, type ThreadRegistry } from '../../../../../core/services/thread-registry';
import type { Thread } from '../../../../../types/thread';
import { NotFoundError } from '../../../../../types/errors';
import type { ExecutionResult } from '../../../../types/execution-result';
import { success, failure } from '../../../../types/execution-result';

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
 * GetVariableCommand - 获取变量值
 */
export class GetVariableCommand extends BaseCommand<any> {
  constructor(
    private readonly params: GetVariableParams,
    private readonly threadRegistry: ThreadRegistry = threadRegistry
  ) {
    super();
  }

  /**
   * 获取命令元数据
   */
  getMetadata() {
    return {
      name: 'GetVariable',
      description: '获取线程的指定变量值',
      category: 'monitoring' as const,
      requiresAuth: false,
      version: '1.0.0'
    };
  }

  /**
   * 验证命令参数
   */
  validate(): CommandValidationResult {
    const errors: string[] = [];

    if (!this.params.threadId || this.params.threadId.trim() === '') {
      errors.push('threadId is required and cannot be empty');
    }

    if (!this.params.name || this.params.name.trim() === '') {
      errors.push('name is required and cannot be empty');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 执行命令
   */
  async execute(): Promise<ExecutionResult<any>> {
    const startTime = Date.now();

    try {
      const validation = this.validate();
      if (!validation.valid) {
        return failure(validation.errors.join(', '), Date.now() - startTime);
      }

      const thread = await this.getThread(this.params.threadId);

      if (!(this.params.name in thread.variableScopes.thread)) {
        return failure(
          new NotFoundError(`Variable not found: ${this.params.name}`, 'variable', this.params.name).message,
          Date.now() - startTime
        );
      }

      const value = thread.variableScopes.thread[this.params.name];

      return success(value, Date.now() - startTime);
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        Date.now() - startTime
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
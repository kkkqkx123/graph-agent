/**
 * GetTriggersQuery - 获取所有触发器
 */

import { BaseQuery, QueryMetadata, querySuccess, queryFailure } from '../../../types/query';
import { threadRegistry, type ThreadRegistry } from '../../../../core/services/thread-registry';
import type { Trigger } from '../../../../types/trigger';
import { NotFoundError } from '../../../../types/errors';
import type { TriggerFilter } from '../../../types/management-types';

/**
 * 获取触发器参数
 */
export interface GetTriggersParams {
  /** 线程ID */
  threadId: string;
  /** 过滤条件 */
  filter?: TriggerFilter;
}

/**
 * GetTriggersQuery - 获取线程的所有触发器
 */
export class GetTriggersQuery extends BaseQuery<Trigger[]> {
  constructor(
    private readonly params: GetTriggersParams,
    private readonly threadRegistry: ThreadRegistry = threadRegistry
  ) {
    super();
  }

  /**
   * 获取查询元数据
   */
  getMetadata(): QueryMetadata {
    return {
      name: 'GetTriggers',
      description: '获取线程的所有触发器',
      category: 'triggers',
      requiresAuth: false,
      version: '1.0.0'
    };
  }

  /**
   * 执行查询
   */
  async execute() {
    try {
      const triggerManager = await this.getTriggerManager(this.params.threadId);
      let triggers = triggerManager.getAll();

      // 应用过滤条件
      if (this.params.filter) {
        triggers = triggers.filter(t => this.applyFilter(t, this.params.filter!));
      }

      return querySuccess(triggers, this.getExecutionTime());
    } catch (error) {
      return queryFailure(
        error instanceof Error ? error.message : 'Unknown error occurred',
        this.getExecutionTime()
      );
    }
  }

  /**
   * 获取触发器管理器
   */
  private async getTriggerManager(threadId: string) {
    const threadContext = this.threadRegistry.get(threadId);
    if (!threadContext) {
      throw new NotFoundError(`Thread not found: ${threadId}`, 'thread', threadId);
    }
    return threadContext.triggerManager;
  }

  /**
   * 应用过滤条件
   */
  private applyFilter(trigger: Trigger, filter: TriggerFilter): boolean {
    if (filter.triggerId && trigger.id !== filter.triggerId) {
      return false;
    }
    if (filter.name && !trigger.name.toLowerCase().includes(filter.name.toLowerCase())) {
      return false;
    }
    if (filter.status && trigger.status !== filter.status) {
      return false;
    }
    if (filter.workflowId && trigger.workflowId !== filter.workflowId) {
      return false;
    }
    if (filter.threadId && trigger.threadId !== filter.threadId) {
      return false;
    }
    return true;
  }
}
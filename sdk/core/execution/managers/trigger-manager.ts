/**
 * TriggerManager - 触发器管理器
 * 负责触发器的注册、注销和执行触发动作
 *
 * 注意：不再通过 EventManager 监听事件，改为由 ThreadExecutor 直接调用 handleEvent()
 */

import type {
  Trigger,
  TriggerStatus
} from '../../../types/trigger';
import type { BaseEvent, NodeCustomEvent } from '../../../types/events';
import type { ID } from '../../../types/common';
import { getTriggerHandler } from '../handlers/trigger-handlers';
import { ValidationError, ExecutionError } from '../../../types/errors';
import { EventType } from '../../../types/events';
import { now } from '../../../utils';
import type { ThreadRegistry } from '../../services/thread-registry';
import type { WorkflowRegistry } from '../../services/workflow-registry';

/**
 * TriggerManager - 触发器管理器
 *
 * 职责：
 * - 触发器的注册、注销、启用、禁用
 * - 处理事件并执行匹配的触发器
 *
 * 设计原则：
 * - 不再通过 EventManager 监听事件
 * - 由 ThreadExecutor 直接调用 handleEvent() 方法
 * - 保持触发器的完整生命周期管理
 */
export class TriggerManager {
  private triggers: Map<ID, Trigger> = new Map();
  private threadRegistry: ThreadRegistry;
  private workflowRegistry?: WorkflowRegistry;

  constructor(threadRegistry: ThreadRegistry, workflowRegistry?: WorkflowRegistry) {
    this.threadRegistry = threadRegistry;
    this.workflowRegistry = workflowRegistry;
  }

  /**
   * 注册触发器
   * @param trigger 触发器
   */
  register(trigger: Trigger): void {
    // 验证触发器
    if (!trigger.id) {
      throw new ValidationError('触发器 ID 不能为空', 'trigger.id');
    }
    if (!trigger.name) {
      throw new ValidationError('触发器名称不能为空', 'trigger.name');
    }
    if (!trigger.condition || !trigger.condition.eventType) {
      throw new ValidationError('触发条件不能为空', 'trigger.condition');
    }
    if (!trigger.action || !trigger.action.type) {
      throw new ValidationError('触发动作不能为空', 'trigger.action');
    }

    // 检查是否已存在
    if (this.triggers.has(trigger.id)) {
      throw new ValidationError(`触发器 ${trigger.id} 已存在`, 'trigger.id', trigger.id);
    }

    // 存储触发器
    this.triggers.set(trigger.id, trigger);
  }

  /**
   * 注销触发器
   * @param triggerId 触发器 ID
   */
  unregister(triggerId: ID): void {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new ExecutionError(`触发器 ${triggerId} 不存在`, undefined, undefined, { triggerId });
    }

    // 删除触发器
    this.triggers.delete(triggerId);
  }

  /**
   * 启用触发器
   * @param triggerId 触发器 ID
   */
  enable(triggerId: ID): void {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new ExecutionError(`触发器 ${triggerId} 不存在`, undefined, undefined, { triggerId });
    }

    if (trigger.status !== 'disabled' as TriggerStatus) {
      return;
    }

    // 更新触发器状态
    trigger.status = 'enabled' as TriggerStatus;
    trigger.updatedAt = now();
  }

  /**
   * 禁用触发器
   * @param triggerId 触发器 ID
   */
  disable(triggerId: ID): void {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new ExecutionError(`触发器 ${triggerId} 不存在`, undefined, undefined, { triggerId });
    }

    if (trigger.status !== 'enabled' as TriggerStatus) {
      return;
    }

    // 更新触发器状态
    trigger.status = 'disabled' as TriggerStatus;
    trigger.updatedAt = now();
  }

  /**
   * 获取触发器
   * @param triggerId 触发器 ID
   * @returns 触发器
   */
  get(triggerId: ID): Trigger | undefined {
    return this.triggers.get(triggerId);
  }

  /**
   * 获取所有触发器
   * @returns 触发器数组
   */
  getAll(): Trigger[] {
    return Array.from(this.triggers.values());
  }

  /**
   * 处理事件（由 ThreadExecutor 直接调用）
   * @param event 事件对象
   */
  async handleEvent(event: BaseEvent): Promise<void> {
    // 获取所有监听该事件类型的触发器
    const triggers = Array.from(this.triggers.values()).filter(
      (trigger) =>
        trigger.condition.eventType === event.type &&
        trigger.status === 'enabled' as TriggerStatus
    );

    // 评估并执行触发器
    for (const trigger of triggers) {
      try {
        // 检查触发次数限制
        if (trigger.maxTriggers && trigger.maxTriggers > 0 && trigger.triggerCount >= trigger.maxTriggers) {
          continue;
        }

        // 检查关联关系
        if (trigger.workflowId && event.workflowId !== trigger.workflowId) {
          continue;
        }
        if (trigger.threadId && event.threadId !== trigger.threadId) {
          continue;
        }

        // 对于 NODE_CUSTOM_EVENT 事件，需要额外匹配 eventName
        if (event.type === EventType.NODE_CUSTOM_EVENT) {
          const customEvent = event as NodeCustomEvent;
          if (trigger.condition.eventName && trigger.condition.eventName !== customEvent.eventName) {
            continue;
          }
        }

        // 执行触发器
        await this.executeTrigger(trigger);
      } catch (error) {
        // 静默处理错误，避免影响其他触发器
      }
    }
  }

  /**
    * 执行触发器
    * @param trigger 触发器
    */
   private async executeTrigger(trigger: Trigger): Promise<void> {
     // 使用trigger handler函数执行触发动作
     const handler = getTriggerHandler(trigger.action.type);

     // 创建一个临时的 ExecutionContext，包含 ThreadRegistry 和 WorkflowRegistry
     const executionContext = {
       getThreadRegistry: () => this.threadRegistry,
       getWorkflowRegistry: () => this.workflowRegistry,
       getCurrentThreadId: () => trigger.threadId || null,
     };

     const result = await handler(trigger.action, trigger.id, executionContext);

     // 更新触发器状态
     trigger.triggerCount++;
     trigger.updatedAt = now();
   }

  /**
   * 清空所有触发器
   */
  clear(): void {
    // 清空触发器
    this.triggers.clear();
  }
}
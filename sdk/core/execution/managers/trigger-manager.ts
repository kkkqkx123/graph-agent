/**
 * TriggerManager - 触发器管理器
 * 负责触发器的注册、注销、监听事件和执行触发动作
 */

import type {
  Trigger,
  TriggerStatus
} from '../../../types/trigger';
import type { BaseEvent, NodeCustomEvent } from '../../../types/events';
import type { ID } from '../../../types/common';
import { EventManager } from './event-manager';
import { TriggerExecutorFactory } from '../executors';
import { ValidationError, ExecutionError } from '../../../types/errors';
import { EventType } from '../../../types/events';

/**
 * TriggerManager - 触发器管理器
 */
export class TriggerManager {
  private triggers: Map<ID, Trigger> = new Map();
  private eventListeners: Map<ID, () => void> = new Map();

  constructor(
    private eventManager: EventManager,
  ) { }

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

    // 注册事件监听器
    const unregister = this.eventManager.on(
      trigger.condition.eventType,
      this.handleEvent.bind(this)
    );
    this.eventListeners.set(trigger.id, unregister);
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

    // 注销事件监听器
    const unregister = this.eventListeners.get(triggerId);
    if (unregister) {
      unregister();
      this.eventListeners.delete(triggerId);
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
    trigger.updatedAt = Date.now();
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
    trigger.updatedAt = Date.now();
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
   * 处理事件
   * @param event 事件对象
   */
  private async handleEvent(event: BaseEvent): Promise<void> {
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
    // 使用工厂创建执行器
    const executor = TriggerExecutorFactory.createExecutor(trigger.action.type);

    // 执行触发动作（不再传递 ThreadExecutor）
    const result = await executor.execute(trigger.action, trigger.id);

    // 更新触发器状态
    trigger.triggerCount++;
    trigger.updatedAt = Date.now();
  }

  /**
   * 清空所有触发器
   */
  clear(): void {
    // 注销所有事件监听器
    for (const unregister of this.eventListeners.values()) {
      unregister();
    }
    this.eventListeners.clear();

    // 清空触发器
    this.triggers.clear();
  }
}
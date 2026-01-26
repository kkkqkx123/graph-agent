/**
 * TriggerManager - 触发器管理器
 * 负责触发器的注册、注销、监听事件和执行触发动作
 */

import type {
  Trigger,
  TriggerCondition,
  TriggerAction,
  TriggerStatus,
  TriggerExecutionResult
} from '../../types/trigger';
import type { BaseEvent, EventType } from '../../types/events';
import type { ID, Timestamp } from '../../types/common';
import { EventManager } from '../execution/event-manager';
import { TriggerExecutor } from './trigger-executor';

/**
 * TriggerManager - 触发器管理器
 */
export class TriggerManager {
  private triggers: Map<ID, Trigger> = new Map();
  private eventListeners: Map<ID, () => void> = new Map();

  constructor(
    private eventManager: EventManager,
    private triggerExecutor: TriggerExecutor
  ) {}

  /**
   * 注册触发器
   * @param trigger 触发器
   */
  register(trigger: Trigger): void {
    // 验证触发器
    if (!trigger.id) {
      throw new Error('触发器 ID 不能为空');
    }
    if (!trigger.name) {
      throw new Error('触发器名称不能为空');
    }
    if (!trigger.condition || !trigger.condition.eventType) {
      throw new Error('触发条件不能为空');
    }
    if (!trigger.action || !trigger.action.type) {
      throw new Error('触发动作不能为空');
    }

    // 检查是否已存在
    if (this.triggers.has(trigger.id)) {
      throw new Error(`触发器 ${trigger.id} 已存在`);
    }

    // 存储触发器
    this.triggers.set(trigger.id, trigger);

    // 注册事件监听器
    const unregister = this.eventManager.on(
      trigger.condition.eventType,
      this.handleEvent.bind(this)
    );
    this.eventListeners.set(trigger.id, unregister);

    console.log(`[TriggerManager] 注册触发器: ${trigger.id} - ${trigger.name}`);
  }

  /**
   * 注销触发器
   * @param triggerId 触发器 ID
   */
  unregister(triggerId: ID): void {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new Error(`触发器 ${triggerId} 不存在`);
    }

    // 注销事件监听器
    const unregister = this.eventListeners.get(triggerId);
    if (unregister) {
      unregister();
      this.eventListeners.delete(triggerId);
    }

    // 删除触发器
    this.triggers.delete(triggerId);

    console.log(`[TriggerManager] 注销触发器: ${triggerId}`);
  }

  /**
   * 启用触发器
   * @param triggerId 触发器 ID
   */
  enable(triggerId: ID): void {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new Error(`触发器 ${triggerId} 不存在`);
    }

    if (trigger.status !== 'disabled' as TriggerStatus) {
      console.warn(`[TriggerManager] 触发器 ${triggerId} 当前状态不是 disabled`);
      return;
    }

    // 更新触发器状态
    trigger.status = 'enabled' as TriggerStatus;
    trigger.updatedAt = Date.now();

    console.log(`[TriggerManager] 启用触发器: ${triggerId}`);
  }

  /**
   * 禁用触发器
   * @param triggerId 触发器 ID
   */
  disable(triggerId: ID): void {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      throw new Error(`触发器 ${triggerId} 不存在`);
    }

    if (trigger.status !== 'enabled' as TriggerStatus) {
      console.warn(`[TriggerManager] 触发器 ${triggerId} 当前状态不是 enabled`);
      return;
    }

    // 更新触发器状态
    trigger.status = 'disabled' as TriggerStatus;
    trigger.updatedAt = Date.now();

    console.log(`[TriggerManager] 禁用触发器: ${triggerId}`);
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
    console.log(`[TriggerManager] 收到事件: ${event.type}`);

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
          console.log(`[TriggerManager] 触发器 ${trigger.id} 已达到最大触发次数`);
          continue;
        }

        // 检查关联关系
        if (trigger.workflowId && event.workflowId !== trigger.workflowId) {
          continue;
        }
        if (trigger.threadId && event.threadId !== trigger.threadId) {
          continue;
        }

        // 执行触发器
        await this.executeTrigger(trigger, event);
      } catch (error) {
        console.error(`[TriggerManager] 执行触发器 ${trigger.id} 时出错:`, error);
      }
    }
  }

  /**
   * 执行触发器
   * @param trigger 触发器
   * @param event 事件对象
   */
  private async executeTrigger(trigger: Trigger, event: BaseEvent): Promise<void> {
    console.log(`[TriggerManager] 执行触发器: ${trigger.id} - ${trigger.name}`);

    // 执行触发动作
    const result = await this.triggerExecutor.execute(trigger.action, trigger.id);

    // 更新触发器状态
    trigger.triggerCount++;
    trigger.updatedAt = Date.now();

    if (result.success) {
      console.log(`[TriggerManager] 触发器 ${trigger.id} 执行成功`);
    } else {
      console.error(`[TriggerManager] 触发器 ${trigger.id} 执行失败:`, result.error);
    }
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

    console.log('[TriggerManager] 清空所有触发器');
  }
}
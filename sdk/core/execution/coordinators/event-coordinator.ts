/**
 * EventCoordinator - 事件协调器
 * 负责协调事件管理器和触发器管理器的事件处理
 * 
 * 职责：
 * - 统一触发对外事件和 Trigger 执行
 * - 协调节点事件、错误事件、子图事件的处理
 * 
 * 设计原则：
 * - 使用现有的 EventManager 和 TriggerManager
 * - 不重复实现事件管理功能
 * - 提供统一的事件触发接口
 */

import type { EventManager } from '../../services/event-manager';
import { TriggerManager } from '../managers/trigger-manager';
import type { NodeStartedEvent, NodeCompletedEvent, NodeFailedEvent, ErrorEvent, SubgraphStartedEvent, SubgraphCompletedEvent } from '../../../types/events';

/**
 * 事件协调器
 */
export class EventCoordinator {
  constructor(
    private eventManager: EventManager,
    private triggerManager: TriggerManager
  ) { }

  /**
   * 触发节点开始事件
   */
  async emitNodeStartedEvent(event: NodeStartedEvent): Promise<void> {
    await this.eventManager.emit(event);
  }

  /**
   * 触发节点完成事件
   */
  async emitNodeCompletedEvent(event: NodeCompletedEvent): Promise<void> {
    // 先触发对外事件
    await this.eventManager.emit(event);
    // 再协调 Trigger 执行
    await this.triggerManager.handleEvent(event);
  }

  /**
   * 触发节点失败事件
   */
  async emitNodeFailedEvent(event: NodeFailedEvent): Promise<void> {
    // 先触发对外事件
    await this.eventManager.emit(event);
    // 再协调 Trigger 执行
    await this.triggerManager.handleEvent(event);
  }

  /**
   * 触发错误事件
   */
  async emitErrorEvent(event: ErrorEvent): Promise<void> {
    // 先触发对外事件
    await this.eventManager.emit(event);
    // 再协调 Trigger 执行
    await this.triggerManager.handleEvent(event);
  }

  /**
   * 触发子图开始事件
   */
  async emitSubgraphStartedEvent(event: SubgraphStartedEvent): Promise<void> {
    await this.eventManager.emit(event);
  }

  /**
   * 触发子图完成事件
   */
  async emitSubgraphCompletedEvent(event: SubgraphCompletedEvent): Promise<void> {
    await this.eventManager.emit(event);
  }

  /**
   * 获取事件管理器
   */
  getEventManager(): EventManager {
    return this.eventManager;
  }

  /**
   * 获取触发器管理器
   */
  getTriggerManager(): TriggerManager {
    return this.triggerManager;
  }
}
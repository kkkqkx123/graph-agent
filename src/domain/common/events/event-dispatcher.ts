import { DomainEvent } from './domain-event';

/**
 * 事件处理器接口
 */
export interface EventHandler<T extends DomainEvent = DomainEvent> {
  /**
   * 处理领域事件
   * @param event 领域事件
   */
  handle(event: T): Promise<void> | void;
}

/**
 * 事件处理器注册信息
 */
export interface EventHandlerRegistration {
  eventName: string;
  handler: EventHandler;
  priority: number;
}

/**
 * 事件分发器
 * 
 * 负责管理领域事件的分发和处理
 */
export class EventDispatcher {
  private handlers: Map<string, EventHandlerRegistration[]> = new Map();

  /**
   * 注册事件处理器
   * @param eventName 事件名称
   * @param handler 事件处理器
   * @param priority 优先级（数字越小优先级越高）
   */
  public register<T extends DomainEvent>(
    eventName: string,
    handler: EventHandler<T>,
    priority: number = 0
  ): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }

    const registrations = this.handlers.get(eventName)!;
    registrations.push({ eventName, handler, priority });
    
    // 按优先级排序（数字越小优先级越高）
    registrations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 取消注册事件处理器
   * @param eventName 事件名称
   * @param handler 事件处理器
   */
  public unregister(eventName: string, handler: EventHandler): void {
    const registrations = this.handlers.get(eventName);
    if (!registrations) {
      return;
    }

    const index = registrations.findIndex(reg => reg.handler === handler);
    if (index !== -1) {
      registrations.splice(index, 1);
    }

    // 如果没有处理器了，删除事件
    if (registrations.length === 0) {
      this.handlers.delete(eventName);
    }
  }

  /**
   * 分发单个事件
   * @param event 领域事件
   */
  public async dispatch(event: DomainEvent): Promise<void> {
    const eventName = event.eventName;
    const registrations = this.handlers.get(eventName);

    if (!registrations || registrations.length === 0) {
      return;
    }

    // 按优先级顺序执行处理器
    for (const registration of registrations) {
      try {
        await registration.handler.handle(event);
      } catch (error) {
        console.error(`事件处理器执行失败: ${eventName}`, error);
        // 根据业务需求决定是否继续执行其他处理器
        throw error;
      }
    }
  }

  /**
   * 批量分发事件
   * @param events 领域事件列表
   */
  public async dispatchBatch(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.dispatch(event);
    }
  }

  /**
   * 检查是否有指定事件的处理器
   * @param eventName 事件名称
   * @returns 是否有处理器
   */
  public hasHandlers(eventName: string): boolean {
    const registrations = this.handlers.get(eventName);
    return registrations !== undefined && registrations.length > 0;
  }

  /**
   * 获取指定事件的处理器数量
   * @param eventName 事件名称
   * @returns 处理器数量
   */
  public getHandlerCount(eventName: string): number {
    const registrations = this.handlers.get(eventName);
    return registrations ? registrations.length : 0;
  }

  /**
   * 获取所有已注册的事件名称
   * @returns 事件名称列表
   */
  public getRegisteredEventNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * 清除所有事件处理器
   */
  public clear(): void {
    this.handlers.clear();
  }

  /**
   * 清除指定事件的所有处理器
   * @param eventName 事件名称
   */
  public clearEventHandlers(eventName: string): void {
    this.handlers.delete(eventName);
  }
}
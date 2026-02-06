/**
 * API事件系统
 * 提供统一的事件发布和订阅机制
 * 
 * 设计模式：
 * - Observer模式：事件订阅和发布
 * - Event Bus模式：集中式事件管理
 */

/**
 * 事件类型枚举
 */
export enum APIEventType {
  // 资源事件
  RESOURCE_CREATED = 'RESOURCE_CREATED',
  RESOURCE_UPDATED = 'RESOURCE_UPDATED',
  RESOURCE_DELETED = 'RESOURCE_DELETED',
  RESOURCE_ACCESSED = 'RESOURCE_ACCESSED',
  
  // 错误事件
  ERROR_OCCURRED = 'ERROR_OCCURRED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  
  // 性能事件
  SLOW_QUERY = 'SLOW_QUERY',
  CACHE_HIT = 'CACHE_HIT',
  CACHE_MISS = 'CACHE_MISS',
  
  // 操作事件
  OPERATION_STARTED = 'OPERATION_STARTED',
  OPERATION_COMPLETED = 'OPERATION_COMPLETED',
  OPERATION_FAILED = 'OPERATION_FAILED',
  
  // 系统事件
  SYSTEM_READY = 'SYSTEM_READY',
  SYSTEM_SHUTDOWN = 'SYSTEM_SHUTDOWN'
}

/**
 * 事件数据接口
 */
export interface APIEventData {
  /** 事件类型 */
  type: APIEventType;
  /** 事件时间戳 */
  timestamp: number;
  /** 事件ID */
  eventId: string;
  /** 资源类型 */
  resourceType?: string;
  /** 资源ID */
  resourceId?: string;
  /** 操作名称 */
  operation?: string;
  /** 额外数据 */
  data?: Record<string, any>;
  /** 错误信息（如果有） */
  error?: Error;
}

/**
 * 事件监听器类型
 */
export type APIEventListener = (event: APIEventData) => void | Promise<void>;

/**
 * 事件监听器配置
 */
export interface EventListenerConfig {
  /** 是否只触发一次 */
  once?: boolean;
  /** 优先级（数字越大优先级越高） */
  priority?: number;
  /** 过滤条件 */
  filter?: (event: APIEventData) => boolean;
}

/**
 * 事件总线类
 */
export class APIEventBus {
  private static instance: APIEventBus;
  private listeners: Map<APIEventType, Array<{ listener: APIEventListener; config: EventListenerConfig }>> = new Map();
  private eventHistory: APIEventData[] = [];
  private maxHistorySize: number = 1000;
  private enabled: boolean = true;

  private constructor() {}

  /**
   * 获取事件总线单例
   */
  public static getInstance(): APIEventBus {
    if (!APIEventBus.instance) {
      APIEventBus.instance = new APIEventBus();
    }
    return APIEventBus.instance;
  }

  /**
   * 订阅事件
   * @param eventType 事件类型
   * @param listener 事件监听器
   * @param config 监听器配置
   * @returns 取消订阅的函数
   */
  public on(
    eventType: APIEventType,
    listener: APIEventListener,
    config?: EventListenerConfig
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    const listenerEntry = { listener, config: config || {} };
    const listeners = this.listeners.get(eventType)!;
    
    // 按优先级排序
    listeners.push(listenerEntry);
    listeners.sort((a, b) => (b.config.priority || 0) - (a.config.priority || 0));

    // 返回取消订阅函数
    return () => this.off(eventType, listener);
  }

  /**
   * 订阅一次性事件
   * @param eventType 事件类型
   * @param listener 事件监听器
   * @param config 监听器配置
   * @returns 取消订阅的函数
   */
  public once(
    eventType: APIEventType,
    listener: APIEventListener,
    config?: EventListenerConfig
  ): () => void {
    return this.on(eventType, listener, { ...config, once: true });
  }

  /**
   * 取消订阅事件
   * @param eventType 事件类型
   * @param listener 事件监听器
   */
  public off(eventType: APIEventType, listener: APIEventListener): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.findIndex(entry => entry.listener === listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 发布事件
   * @param event 事件数据
   */
  public async emit(event: APIEventData): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // 添加到历史记录
    this.addToHistory(event);

    // 获取监听器
    const listeners = this.listeners.get(event.type);
    if (!listeners || listeners.length === 0) {
      return;
    }

    // 执行监听器
    const listenersToRemove: APIEventListener[] = [];
    
    for (const entry of listeners) {
      // 检查过滤条件
      if (entry.config.filter && !entry.config.filter(event)) {
        continue;
      }

      try {
        await entry.listener(event);
        
        // 如果是一次性监听器，标记为移除
        if (entry.config.once) {
          listenersToRemove.push(entry.listener);
        }
      } catch (error) {
        console.error(`[EventBus] Error in listener for ${event.type}:`, error);
      }
    }

    // 移除一次性监听器
    for (const listener of listenersToRemove) {
      this.off(event.type, listener);
    }
  }

  /**
   * 批量发布事件
   * @param events 事件数组
   */
  public async emitBatch(events: APIEventData[]): Promise<void> {
    for (const event of events) {
      await this.emit(event);
    }
  }

  /**
   * 清除所有监听器
   * @param eventType 可选的事件类型，如果不提供则清除所有
   */
  public clear(eventType?: APIEventType): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * 获取事件历史
   * @param filter 过滤条件
   * @returns 事件历史数组
   */
  public getHistory(filter?: {
    eventType?: APIEventType;
    resourceType?: string;
    resourceId?: string;
    startTime?: number;
    endTime?: number;
  }): APIEventData[] {
    let history = [...this.eventHistory];

    if (filter) {
      if (filter.eventType) {
        history = history.filter(e => e.type === filter.eventType);
      }
      if (filter.resourceType) {
        history = history.filter(e => e.resourceType === filter.resourceType);
      }
      if (filter.resourceId) {
        history = history.filter(e => e.resourceId === filter.resourceId);
      }
      if (filter.startTime) {
        history = history.filter(e => e.timestamp >= filter.startTime!);
      }
      if (filter.endTime) {
        history = history.filter(e => e.timestamp <= filter.endTime!);
      }
    }

    return history;
  }

  /**
   * 清除事件历史
   */
  public clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * 启用事件总线
   */
  public enable(): void {
    this.enabled = true;
  }

  /**
   * 禁用事件总线
   */
  public disable(): void {
    this.enabled = false;
  }

  /**
   * 检查事件总线是否启用
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 获取监听器数量
   * @param eventType 可选的事件类型
   * @returns 监听器数量
   */
  public getListenerCount(eventType?: APIEventType): number {
    if (eventType) {
      return this.listeners.get(eventType)?.length || 0;
    }
    
    let total = 0;
    for (const listeners of this.listeners.values()) {
      total += listeners.length;
    }
    return total;
  }

  /**
   * 添加到历史记录
   * @param event 事件数据
   */
  private addToHistory(event: APIEventData): void {
    this.eventHistory.push(event);
    
    // 限制历史记录大小
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * 设置最大历史记录大小
   * @param size 最大大小
   */
  public setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    
    // 如果当前历史记录超过新大小，截断
    while (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }
}

/**
 * 事件构建器
 * 用于创建标准化的事件数据
 */
export class APIEventBuilder {
  private event: Partial<APIEventData> = {
    timestamp: Date.now(),
    eventId: this.generateEventId()
  };

  /**
   * 设置事件类型
   */
  public type(type: APIEventType): this {
    this.event.type = type;
    return this;
  }

  /**
   * 设置资源类型
   */
  public resourceType(resourceType: string): this {
    this.event.resourceType = resourceType;
    return this;
  }

  /**
   * 设置资源ID
   */
  public resourceId(resourceId: string): this {
    this.event.resourceId = resourceId;
    return this;
  }

  /**
   * 设置操作名称
   */
  public operation(operation: string): this {
    this.event.operation = operation;
    return this;
  }

  /**
   * 设置额外数据
   */
  public data(data: Record<string, any>): this {
    this.event.data = data;
    return this;
  }

  /**
   * 设置错误
   */
  public error(error: Error): this {
    this.event.error = error;
    return this;
  }

  /**
   * 构建事件
   */
  public build(): APIEventData {
    if (!this.event.type) {
      throw new Error('Event type is required');
    }
    return this.event as APIEventData;
  }

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 导出全局事件总线实例
 */
export const apiEventBus = APIEventBus.getInstance();
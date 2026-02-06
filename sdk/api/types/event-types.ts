/**
 * 事件系统类型定义
 * 定义API事件系统所需的所有类型
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
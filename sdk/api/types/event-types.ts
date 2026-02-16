/**
 * 事件系统类型定义
 * 定义API事件系统所需的所有类型
 */

/**
 * 事件类型
 */
export type APIEventType =
  // 资源事件
  | 'RESOURCE_CREATED'    /** 资源已创建 */
  | 'RESOURCE_UPDATED'    /** 资源已更新 */
  | 'RESOURCE_DELETED'    /** 资源已删除 */
  | 'RESOURCE_ACCESSED'   /** 资源已访问 */
  // 错误事件
  | 'ERROR_OCCURRED'      /** 错误发生 */
  | 'VALIDATION_FAILED'   /** 验证失败 */
  // 性能事件
  | 'SLOW_QUERY'          /** 慢查询 */
  | 'CACHE_HIT'           /** 缓存命中 */
  | 'CACHE_MISS'          /** 缓存未命中 */
  // 操作事件
  | 'OPERATION_STARTED'   /** 操作开始 */
  | 'OPERATION_COMPLETED' /** 操作完成 */
  | 'OPERATION_FAILED'    /** 操作失败 */
  // 系统事件
  | 'SYSTEM_READY'        /** 系统就绪 */
  | 'SYSTEM_SHUTDOWN';    /** 系统关闭 */

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

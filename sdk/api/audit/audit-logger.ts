/**
 * 操作审计日志系统
 * 记录所有API操作的审计信息
 * 
 * 设计模式：
 * - Singleton模式：确保审计日志器唯一
 * - Strategy模式：支持不同的日志存储策略
 */

import { APIEventBus, APIEventType, type APIEventData } from '../events/api-event-system';

/**
 * 审计日志级别
 */
export enum AuditLogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * 审计日志条目
 */
export interface AuditLogEntry {
  /** 日志ID */
  logId: string;
  /** 时间戳 */
  timestamp: number;
  /** 日志级别 */
  level: AuditLogLevel;
  /** 操作类型 */
  operation: string;
  /** 资源类型 */
  resourceType: string;
  /** 资源ID */
  resourceId?: string;
  /** 用户ID */
  userId?: string;
  /** 会话ID */
  sessionId?: string;
  /** 请求ID */
  requestId?: string;
  /** 操作结果 */
  result: 'SUCCESS' | 'FAILURE';
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 错误信息（如果有） */
  error?: string;
  /** 额外数据 */
  data?: Record<string, any>;
  /** IP地址 */
  ipAddress?: string;
  /** User Agent */
  userAgent?: string;
}

/**
 * 审计日志存储接口
 */
export interface AuditLogStorage {
  /**
   * 写入日志
   * @param entry 日志条目
   */
  write(entry: AuditLogEntry): Promise<void>;
  
  /**
   * 查询日志
   * @param filter 过滤条件
   * @returns 日志条目数组
   */
  query(filter: AuditLogFilter): Promise<AuditLogEntry[]>;
  
  /**
   * 清除日志
   * @param beforeTime 清除指定时间之前的日志
   */
  clear(beforeTime?: number): Promise<void>;
}

/**
 * 审计日志过滤条件
 */
export interface AuditLogFilter {
  /** 日志级别 */
  level?: AuditLogLevel;
  /** 操作类型 */
  operation?: string;
  /** 资源类型 */
  resourceType?: string;
  /** 资源ID */
  resourceId?: string;
  /** 用户ID */
  userId?: string;
  /** 会话ID */
  sessionId?: string;
  /** 请求ID */
  requestId?: string;
  /** 操作结果 */
  result?: 'SUCCESS' | 'FAILURE';
  /** 开始时间 */
  startTime?: number;
  /** 结束时间 */
  endTime?: number;
  /** 限制数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
}

/**
 * 内存存储实现
 */
export class InMemoryAuditLogStorage implements AuditLogStorage {
  private logs: AuditLogEntry[] = [];
  private maxSize: number = 10000;

  constructor(maxSize?: number) {
    if (maxSize) {
      this.maxSize = maxSize;
    }
  }

  async write(entry: AuditLogEntry): Promise<void> {
    this.logs.push(entry);
    
    // 限制日志数量
    if (this.logs.length > this.maxSize) {
      this.logs.shift();
    }
  }

  async query(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
    let result = [...this.logs];

    if (filter.level) {
      result = result.filter(log => log.level === filter.level);
    }
    if (filter.operation) {
      result = result.filter(log => log.operation === filter.operation);
    }
    if (filter.resourceType) {
      result = result.filter(log => log.resourceType === filter.resourceType);
    }
    if (filter.resourceId) {
      result = result.filter(log => log.resourceId === filter.resourceId);
    }
    if (filter.userId) {
      result = result.filter(log => log.userId === filter.userId);
    }
    if (filter.sessionId) {
      result = result.filter(log => log.sessionId === filter.sessionId);
    }
    if (filter.requestId) {
      result = result.filter(log => log.requestId === filter.requestId);
    }
    if (filter.result) {
      result = result.filter(log => log.result === filter.result);
    }
    if (filter.startTime) {
      result = result.filter(log => log.timestamp >= filter.startTime!);
    }
    if (filter.endTime) {
      result = result.filter(log => log.timestamp <= filter.endTime!);
    }

    // 按时间倒序排序
    result.sort((a, b) => b.timestamp - a.timestamp);

    // 应用分页
    if (filter.offset) {
      result = result.slice(filter.offset);
    }
    if (filter.limit) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  async clear(beforeTime?: number): Promise<void> {
    if (beforeTime) {
      this.logs = this.logs.filter(log => log.timestamp >= beforeTime);
    } else {
      this.logs = [];
    }
  }
}

/**
 * 审计日志器配置
 */
export interface AuditLoggerConfig {
  /** 存储实现 */
  storage?: AuditLogStorage;
  /** 是否启用 */
  enabled?: boolean;
  /** 默认日志级别 */
  defaultLevel?: AuditLogLevel;
  /** 是否记录成功操作 */
  logSuccess?: boolean;
  /** 是否记录失败操作 */
  logFailure?: boolean;
  /** 是否记录性能数据 */
  logPerformance?: boolean;
}

/**
 * 审计日志器类
 */
export class AuditLogger {
  private static instance: AuditLogger;
  private storage: AuditLogStorage;
  private enabled: boolean;
  private defaultLevel: AuditLogLevel;
  private logSuccess: boolean;
  private logFailure: boolean;
  private logPerformance: boolean;
  private eventBus: APIEventBus;

  private constructor(config?: AuditLoggerConfig) {
    this.storage = config?.storage || new InMemoryAuditLogStorage();
    this.enabled = config?.enabled ?? true;
    this.defaultLevel = config?.defaultLevel || AuditLogLevel.INFO;
    this.logSuccess = config?.logSuccess ?? true;
    this.logFailure = config?.logFailure ?? true;
    this.logPerformance = config?.logPerformance ?? true;
    this.eventBus = APIEventBus.getInstance();

    // 订阅事件
    this.setupEventListeners();
  }

  /**
   * 获取审计日志器单例
   */
  public static getInstance(config?: AuditLoggerConfig): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger(config);
    }
    return AuditLogger.instance;
  }

  /**
   * 记录操作
   * @param entry 日志条目
   */
  public async log(entry: Partial<AuditLogEntry>): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // 检查是否应该记录
    if (entry.result === 'SUCCESS' && !this.logSuccess) {
      return;
    }
    if (entry.result === 'FAILURE' && !this.logFailure) {
      return;
    }

    // 构建完整的日志条目
    const fullEntry: AuditLogEntry = {
      logId: this.generateLogId(),
      timestamp: Date.now(),
      level: entry.level || this.defaultLevel,
      operation: entry.operation || 'UNKNOWN',
      resourceType: entry.resourceType || 'UNKNOWN',
      result: entry.result || 'SUCCESS',
      executionTime: entry.executionTime || 0,
      ...entry
    };

    // 写入存储
    await this.storage.write(fullEntry);

    // 发布事件
    await this.eventBus.emit({
      type: APIEventType.OPERATION_COMPLETED,
      timestamp: fullEntry.timestamp,
      eventId: fullEntry.logId,
      resourceType: fullEntry.resourceType,
      resourceId: fullEntry.resourceId,
      operation: fullEntry.operation,
      data: {
        result: fullEntry.result,
        executionTime: fullEntry.executionTime,
        level: fullEntry.level
      }
    });
  }

  /**
   * 查询日志
   * @param filter 过滤条件
   * @returns 日志条目数组
   */
  public async query(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
    return this.storage.query(filter);
  }

  /**
   * 清除日志
   * @param beforeTime 清除指定时间之前的日志
   */
  public async clear(beforeTime?: number): Promise<void> {
    await this.storage.clear(beforeTime);
  }

  /**
   * 启用审计日志
   */
  public enable(): void {
    this.enabled = true;
  }

  /**
   * 禁用审计日志
   */
  public disable(): void {
    this.enabled = false;
  }

  /**
   * 检查是否启用
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 获取统计信息
   * @param filter 过滤条件
   * @returns 统计信息
   */
  public async getStatistics(filter?: AuditLogFilter): Promise<{
    total: number;
    byLevel: Record<AuditLogLevel, number>;
    byOperation: Record<string, number>;
    byResourceType: Record<string, number>;
    byResult: Record<'SUCCESS' | 'FAILURE', number>;
    avgExecutionTime: number;
  }> {
    const logs = await this.query(filter || {});

    const byLevel: Record<AuditLogLevel, number> = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0
    };
    const byOperation: Record<string, number> = {};
    const byResourceType: Record<string, number> = {};
    const byResult: Record<'SUCCESS' | 'FAILURE', number> = {
      SUCCESS: 0,
      FAILURE: 0
    };
    let totalExecutionTime = 0;

    for (const log of logs) {
      byLevel[log.level]++;
      byOperation[log.operation] = (byOperation[log.operation] || 0) + 1;
      byResourceType[log.resourceType] = (byResourceType[log.resourceType] || 0) + 1;
      byResult[log.result]++;
      totalExecutionTime += log.executionTime;
    }

    return {
      total: logs.length,
      byLevel,
      byOperation,
      byResourceType,
      byResult,
      avgExecutionTime: logs.length > 0 ? totalExecutionTime / logs.length : 0
    };
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听资源创建事件
    this.eventBus.on(APIEventType.RESOURCE_CREATED, async (event) => {
      await this.log({
        level: AuditLogLevel.INFO,
        operation: 'CREATE',
        resourceType: event.resourceType || 'UNKNOWN',
        resourceId: event.resourceId,
        result: 'SUCCESS',
        executionTime: 0,
        data: event.data
      });
    });

    // 监听资源更新事件
    this.eventBus.on(APIEventType.RESOURCE_UPDATED, async (event) => {
      await this.log({
        level: AuditLogLevel.INFO,
        operation: 'UPDATE',
        resourceType: event.resourceType || 'UNKNOWN',
        resourceId: event.resourceId,
        result: 'SUCCESS',
        executionTime: 0,
        data: event.data
      });
    });

    // 监听资源删除事件
    this.eventBus.on(APIEventType.RESOURCE_DELETED, async (event) => {
      await this.log({
        level: AuditLogLevel.INFO,
        operation: 'DELETE',
        resourceType: event.resourceType || 'UNKNOWN',
        resourceId: event.resourceId,
        result: 'SUCCESS',
        executionTime: 0,
        data: event.data
      });
    });

    // 监听错误事件
    this.eventBus.on(APIEventType.ERROR_OCCURRED, async (event) => {
      await this.log({
        level: AuditLogLevel.ERROR,
        operation: event.operation || 'UNKNOWN',
        resourceType: event.resourceType || 'UNKNOWN',
        resourceId: event.resourceId,
        result: 'FAILURE',
        executionTime: 0,
        error: event.error?.message,
        data: event.data
      });
    });
  }

  /**
   * 生成日志ID
   */
  private generateLogId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 导出全局审计日志器实例
 */
export const auditLogger = AuditLogger.getInstance();
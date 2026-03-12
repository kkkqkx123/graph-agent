/**
 * EventResourceAPI - 事件资源管理API
 * 重构版本：移除无效的内存缓存，连接到EventManager
 * 
 * 设计说明：
 * - 事件历史通过监听EventManager实时收集
 * - 提供事件查询、统计、搜索等功能
 * - 事件不可通过API直接创建、更新或删除
 */

import { GenericResourceAPI } from '../../../shared/resources/generic-resource-api.js';
import type { BaseEvent, Event, EventType } from '@modular-agent/types';
import type { Timestamp } from '@modular-agent/types';
import { DispatchEventCommand } from '../../operations/events/dispatch-event-command.js';
import type { APIDependencyManager } from '../../../shared/core/sdk-dependencies.js';
import { CommandExecutor } from '../../../shared/common/command-executor.js';

/**
 * 所有事件类型列表
 * 用于监听所有事件
 */
const ALL_EVENT_TYPES: EventType[] = [
  // 线程事件
  'THREAD_STARTED',
  'THREAD_COMPLETED',
  'THREAD_FAILED',
  'THREAD_PAUSED',
  'THREAD_RESUMED',
  'THREAD_CANCELLED',
  'THREAD_STATE_CHANGED',
  'THREAD_FORK_STARTED',
  'THREAD_FORK_COMPLETED',
  'THREAD_JOIN_STARTED',
  'THREAD_JOIN_CONDITION_MET',
  'THREAD_COPY_STARTED',
  'THREAD_COPY_COMPLETED',
  // 节点事件
  'NODE_STARTED',
  'NODE_COMPLETED',
  'NODE_FAILED',
  'NODE_CUSTOM_EVENT',
  // Token事件
  'TOKEN_LIMIT_EXCEEDED',
  'TOKEN_USAGE_WARNING',
  // 上下文压缩事件
  'CONTEXT_COMPRESSION_REQUESTED',
  'CONTEXT_COMPRESSION_COMPLETED',
  // 消息事件
  'MESSAGE_ADDED',
  // 工具事件
  'TOOL_CALL_STARTED',
  'TOOL_CALL_COMPLETED',
  'TOOL_CALL_FAILED',
  'TOOL_ADDED',
  // 对话事件
  'CONVERSATION_STATE_CHANGED',
  // 错误事件
  'ERROR',
  // 检查点事件
  'CHECKPOINT_CREATED',
  'CHECKPOINT_RESTORED',
  'CHECKPOINT_DELETED',
  'CHECKPOINT_FAILED',
  // 子图事件
  'SUBGRAPH_STARTED',
  'SUBGRAPH_COMPLETED',
  'TRIGGERED_SUBGRAPH_STARTED',
  'TRIGGERED_SUBGRAPH_COMPLETED',
  'TRIGGERED_SUBGRAPH_FAILED',
  // 变量事件
  'VARIABLE_CHANGED',
  // 用户交互事件
  'USER_INTERACTION_REQUESTED',
  'USER_INTERACTION_RESPONDED',
  'USER_INTERACTION_PROCESSED',
  'USER_INTERACTION_FAILED',
  // HumanRelay事件
  'HUMAN_RELAY_REQUESTED',
  'HUMAN_RELAY_RESPONDED',
  'HUMAN_RELAY_PROCESSED',
  'HUMAN_RELAY_FAILED',
  // LLM流式事件
  'LLM_STREAM_ABORTED',
  'LLM_STREAM_ERROR',
  // 动态线程事件
  'DYNAMIC_THREAD_SUBMITTED',
  'DYNAMIC_THREAD_COMPLETED',
  'DYNAMIC_THREAD_FAILED',
  'DYNAMIC_THREAD_CANCELLED',
  // Agent事件
  'AGENT_CUSTOM_EVENT',
  // Skill事件
  'SKILL_LOAD_STARTED',
  'SKILL_LOAD_COMPLETED',
  'SKILL_LOAD_FAILED',
  // 已废弃的Skill事件
  'SKILL_EXECUTION_STARTED',
  'SKILL_EXECUTION_COMPLETED',
  'SKILL_EXECUTION_FAILED'
];

/**
 * 事件过滤器
 */
export interface EventFilter {
  /** 事件ID列表 */
  ids?: string[];
  /** 事件类型 */
  eventType?: EventType;
  /** 线程ID */
  threadId?: string;
  /** 工作流ID */
  workflowId?: string;
  /** 节点ID */
  nodeId?: string;
  /** 创建时间范围 */
  timestampRange?: { start?: Timestamp; end?: Timestamp };
}

/**
 * 事件统计信息
 */
export interface EventStats {
  /** 总数 */
  total: number;
  /** 按类型统计 */
  byType: Record<string, number>;
  /** 按线程统计 */
  byThread: Record<string, number>;
  /** 按工作流统计 */
  byWorkflow: Record<string, number>;
}

/**
 * EventResourceAPI - 事件资源管理API
 * 
 * 重构说明：
 * - 移除了无效的内存缓存
 * - 通过监听EventManager收集事件历史
 * - 提供实时的事件查询和统计功能
 */
export class EventResourceAPI extends GenericResourceAPI<BaseEvent, string, EventFilter> {
  private eventHistory: BaseEvent[] = [];
  private dependencies: APIDependencyManager;
  private executor: CommandExecutor;
  private unsubscribe?: () => void;
  private maxHistorySize: number;

  constructor(dependencies: APIDependencyManager, maxHistorySize: number = 1000) {
    super();
    this.dependencies = dependencies;
    this.executor = new CommandExecutor();
    this.maxHistorySize = maxHistorySize;
    
    // 设置事件监听器
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器，收集所有事件到历史记录
   */
  private setupEventListeners(): void {
    const eventManager = this.dependencies.getEventManager();
    
    const listeners: Array<() => void> = [];
    
    // 监听所有事件类型
    for (const eventType of ALL_EVENT_TYPES) {
      const unsubscribe = eventManager.on(eventType, (event: Event) => {
        this.addEventToHistory(event);
      });
      listeners.push(unsubscribe);
    }
    
    // 保存取消订阅函数
    this.unsubscribe = () => {
      listeners.forEach(unsub => unsub());
    };
  }

  /**
   * 添加事件到历史记录（内部方法）
   */
  private addEventToHistory(event: BaseEvent): void {
    this.eventHistory.push(event);
    
    // 自动裁剪历史记录
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
    this.eventHistory = [];
  }

  // ============================================================================
  // 实现抽象方法
  // ============================================================================

  /**
   * 获取单个事件
   * @param id 事件ID
   * @returns 事件对象，如果不存在则返回null
   */
  protected async getResource(id: string): Promise<BaseEvent | null> {
    return this.eventHistory.find(event => `${event.type}-${event.threadId}-${event.timestamp}` === id) || null;
  }

  /**
   * 获取所有事件
   * @returns 事件数组
   */
  protected async getAllResources(): Promise<BaseEvent[]> {
    return [...this.eventHistory];
  }

  /**
   * 创建事件（事件由系统生成，此方法抛出错误）
   */
  protected async createResource(resource: BaseEvent): Promise<void> {
    throw new Error('Events cannot be created through API, they are generated by the system');
  }

  /**
   * 更新事件（事件不可更新，此方法抛出错误）
   */
  protected async updateResource(id: string, updates: Partial<BaseEvent>): Promise<void> {
    throw new Error('Events cannot be updated through API');
  }

  /**
   * 删除事件（事件不可删除，此方法抛出错误）
   */
  protected async deleteResource(id: string): Promise<void> {
    throw new Error('Events cannot be deleted through API');
  }

  /**
   * 应用过滤条件
   */
  protected applyFilter(events: BaseEvent[], filter: EventFilter): BaseEvent[] {
    return events.filter(event => {
      if (filter.eventType && event.type !== filter.eventType) {
        return false;
      }
      if (filter.threadId && event.threadId !== filter.threadId) {
        return false;
      }
      if (filter.workflowId && event.workflowId !== filter.workflowId) {
        return false;
      }
      if (filter.nodeId && 'nodeId' in event && (event as any).nodeId !== filter.nodeId) {
        return false;
      }
      if (filter.timestampRange?.start && event.timestamp < filter.timestampRange.start) {
        return false;
      }
      if (filter.timestampRange?.end && event.timestamp > filter.timestampRange.end) {
        return false;
      }
      return true;
    });
  }

  // ============================================================================
  // 事件特定方法
  // ============================================================================

  /**
   * 分发事件到系统总线
   * @param event 事件对象
   */
  async dispatch(event: BaseEvent): Promise<void> {
    const command = new DispatchEventCommand({ event }, this.dependencies);
    await this.executor.execute(command);
  }

  /**
   * 获取事件列表
   * @param filter 过滤条件
   * @returns 事件数组
   */
  async getEvents(filter?: EventFilter): Promise<BaseEvent[]> {
    let events = this.eventHistory;

    // 应用过滤条件
    if (filter) {
      events = this.applyFilter(events, filter);
    }

    return events;
  }

  /**
   * 获取事件统计信息
   * @param filter 过滤条件
   * @returns 统计信息
   */
  async getEventStats(filter?: EventFilter): Promise<EventStats> {
    let events = this.eventHistory;

    // 应用过滤条件
    if (filter) {
      events = this.applyFilter(events, filter);
    }

    const stats: EventStats = {
      total: events.length,
      byType: {},
      byThread: {},
      byWorkflow: {}
    };

    for (const event of events) {
      // 按类型统计
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;

      // 按线程统计
      stats.byThread[event.threadId] = (stats.byThread[event.threadId] || 0) + 1;

      // 按工作流统计
      if (event.workflowId) {
        stats.byWorkflow[event.workflowId] = (stats.byWorkflow[event.workflowId] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * 获取最近事件
   * @param count 事件数量
   * @param filter 过滤条件
   * @returns 最近事件数组
   */
  async getRecentEvents(count: number, filter?: EventFilter): Promise<BaseEvent[]> {
    let events = this.eventHistory;

    // 应用过滤条件
    if (filter) {
      events = this.applyFilter(events, filter);
    }

    // 按时间戳降序排序，返回最近的count个事件
    return events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }

  /**
   * 搜索事件
   * @param query 搜索关键词
   * @param filter 过滤条件
   * @returns 匹配的事件数组
   */
  async searchEvents(query: string, filter?: EventFilter): Promise<BaseEvent[]> {
    let events = this.eventHistory;

    // 应用过滤条件
    if (filter) {
      events = this.applyFilter(events, filter);
    }

    return events.filter(event => {
      // 搜索事件类型、线程ID、工作流ID等
      const searchableFields = [
        event.type,
        event.threadId,
        event.workflowId,
        `${event.type}-${event.threadId}-${event.timestamp}`
      ];

      if ('nodeId' in event) {
        searchableFields.push((event as any).nodeId);
      }

      return searchableFields.some(field =>
        field && field.toLowerCase().includes(query.toLowerCase())
      );
    });
  }

  /**
   * 获取事件时间线
   * @param threadId 线程ID
   * @param workflowId 工作流ID
   * @returns 时间线事件数组
   */
  async getEventTimeline(threadId?: string, workflowId?: string): Promise<BaseEvent[]> {
    let events = this.eventHistory;

    // 应用过滤条件
    if (threadId) {
      events = events.filter(event => event.threadId === threadId);
    }
    if (workflowId) {
      events = events.filter(event => event.workflowId === workflowId);
    }

    // 按时间戳升序排序，形成时间线
    return events.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 获取事件类型统计
   * @returns 事件类型统计
   */
  async getEventTypeStatistics(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};

    for (const event of this.eventHistory) {
      stats[event.type] = (stats[event.type] || 0) + 1;
    }

    return stats;
  }

  /**
   * 获取线程事件统计
   * @returns 线程事件统计
   */
  async getThreadEventStatistics(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};

    for (const event of this.eventHistory) {
      stats[event.threadId] = (stats[event.threadId] || 0) + 1;
    }

    return stats;
  }

  /**
   * 获取工作流事件统计
   * @returns 工作流事件统计
   */
  async getWorkflowEventStatistics(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};

    for (const event of this.eventHistory) {
      if (event.workflowId) {
        stats[event.workflowId] = (stats[event.workflowId] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * 清空事件历史
   */
  async clearEventHistory(): Promise<void> {
    this.eventHistory = [];
  }

  /**
   * 获取事件历史大小
   * @returns 事件数量
   */
  async getEventHistorySize(): Promise<number> {
    return this.eventHistory.length;
  }

  /**
   * 获取事件时间范围
   * @returns 时间范围
   */
  async getEventTimeRange(): Promise<{ start: number; end: number } | null> {
    if (this.eventHistory.length === 0) {
      return null;
    }

    const timestamps = this.eventHistory.map(event => event.timestamp);
    return {
      start: Math.min(...timestamps),
      end: Math.max(...timestamps)
    };
  }
}

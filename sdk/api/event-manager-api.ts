/**
 * EventManagerAPI - 事件监听API
 * 封装EventManager，仅暴露全局事件，提供便捷的事件订阅方法
 */

import { EventManager } from '../core/execution/managers/event-manager';
import type {
  BaseEvent,
  EventType,
  EventListener,
  ThreadStartedEvent,
  ThreadCompletedEvent,
  ThreadForkedEvent,
  ThreadJoinedEvent,
  ThreadCopiedEvent,
  NodeStartedEvent,
  NodeCompletedEvent,
  NodeCustomEvent,
  TokenLimitExceededEvent,
  CheckpointCreatedEvent,
  SubgraphStartedEvent,
  SubgraphCompletedEvent
} from '../types/events';
import type { EventFilter } from './types';
import { EventType as EventTypeEnum } from '../types/events';

/**
 * EventManagerAPI - 事件监听API
 */
export class EventManagerAPI {
  private eventManager: EventManager;
  private eventHistory: BaseEvent[] = [];
  private maxHistorySize: number = 1000;
  private historyEnabled: boolean = true;

  constructor(options?: {
    /** 最大历史记录数量 */
    maxHistorySize?: number;
    /** 是否启用历史记录 */
    enableHistory?: boolean;
  }) {
    this.eventManager = new EventManager();
    this.maxHistorySize = options?.maxHistorySize ?? 1000;
    this.historyEnabled = options?.enableHistory ?? true;

    // 自动记录所有事件到历史
    if (this.historyEnabled) {
      this.setupHistoryRecording();
    }
  }

  /**
   * 注册事件监听器
   * @param eventType 事件类型
   * @param listener 事件监听器
   * @returns 注销函数
   */
  on(eventType: EventType, listener: EventListener<BaseEvent>): () => void {
    return this.eventManager.on(eventType, listener);
  }

  /**
   * 注销事件监听器
   * @param eventType 事件类型
   * @param listener 事件监听器
   * @returns 是否成功注销
   */
  off(eventType: EventType, listener: EventListener<BaseEvent>): boolean {
    return this.eventManager.off(eventType, listener);
  }

  /**
   * 注册一次性事件监听器
   * @param eventType 事件类型
   * @param listener 事件监听器
   * @returns 注销函数
   */
  once(eventType: EventType, listener: EventListener<BaseEvent>): () => void {
    return this.eventManager.once(eventType, listener);
  }

  /**
   * 等待特定事件触发
   * @param eventType 事件类型
   * @param timeout 超时时间（毫秒）
   * @returns Promise，解析为事件对象
   */
  waitFor<T extends BaseEvent>(eventType: EventType, timeout?: number): Promise<T> {
    return this.eventManager.waitFor(eventType, timeout);
  }

  /**
   * 触发事件
   * @param event 事件对象
   */
  async emit(event: BaseEvent): Promise<void> {
    await this.eventManager.emit(event);
  }

  /**
   * 清空事件监听器
   * @param eventType 事件类型（可选），如果不提供则清空所有监听器
   */
  clear(eventType?: EventType): void {
    this.eventManager.clear(eventType);
  }

  /**
   * 获取监听器数量
   * @param eventType 事件类型（可选）
   * @returns 监听器数量
   */
  getListenerCount(eventType?: EventType): number {
    return this.eventManager.getListenerCount(eventType);
  }

  /**
   * 监听线程开始事件
   * @param listener 事件监听器
   * @returns 注销函数
   */
  onThreadStarted(listener: (event: ThreadStartedEvent) => void | Promise<void>): () => void {
    return this.eventManager.on(EventTypeEnum.THREAD_STARTED, listener as EventListener<BaseEvent>);
  }

  /**
   * 监听线程完成事件
   * @param listener 事件监听器
   * @returns 注销函数
   */
  onThreadCompleted(listener: (event: ThreadCompletedEvent) => void | Promise<void>): () => void {
    return this.eventManager.on(EventTypeEnum.THREAD_COMPLETED, listener as EventListener<BaseEvent>);
  }

  /**
   * 监听线程失败事件
   * @param listener 事件监听器
   * @returns 注销函数
   */
  onThreadFailed(listener: (event: any) => void | Promise<void>): () => void {
    return this.eventManager.on(EventTypeEnum.THREAD_FAILED, listener as EventListener<BaseEvent>);
  }

  /**
   * 监听线程暂停事件
   * @param listener 事件监听器
   * @returns 注销函数
   */
  onThreadPaused(listener: (event: any) => void | Promise<void>): () => void {
    return this.eventManager.on(EventTypeEnum.THREAD_PAUSED, listener as EventListener<BaseEvent>);
  }

  /**
   * 监听线程恢复事件
   * @param listener 事件监听器
   * @returns 注销函数
   */
  onThreadResumed(listener: (event: any) => void | Promise<void>): () => void {
    return this.eventManager.on(EventTypeEnum.THREAD_RESUMED, listener as EventListener<BaseEvent>);
  }

  /**
   * 监听节点开始事件
   * @param listener 事件监听器
   * @returns 注销函数
   */
  onNodeStarted(listener: (event: NodeStartedEvent) => void | Promise<void>): () => void {
    return this.eventManager.on(EventTypeEnum.NODE_STARTED, listener as EventListener<BaseEvent>);
  }

  /**
   * 监听节点完成事件
   * @param listener 事件监听器
   * @returns 注销函数
   */
  onNodeCompleted(listener: (event: NodeCompletedEvent) => void | Promise<void>): () => void {
    return this.eventManager.on(EventTypeEnum.NODE_COMPLETED, listener as EventListener<BaseEvent>);
  }

  /**
   * 监听节点失败事件
   * @param listener 事件监听器
   * @returns 注销函数
   */
  onNodeFailed(listener: (event: any) => void | Promise<void>): () => void {
    return this.eventManager.on(EventTypeEnum.NODE_FAILED, listener as EventListener<BaseEvent>);
  }

  /**
   * 监听错误事件
   * @param listener 事件监听器
   * @returns 注销函数
   */
  onError(listener: (event: any) => void | Promise<void>): () => void {
    return this.eventManager.on(EventTypeEnum.ERROR, listener as EventListener<BaseEvent>);
  }

  /**
   * 监听线程分叉事件
   * @param listener 事件监听器
   * @returns 注销函数
   */
  onThreadForked(listener: (event: ThreadForkedEvent) => void | Promise<void>): () => void {
    return this.eventManager.on(EventTypeEnum.THREAD_FORKED, listener as EventListener<BaseEvent>);
  }

  /**
   * 监听线程合并事件
   * @param listener 事件监听器
   * @returns 注销函数
   */
  onThreadJoined(listener: (event: ThreadJoinedEvent) => void | Promise<void>): () => void {
    return this.eventManager.on(EventTypeEnum.THREAD_JOINED, listener as EventListener<BaseEvent>);
  }

  /**
   * 监听线程复制事件
   * @param listener 事件监听器
   * @returns 注销函数
   */
  onThreadCopied(listener: (event: ThreadCopiedEvent) => void | Promise<void>): () => void {
    return this.eventManager.on(EventTypeEnum.THREAD_COPIED, listener as EventListener<BaseEvent>);
  }

  /**
   * 监听节点自定义事件
   * @param listener 事件监听器
   * @returns 注销函数
   */
  onNodeCustomEvent(listener: (event: NodeCustomEvent) => void | Promise<void>): () => void {
    return this.eventManager.on(EventTypeEnum.NODE_CUSTOM_EVENT, listener as EventListener<BaseEvent>);
  }

  /**
   * 监听Token超过限制事件
   * @param listener 事件监听器
   * @returns 注销函数
   */
  onTokenLimitExceeded(listener: (event: TokenLimitExceededEvent) => void | Promise<void>): () => void {
    return this.eventManager.on(EventTypeEnum.TOKEN_LIMIT_EXCEEDED, listener as EventListener<BaseEvent>);
  }

  /**
   * 监听检查点创建事件
   * @param listener 事件监听器
   * @returns 注销函数
   */
  onCheckpointCreated(listener: (event: CheckpointCreatedEvent) => void | Promise<void>): () => void {
    return this.eventManager.on(EventTypeEnum.CHECKPOINT_CREATED, listener as EventListener<BaseEvent>);
  }

  /**
   * 监听子图开始事件
   * @param listener 事件监听器
   * @returns 注销函数
   */
  onSubgraphStarted(listener: (event: SubgraphStartedEvent) => void | Promise<void>): () => void {
    return this.eventManager.on(EventTypeEnum.SUBGRAPH_STARTED, listener as EventListener<BaseEvent>);
  }

  /**
   * 监听子图完成事件
   * @param listener 事件监听器
   * @returns 注销函数
   */
  onSubgraphCompleted(listener: (event: SubgraphCompletedEvent) => void | Promise<void>): () => void {
    return this.eventManager.on(EventTypeEnum.SUBGRAPH_COMPLETED, listener as EventListener<BaseEvent>);
  }

  /**
   * 获取事件历史
   * @param filter 过滤条件
   * @returns 事件数组
   */
  async getEvents(filter?: EventFilter): Promise<BaseEvent[]> {
    let events = [...this.eventHistory];

    // 应用过滤条件
    if (filter) {
      events = this.applyFilter(events, filter);
    }

    // 按时间倒序排序
    events = events.sort((a, b) => b.timestamp - a.timestamp);

    return events;
  }

  /**
   * 获取指定线程的所有事件
   * @param threadId 线程ID
   * @returns 事件数组
   */
  async getThreadEvents(threadId: string): Promise<BaseEvent[]> {
    return this.getEvents({ threadId });
  }

  /**
   * 获取指定工作流的所有事件
   * @param workflowId 工作流ID
   * @returns 事件数组
   */
  async getWorkflowEvents(workflowId: string): Promise<BaseEvent[]> {
    return this.getEvents({ workflowId });
  }

  /**
   * 获取指定节点的事件
   * @param nodeId 节点ID
   * @returns 事件数组
   */
  async getNodeEvents(nodeId: string): Promise<BaseEvent[]> {
    return this.getEvents({ nodeId });
  }

  /**
   * 获取指定类型的事件
   * @param eventType 事件类型
   * @returns 事件数组
   */
  async getEventsByType(eventType: EventType): Promise<BaseEvent[]> {
    return this.getEvents({ eventType });
  }

  /**
   * 获取事件统计
   * @param filter 过滤条件（可选）
   * @returns 统计信息
   */
  async getEventStats(filter?: EventFilter): Promise<{
    total: number;
    byType: Record<string, number>;
    byThread: Record<string, number>;
    byWorkflow: Record<string, number>;
  }> {
    let events = this.eventHistory;

    // 应用过滤条件
    if (filter) {
      events = this.applyFilter(events, filter);
    }

    const stats = {
      total: events.length,
      byType: {} as Record<string, number>,
      byThread: {} as Record<string, number>,
      byWorkflow: {} as Record<string, number>
    };

    for (const event of events) {
      // 按类型统计
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;

      // 按线程统计
      stats.byThread[event.threadId] = (stats.byThread[event.threadId] || 0) + 1;

      // 按工作流统计
      stats.byWorkflow[event.workflowId] = (stats.byWorkflow[event.workflowId] || 0) + 1;
    }

    return stats;
  }

  /**
   * 清空事件历史
   */
  async clearHistory(): Promise<void> {
    this.eventHistory = [];
  }

  /**
   * 启用事件历史记录
   */
  async enableHistory(): Promise<void> {
    this.historyEnabled = true;
  }

  /**
   * 禁用事件历史记录
   */
  async disableHistory(): Promise<void> {
    this.historyEnabled = false;
  }

  /**
   * 设置最大历史记录数量
   * @param size 最大数量
   */
  async setMaxHistorySize(size: number): Promise<void> {
    this.maxHistorySize = size;
    // 如果当前历史记录超过新限制，截断
    if (this.eventHistory.length > size) {
      this.eventHistory = this.eventHistory.slice(-size);
    }
  }

  /**
   * 获取底层EventManager实例
   * @returns EventManager实例
   */
  getManager(): EventManager {
    return this.eventManager;
  }

  /**
   * 设置历史记录
   * @param events 事件数组
   */
  async setHistory(events: BaseEvent[]): Promise<void> {
    this.eventHistory = events.slice(-this.maxHistorySize);
  }

  /**
   * 设置历史记录
   * @param events 事件数组
   */
  private setupHistoryRecording(): void {
    // 监听所有事件类型
    const eventTypes = [
      EventTypeEnum.THREAD_STARTED,
      EventTypeEnum.THREAD_COMPLETED,
      EventTypeEnum.THREAD_FAILED,
      EventTypeEnum.THREAD_PAUSED,
      EventTypeEnum.THREAD_RESUMED,
      EventTypeEnum.THREAD_FORKED,
      EventTypeEnum.THREAD_JOINED,
      EventTypeEnum.THREAD_COPIED,
      EventTypeEnum.NODE_STARTED,
      EventTypeEnum.NODE_COMPLETED,
      EventTypeEnum.NODE_FAILED,
      EventTypeEnum.NODE_CUSTOM_EVENT,
      EventTypeEnum.TOKEN_LIMIT_EXCEEDED,
      EventTypeEnum.ERROR,
      EventTypeEnum.CHECKPOINT_CREATED,
      EventTypeEnum.SUBGRAPH_STARTED,
      EventTypeEnum.SUBGRAPH_COMPLETED
    ];

    for (const eventType of eventTypes) {
      this.eventManager.on(eventType, (event: BaseEvent) => {
        // 添加到历史记录
        this.eventHistory.push(event);

        // 限制历史记录大小
        if (this.eventHistory.length > this.maxHistorySize) {
          this.eventHistory.shift();
        }
      });
    }
  }

  /**
   * 应用过滤条件
   * @param events 事件数组
   * @param filter 过滤条件
   * @returns 过滤后的事件数组
   */
  private applyFilter(events: BaseEvent[], filter: EventFilter): BaseEvent[] {
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
      if (filter.startTimeFrom && event.timestamp < filter.startTimeFrom) {
        return false;
      }
      if (filter.startTimeTo && event.timestamp > filter.startTimeTo) {
        return false;
      }
      return true;
    });
  }
}
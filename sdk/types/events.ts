/**
 * Events类型定义
 * 定义工作流执行过程中的事件类型
 */

import type { ID, Timestamp, Metadata } from './common';

/**
 * 事件类型枚举
 */
export enum EventType {
  /** 线程开始 */
  THREAD_STARTED = 'THREAD_STARTED',
  /** 线程完成 */
  THREAD_COMPLETED = 'THREAD_COMPLETED',
  /** 线程失败 */
  THREAD_FAILED = 'THREAD_FAILED',
  /** 线程暂停 */
  THREAD_PAUSED = 'THREAD_PAUSED',
  /** 线程恢复 */
  THREAD_RESUMED = 'THREAD_RESUMED',
  /** 线程分叉 */
  THREAD_FORKED = 'THREAD_FORKED',
  /** 线程合并 */
  THREAD_JOINED = 'THREAD_JOINED',
  /** 线程复制 */
  THREAD_COPIED = 'THREAD_COPIED',
  /** 节点开始 */
  NODE_STARTED = 'NODE_STARTED',
  /** 节点完成 */
  NODE_COMPLETED = 'NODE_COMPLETED',
  /** 节点失败 */
  NODE_FAILED = 'NODE_FAILED',
  /** 节点自定义事件 */
  NODE_CUSTOM_EVENT = 'NODE_CUSTOM_EVENT',
  /** Token 超过限制 */
  TOKEN_LIMIT_EXCEEDED = 'TOKEN_LIMIT_EXCEEDED',
  /** 错误事件 */
  ERROR = 'ERROR',
  /** 检查点创建 */
  CHECKPOINT_CREATED = 'CHECKPOINT_CREATED',
  /** 子图开始 */
  SUBGRAPH_STARTED = 'SUBGRAPH_STARTED',
  /** 子图完成 */
  SUBGRAPH_COMPLETED = 'SUBGRAPH_COMPLETED',
  /** 触发子工作流开始 */
  TRIGGERED_SUBGRAPH_STARTED = 'TRIGGERED_SUBGRAPH_STARTED',
  /** 触发子工作流完成 */
  TRIGGERED_SUBGRAPH_COMPLETED = 'TRIGGERED_SUBGRAPH_COMPLETED'
}

/**
 * 基础事件类型
 */
export interface BaseEvent {
  /** 事件类型 */
  type: EventType;
  /** 时间戳 */
  timestamp: Timestamp;
  /** 工作流ID */
  workflowId: ID;
  /** 线程ID */
  threadId: ID;
  /** 事件元数据 */
  metadata?: Metadata;
}

/**
 * 线程开始事件类型
 */
export interface ThreadStartedEvent extends BaseEvent {
  type: EventType.THREAD_STARTED;
  /** 输入数据 */
  input: Record<string, any>;
}

/**
 * 线程完成事件类型
 */
export interface ThreadCompletedEvent extends BaseEvent {
  type: EventType.THREAD_COMPLETED;
  /** 输出数据 */
  output: Record<string, any>;
  /** 执行时间 */
  executionTime: number;
}

/**
 * 线程失败事件类型
 */
export interface ThreadFailedEvent extends BaseEvent {
  type: EventType.THREAD_FAILED;
  /** 错误信息 */
  error: any;
}

/**
 * 线程暂停事件类型
 */
export interface ThreadPausedEvent extends BaseEvent {
  type: EventType.THREAD_PAUSED;
  /** 暂停原因 */
  reason?: string;
}

/**
 * 线程恢复事件类型
 */
export interface ThreadResumedEvent extends BaseEvent {
  type: EventType.THREAD_RESUMED;
}

/**
 * 线程分叉事件类型
 */
export interface ThreadForkedEvent extends BaseEvent {
  type: EventType.THREAD_FORKED;
  /** 父线程ID */
  parentThreadId: ID;
  /** 子线程ID数组 */
  childThreadIds: ID[];
}

/**
 * 线程合并事件类型
 */
export interface ThreadJoinedEvent extends BaseEvent {
  type: EventType.THREAD_JOINED;
  /** 父线程ID */
  parentThreadId: ID;
  /** 子线程ID数组 */
  childThreadIds: ID[];
  /** 合并策略 */
  joinStrategy: string;
}

/**
 * 线程复制事件类型
 */
export interface ThreadCopiedEvent extends BaseEvent {
  type: EventType.THREAD_COPIED;
  /** 源线程ID */
  sourceThreadId: ID;
  /** 副本线程ID */
  copiedThreadId: ID;
}

/**
 * 节点开始事件类型
 */
export interface NodeStartedEvent extends BaseEvent {
  type: EventType.NODE_STARTED;
  /** 节点ID */
  nodeId: ID;
  /** 节点类型 */
  nodeType: string;
}

/**
 * 节点完成事件类型
 */
export interface NodeCompletedEvent extends BaseEvent {
  type: EventType.NODE_COMPLETED;
  /** 节点ID */
  nodeId: ID;
  /** 输出数据 */
  output: any;
  /** 执行时间 */
  executionTime: Timestamp;
}

/**
 * 节点失败事件类型
 */
export interface NodeFailedEvent extends BaseEvent {
  type: EventType.NODE_FAILED;
  /** 节点ID */
  nodeId: ID;
  /** 错误信息 */
  error: any;
}

/**
 * Token 超过限制事件类型
 */
export interface TokenLimitExceededEvent extends BaseEvent {
  type: EventType.TOKEN_LIMIT_EXCEEDED;
  /** 当前使用的 Token 数量 */
  tokensUsed: number;
  /** Token 限制阈值 */
  tokenLimit: number;
}

/**
 * 错误事件类型
 */
export interface ErrorEvent extends BaseEvent {
  type: EventType.ERROR;
  /** 节点ID（可选） */
  nodeId?: ID;
  /** 错误信息 */
  error: any;
  /** 堆栈跟踪 */
  stackTrace?: string;
}

/**
 * 检查点创建事件类型
 */
export interface CheckpointCreatedEvent extends BaseEvent {
  type: EventType.CHECKPOINT_CREATED;
  /** 检查点ID */
  checkpointId: ID;
  /** 检查点描述 */
  description?: string;
}

/**
 * 子图开始事件类型
 */
export interface SubgraphStartedEvent extends BaseEvent {
  type: EventType.SUBGRAPH_STARTED;
  /** 子工作流ID */
  subgraphId: ID;
  /** 父工作流ID */
  parentWorkflowId: ID;
  /** 输入数据 */
  input: Record<string, any>;
}

/**
 * 子图完成事件类型
 */
export interface SubgraphCompletedEvent extends BaseEvent {
  type: EventType.SUBGRAPH_COMPLETED;
  /** 子工作流ID */
  subgraphId: ID;
  /** 输出数据 */
  output: Record<string, any>;
  /** 执行时间 */
  executionTime: number;
}

/**
 * 触发子工作流开始事件类型
 */
export interface TriggeredSubgraphStartedEvent extends BaseEvent {
  type: EventType.TRIGGERED_SUBGRAPH_STARTED;
  /** 子工作流ID */
  subgraphId: ID;
  /** 触发器ID */
  triggerId: ID;
  /** 输入数据 */
  input: Record<string, any>;
}

/**
 * 触发子工作流完成事件类型
 */
export interface TriggeredSubgraphCompletedEvent extends BaseEvent {
  type: EventType.TRIGGERED_SUBGRAPH_COMPLETED;
  /** 子工作流ID */
  subgraphId: ID;
  /** 触发器ID */
  triggerId: ID;
}

/**
 * 节点自定义事件类型
 */
export interface NodeCustomEvent extends BaseEvent {
  type: EventType.NODE_CUSTOM_EVENT;
  /** 节点ID */
  nodeId: ID;
  /** 节点类型 */
  nodeType: string;
  /** 自定义事件名称 */
  eventName: string;
  /** 事件数据 */
  eventData: Record<string, any>;
}

/**
 * 事件监听器类型
 */
export type EventListener<T extends BaseEvent> = (event: T) => void | Promise<void>;

/**
 * 事件处理器类型
 */
export interface EventHandler {
  /** 事件类型 */
  eventType: EventType;
  /** 事件监听器 */
  listener: EventListener<BaseEvent>;
}

/**
 * 所有事件类型的联合类型
 */
export type Event =
  | ThreadStartedEvent
  | ThreadCompletedEvent
  | ThreadFailedEvent
  | ThreadPausedEvent
  | ThreadResumedEvent
  | ThreadForkedEvent
  | ThreadJoinedEvent
  | ThreadCopiedEvent
  | NodeStartedEvent
  | NodeCompletedEvent
  | NodeFailedEvent
  | NodeCustomEvent
  | TokenLimitExceededEvent
  | ErrorEvent
  | CheckpointCreatedEvent
  | SubgraphStartedEvent
  | SubgraphCompletedEvent
  | TriggeredSubgraphStartedEvent
  | TriggeredSubgraphCompletedEvent;
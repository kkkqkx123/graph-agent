/**
 * 线程相关事件类型定义
 */

import type { ID } from '../common';
import type { BaseEvent, EventType } from './base';

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
 * 线程取消事件类型
 */
export interface ThreadCancelledEvent extends BaseEvent {
  type: EventType.THREAD_CANCELLED;
  /** 取消原因 */
  reason?: string;
}

/**
 * 线程状态变更事件类型
 */
export interface ThreadStateChangedEvent extends BaseEvent {
  type: EventType.THREAD_STATE_CHANGED;
  /** 变更前状态 */
  previousStatus: string;
  /** 变更后状态 */
  newStatus: string;
}

/**
 * 线程分叉开始事件类型
 */
export interface ThreadForkStartedEvent extends BaseEvent {
  type: EventType.THREAD_FORK_STARTED;
  /** 父线程ID */
  parentThreadId: ID;
  /** Fork配置 */
  forkConfig: Record<string, any>;
}

/**
 * 线程分叉完成事件类型
 */
export interface ThreadForkCompletedEvent extends BaseEvent {
  type: EventType.THREAD_FORK_COMPLETED;
  /** 父线程ID */
  parentThreadId: ID;
  /** 子线程ID数组 */
  childThreadIds: ID[];
}

/**
 * 线程合并开始事件类型
 */
export interface ThreadJoinStartedEvent extends BaseEvent {
  type: EventType.THREAD_JOIN_STARTED;
  /** 父线程ID */
  parentThreadId: ID;
  /** 子线程ID数组 */
  childThreadIds: ID[];
  /** 合并策略 */
  joinStrategy: string;
}

/**
 * 线程合并条件满足事件类型
 */
export interface ThreadJoinConditionMetEvent extends BaseEvent {
  type: EventType.THREAD_JOIN_CONDITION_MET;
  /** 父线程ID */
  parentThreadId: ID;
  /** 子线程ID数组 */
  childThreadIds: ID[];
  /** 满足的条件 */
  condition: string;
}

/**
 * 线程复制开始事件类型
 */
export interface ThreadCopyStartedEvent extends BaseEvent {
  type: EventType.THREAD_COPY_STARTED;
  /** 源线程ID */
  sourceThreadId: ID;
}

/**
 * 线程复制完成事件类型
 */
export interface ThreadCopyCompletedEvent extends BaseEvent {
  type: EventType.THREAD_COPY_COMPLETED;
  /** 源线程ID */
  sourceThreadId: ID;
  /** 副本线程ID */
  copiedThreadId: ID;
}
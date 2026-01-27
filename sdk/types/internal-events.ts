/**
 * 内部协调事件类型定义
 * 用于模块内部协调的事件，不对外暴露
 * 主要用于解耦 ThreadExecutor 和 ThreadCoordinator
 */

import type { ID, Timestamp } from './common';

/**
 * 内部事件类型枚举
 * 目前仅用于fork操作
 */
export enum InternalEventType {
  /** Fork 请求 */
  FORK_REQUEST = 'INTERNAL_FORK_REQUEST',
  /** Fork 完成 */
  FORK_COMPLETED = 'INTERNAL_FORK_COMPLETED',
  /** Fork 失败 */
  FORK_FAILED = 'INTERNAL_FORK_FAILED',
  /** Join 请求 */
  JOIN_REQUEST = 'INTERNAL_JOIN_REQUEST',
  /** Join 完成 */
  JOIN_COMPLETED = 'INTERNAL_JOIN_COMPLETED',
  /** Join 失败 */
  JOIN_FAILED = 'INTERNAL_JOIN_FAILED',
  /** Copy 请求 */
  COPY_REQUEST = 'INTERNAL_COPY_REQUEST',
  /** Copy 完成 */
  COPY_COMPLETED = 'INTERNAL_COPY_COMPLETED',
  /** Copy 失败 */
  COPY_FAILED = 'INTERNAL_COPY_FAILED'
}

/**
 * 内部事件基础类型
 */
export interface BaseInternalEvent {
  /** 事件类型 */
  type: InternalEventType;
  /** 时间戳 */
  timestamp: Timestamp;
  /** 工作流ID */
  workflowId: ID;
  /** 线程ID */
  threadId: ID;
}

/**
 * Fork 请求事件
 */
export interface ForkRequestEvent extends BaseInternalEvent {
  type: InternalEventType.FORK_REQUEST;
  /** 父线程上下文 */
  parentThreadContext: any;
  /** Fork ID */
  forkId: string;
  /** Fork 策略 */
  forkStrategy: 'serial' | 'parallel';
}

/**
 * Fork 完成事件
 */
export interface ForkCompletedEvent extends BaseInternalEvent {
  type: InternalEventType.FORK_COMPLETED;
  /** 子线程ID数组 */
  childThreadIds: string[];
}

/**
 * Fork 失败事件
 */
export interface ForkFailedEvent extends BaseInternalEvent {
  type: InternalEventType.FORK_FAILED;
  /** 错误信息 */
  error: string;
}

/**
 * Join 请求事件
 */
export interface JoinRequestEvent extends BaseInternalEvent {
  type: InternalEventType.JOIN_REQUEST;
  /** 父线程上下文 */
  parentThreadContext: any;
  /** 子线程ID数组 */
  childThreadIds: string[];
  /** Join 策略 */
  joinStrategy: string;
  /** 超时时间（秒） */
  timeout: number;
}

/**
 * Join 完成事件
 */
export interface JoinCompletedEvent extends BaseInternalEvent {
  type: InternalEventType.JOIN_COMPLETED;
  /** Join 结果 */
  result: any;
}

/**
 * Join 失败事件
 */
export interface JoinFailedEvent extends BaseInternalEvent {
  type: InternalEventType.JOIN_FAILED;
  /** 错误信息 */
  error: string;
}

/**
 * Copy 请求事件
 */
export interface CopyRequestEvent extends BaseInternalEvent {
  type: InternalEventType.COPY_REQUEST;
  /** 源线程ID */
  sourceThreadId: string;
}

/**
 * Copy 完成事件
 */
export interface CopyCompletedEvent extends BaseInternalEvent {
  type: InternalEventType.COPY_COMPLETED;
  /** 副本线程ID */
  copiedThreadId: string;
}

/**
 * Copy 失败事件
 */
export interface CopyFailedEvent extends BaseInternalEvent {
  type: InternalEventType.COPY_FAILED;
  /** 错误信息 */
  error: string;
}

/**
 * 所有内部事件类型的联合类型
 */
export type InternalEvent =
  | ForkRequestEvent
  | ForkCompletedEvent
  | ForkFailedEvent
  | JoinRequestEvent
  | JoinCompletedEvent
  | JoinFailedEvent
  | CopyRequestEvent
  | CopyCompletedEvent
  | CopyFailedEvent;
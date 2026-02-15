/**
 * 基础事件类型定义
 */

import type { ID, Timestamp, Metadata } from '../common';

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
  /** 线程取消 */
  THREAD_CANCELLED = 'THREAD_CANCELLED',
  /** 线程状态变更 */
  THREAD_STATE_CHANGED = 'THREAD_STATE_CHANGED',
  /** 线程分叉开始 */
  THREAD_FORK_STARTED = 'THREAD_FORK_STARTED',
  /** 线程分叉完成 */
  THREAD_FORK_COMPLETED = 'THREAD_FORK_COMPLETED',
  /** 线程合并开始 */
  THREAD_JOIN_STARTED = 'THREAD_JOIN_STARTED',
  /** 线程合并条件满足 */
  THREAD_JOIN_CONDITION_MET = 'THREAD_JOIN_CONDITION_MET',
  /** 线程复制开始 */
  THREAD_COPY_STARTED = 'THREAD_COPY_STARTED',
  /** 线程复制完成 */
  THREAD_COPY_COMPLETED = 'THREAD_COPY_COMPLETED',
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
  /** Token 使用警告 */
  TOKEN_USAGE_WARNING = 'TOKEN_USAGE_WARNING',
  /** 消息添加 */
  MESSAGE_ADDED = 'MESSAGE_ADDED',
  /** 工具调用开始 */
  TOOL_CALL_STARTED = 'TOOL_CALL_STARTED',
  /** 工具调用完成 */
  TOOL_CALL_COMPLETED = 'TOOL_CALL_COMPLETED',
  /** 工具调用失败 */
  TOOL_CALL_FAILED = 'TOOL_CALL_FAILED',
  /** 对话状态变更 */
  CONVERSATION_STATE_CHANGED = 'CONVERSATION_STATE_CHANGED',
  /** 错误事件 */
  ERROR = 'ERROR',
  /** 检查点创建 */
  CHECKPOINT_CREATED = 'CHECKPOINT_CREATED',
  /** 检查点恢复 */
  CHECKPOINT_RESTORED = 'CHECKPOINT_RESTORED',
  /** 检查点删除 */
  CHECKPOINT_DELETED = 'CHECKPOINT_DELETED',
  /** 检查点失败 */
  CHECKPOINT_FAILED = 'CHECKPOINT_FAILED',
  /** 子图开始 */
  SUBGRAPH_STARTED = 'SUBGRAPH_STARTED',
  /** 子图完成 */
  SUBGRAPH_COMPLETED = 'SUBGRAPH_COMPLETED',
  /** 触发子工作流开始 */
  TRIGGERED_SUBGRAPH_STARTED = 'TRIGGERED_SUBGRAPH_STARTED',
  /** 触发子工作流完成 */
  TRIGGERED_SUBGRAPH_COMPLETED = 'TRIGGERED_SUBGRAPH_COMPLETED',
  /** 触发子工作流失败 */
  TRIGGERED_SUBGRAPH_FAILED = 'TRIGGERED_SUBGRAPH_FAILED',
  /** 变量变更 */
  VARIABLE_CHANGED = 'VARIABLE_CHANGED',
  /** 用户交互请求 */
  USER_INTERACTION_REQUESTED = 'USER_INTERACTION_REQUESTED',
  /** 用户交互响应 */
  USER_INTERACTION_RESPONDED = 'USER_INTERACTION_RESPONDED',
  /** 用户交互处理完成 */
  USER_INTERACTION_PROCESSED = 'USER_INTERACTION_PROCESSED',
  /** 用户交互失败 */
  USER_INTERACTION_FAILED = 'USER_INTERACTION_FAILED',
  /** HumanRelay 请求 */
  HUMAN_RELAY_REQUESTED = 'HUMAN_RELAY_REQUESTED',
  /** HumanRelay 响应 */
  HUMAN_RELAY_RESPONDED = 'HUMAN_RELAY_RESPONDED',
  /** HumanRelay 处理完成 */
  HUMAN_RELAY_PROCESSED = 'HUMAN_RELAY_PROCESSED',
  /** HumanRelay 失败 */
  HUMAN_RELAY_FAILED = 'HUMAN_RELAY_FAILED',
  /** LLM 流式中止 */
  LLM_STREAM_ABORTED = 'LLM_STREAM_ABORTED',
  /** LLM 流式错误 */
  LLM_STREAM_ERROR = 'LLM_STREAM_ERROR'
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
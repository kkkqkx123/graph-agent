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
  USER_INTERACTION_FAILED = 'USER_INTERACTION_FAILED'
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
 * Token 使用警告事件类型
 */
export interface TokenUsageWarningEvent extends BaseEvent {
  type: EventType.TOKEN_USAGE_WARNING;
  /** 当前使用的 Token 数量 */
  tokensUsed: number;
  /** Token 限制阈值 */
  tokenLimit: number;
  /** 使用百分比 */
  usagePercentage: number;
}

/**
 * 消息添加事件类型
 */
export interface MessageAddedEvent extends BaseEvent {
  type: EventType.MESSAGE_ADDED;
  /** 节点ID */
  nodeId?: ID;
  /** 消息角色 */
  role: string;
  /** 消息内容 */
  content: string;
  /** 工具调用（如果有） */
  toolCalls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

/**
 * 工具调用开始事件类型
 */
export interface ToolCallStartedEvent extends BaseEvent {
  type: EventType.TOOL_CALL_STARTED;
  /** 节点ID */
  nodeId: ID;
  /** 工具名称 */
  toolName: string;
  /** 工具参数 */
  toolArguments: string;
}

/**
 * 工具调用完成事件类型
 */
export interface ToolCallCompletedEvent extends BaseEvent {
  type: EventType.TOOL_CALL_COMPLETED;
  /** 节点ID */
  nodeId: ID;
  /** 工具名称 */
  toolName: string;
  /** 工具结果 */
  toolResult: any;
  /** 执行时间 */
  executionTime: number;
}

/**
 * 工具调用失败事件类型
 */
export interface ToolCallFailedEvent extends BaseEvent {
  type: EventType.TOOL_CALL_FAILED;
  /** 节点ID */
  nodeId: ID;
  /** 工具名称 */
  toolName: string;
  /** 错误信息 */
  error: string;
}

/**
 * 对话状态变更事件类型
 */
export interface ConversationStateChangedEvent extends BaseEvent {
  type: EventType.CONVERSATION_STATE_CHANGED;
  /** 节点ID */
  nodeId?: ID;
  /** 消息数量 */
  messageCount: number;
  /** Token使用量 */
  tokenUsage: number;
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
  /** 输出数据 */
  output?: Record<string, any>;
  /** 执行时间（毫秒） */
  executionTime?: number;
}

/**
 * 触发子工作流失败事件类型
 */
export interface TriggeredSubgraphFailedEvent extends BaseEvent {
  type: EventType.TRIGGERED_SUBGRAPH_FAILED;
  /** 子工作流ID */
  subgraphId: ID;
  /** 触发器ID */
  triggerId: ID;
  /** 错误信息 */
  error: string;
  /** 执行时间（毫秒） */
  executionTime?: number;
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
 * 变量变更事件类型
 */
export interface VariableChangedEvent extends BaseEvent {
  type: EventType.VARIABLE_CHANGED;
  /** 变量名称 */
  variableName: string;
  /** 变量值 */
  variableValue: any;
  /** 变量作用域 */
  variableScope: string;
}

/**
 * 用户交互请求事件类型
 */
export interface UserInteractionRequestedEvent extends BaseEvent {
  type: EventType.USER_INTERACTION_REQUESTED;
  /** 节点ID */
  nodeId: ID;
  /** 交互ID */
  interactionId: ID;
  /** 操作类型 */
  operationType: string;
  /** 提示信息 */
  prompt: string;
  /** 超时时间 */
  timeout: number;
}

/**
 * 用户交互响应事件类型
 */
export interface UserInteractionRespondedEvent extends BaseEvent {
  type: EventType.USER_INTERACTION_RESPONDED;
  /** 交互ID */
  interactionId: ID;
  /** 用户输入数据 */
  inputData: any;
}

/**
 * 用户交互处理完成事件类型
 */
export interface UserInteractionProcessedEvent extends BaseEvent {
  type: EventType.USER_INTERACTION_PROCESSED;
  /** 交互ID */
  interactionId: ID;
  /** 操作类型 */
  operationType: string;
  /** 处理结果 */
  results: any;
}

/**
 * 用户交互失败事件类型
 */
export interface UserInteractionFailedEvent extends BaseEvent {
  type: EventType.USER_INTERACTION_FAILED;
  /** 交互ID */
  interactionId: ID;
  /** 失败原因 */
  reason: string;
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
  | ThreadCancelledEvent
  | ThreadStateChangedEvent
  | ThreadForkStartedEvent
  | ThreadForkCompletedEvent
  | ThreadJoinStartedEvent
  | ThreadJoinConditionMetEvent
  | ThreadCopyStartedEvent
  | ThreadCopyCompletedEvent
  | NodeStartedEvent
  | NodeCompletedEvent
  | NodeFailedEvent
  | NodeCustomEvent
  | TokenLimitExceededEvent
  | TokenUsageWarningEvent
  | MessageAddedEvent
  | ToolCallStartedEvent
  | ToolCallCompletedEvent
  | ToolCallFailedEvent
  | ConversationStateChangedEvent
  | ErrorEvent
  | CheckpointCreatedEvent
  | SubgraphStartedEvent
  | SubgraphCompletedEvent
  | TriggeredSubgraphStartedEvent
  | TriggeredSubgraphCompletedEvent
  | TriggeredSubgraphFailedEvent
  | VariableChangedEvent
  | UserInteractionRequestedEvent
  | UserInteractionRespondedEvent
  | UserInteractionProcessedEvent
  | UserInteractionFailedEvent;
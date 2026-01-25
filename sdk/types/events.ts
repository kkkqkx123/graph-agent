/**
 * Events类型定义
 * 定义工作流执行过程中的事件类型
 */

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
  /** 节点开始 */
  NODE_STARTED = 'NODE_STARTED',
  /** 节点完成 */
  NODE_COMPLETED = 'NODE_COMPLETED',
  /** 节点失败 */
  NODE_FAILED = 'NODE_FAILED',
  /** 工具调用 */
  TOOL_CALLED = 'TOOL_CALLED',
  /** 工具完成 */
  TOOL_COMPLETED = 'TOOL_COMPLETED',
  /** 工具失败 */
  TOOL_FAILED = 'TOOL_FAILED',
  /** 错误事件 */
  ERROR = 'ERROR',
  /** 检查点创建 */
  CHECKPOINT_CREATED = 'CHECKPOINT_CREATED'
}

/**
 * 基础事件类型
 */
export interface BaseEvent {
  /** 事件类型 */
  type: EventType;
  /** 时间戳 */
  timestamp: number;
  /** 工作流ID */
  workflowId: string;
  /** 线程ID */
  threadId: string;
  /** 事件元数据 */
  metadata?: Record<string, any>;
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
  parentThreadId: string;
  /** 子线程ID数组 */
  childThreadIds: string[];
}

/**
 * 线程合并事件类型
 */
export interface ThreadJoinedEvent extends BaseEvent {
  type: EventType.THREAD_JOINED;
  /** 父线程ID */
  parentThreadId: string;
  /** 子线程ID数组 */
  childThreadIds: string[];
  /** 合并策略 */
  joinStrategy: string;
}

/**
 * 节点开始事件类型
 */
export interface NodeStartedEvent extends BaseEvent {
  type: EventType.NODE_STARTED;
  /** 节点ID */
  nodeId: string;
  /** 节点类型 */
  nodeType: string;
}

/**
 * 节点完成事件类型
 */
export interface NodeCompletedEvent extends BaseEvent {
  type: EventType.NODE_COMPLETED;
  /** 节点ID */
  nodeId: string;
  /** 输出数据 */
  output: any;
  /** 执行时间 */
  executionTime: number;
}

/**
 * 节点失败事件类型
 */
export interface NodeFailedEvent extends BaseEvent {
  type: EventType.NODE_FAILED;
  /** 节点ID */
  nodeId: string;
  /** 错误信息 */
  error: any;
}

/**
 * 工具调用事件类型
 */
export interface ToolCalledEvent extends BaseEvent {
  type: EventType.TOOL_CALLED;
  /** 节点ID */
  nodeId: string;
  /** 工具ID */
  toolId: string;
  /** 工具参数 */
  parameters: Record<string, any>;
}

/**
 * 工具完成事件类型
 */
export interface ToolCompletedEvent extends BaseEvent {
  type: EventType.TOOL_COMPLETED;
  /** 节点ID */
  nodeId: string;
  /** 工具ID */
  toolId: string;
  /** 输出数据 */
  output: any;
  /** 执行时间 */
  executionTime: number;
}

/**
 * 工具失败事件类型
 */
export interface ToolFailedEvent extends BaseEvent {
  type: EventType.TOOL_FAILED;
  /** 节点ID */
  nodeId: string;
  /** 工具ID */
  toolId: string;
  /** 错误信息 */
  error: any;
}

/**
 * 错误事件类型
 */
export interface ErrorEvent extends BaseEvent {
  type: EventType.ERROR;
  /** 节点ID（可选） */
  nodeId?: string;
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
  checkpointId: string;
  /** 检查点描述 */
  description?: string;
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
  | NodeStartedEvent
  | NodeCompletedEvent
  | NodeFailedEvent
  | ToolCalledEvent
  | ToolCompletedEvent
  | ToolFailedEvent
  | ErrorEvent
  | CheckpointCreatedEvent;
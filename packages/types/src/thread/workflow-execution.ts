/**
 * Workflow Execution类型定义
 * 定义图工作流执行相关的类型
 *
 * 这些类型描述的是"执行一个工作流"这个操作的配置和结果。
 * Thread 是图工作流的顶层执行模块，包含完整的图结构信息。
 */

import type { Thread, ThreadOptions, ThreadResult } from './index.js';
import type { WorkflowDefinition } from '../workflow/index.js';
import type { ID, Timestamp, Metadata } from '../common.js';

/**
 * 工作流执行选项类型
 */
export interface WorkflowExecutionOptions {
  /** 工作流定义 */
  workflow: WorkflowDefinition;
  /** 线程选项 */
  threadOptions?: ThreadOptions;
  /** 是否启用事件监听 */
  enableEvents?: boolean;
  /** 是否启用日志记录 */
  enableLogging?: boolean;
  /** 自定义执行上下文 */
  context?: Metadata;
}

/**
 * 工作流执行结果类型
 */
export interface WorkflowExecutionResult {
  /** 执行是否成功 */
  success: boolean;
  /** 线程结果 */
  threadResult: ThreadResult;
  /** 执行元数据 */
  metadata: WorkflowExecutionMetadata;
}

/**
 * 工作流执行元数据类型
 */
export interface WorkflowExecutionMetadata {
  /** 执行ID */
  executionId: ID;
  /** 工作流ID */
  workflowId: ID;
  /** 线程ID */
  threadId: ID;
  /** 开始时间 */
  startTime: Timestamp;
  /** 结束时间 */
  endTime: Timestamp;
  /** 执行时长（毫秒） */
  duration: number;
  /** 执行步数 */
  steps: number;
  /** 执行的节点数量 */
  nodesExecuted: number;
  /** 执行的边数量 */
  edgesTraversed: number;
  /** 是否使用了检查点 */
  usedCheckpoints: boolean;
  /** 检查点数量 */
  checkpointCount: number;
  /** 自定义字段 */
  customFields?: Metadata;
}

/**
 * 工作流执行上下文类型
 */
export interface WorkflowExecutionContext {
  /** 工作流定义 */
  workflow: WorkflowDefinition;
  /** 当前线程 */
  thread: Thread;
  /** 执行选项 */
  options: WorkflowExecutionOptions;
  /** 执行元数据 */
  metadata: WorkflowExecutionMetadata;
  /** 自定义上下文数据 */
  contextData: Metadata;
}

/**
 * 统一的执行状态枚举（仅作为类型参考）
 *
 * 此枚举用于提供统一的执行状态命名参考，
 * AgentLoopEntity 和 ThreadEntity 可以参考此枚举定义状态，
 * 但继续使用各自的 AgentLoopStatus 和 ThreadStatus。
 *
 * 映射关系（仅供参考）：
 * - AgentLoopStatus.CREATED / ThreadStatus.CREATED -> ExecutionStatus.PENDING
 * - AgentLoopStatus.RUNNING / ThreadStatus.RUNNING -> ExecutionStatus.RUNNING
 * - AgentLoopStatus.PAUSED / ThreadStatus.PAUSED -> ExecutionStatus.PAUSED
 * - AgentLoopStatus.COMPLETED / ThreadStatus.COMPLETED -> ExecutionStatus.COMPLETED
 * - AgentLoopStatus.FAILED / ThreadStatus.FAILED -> ExecutionStatus.FAILED
 * - AgentLoopStatus.CANCELLED / ThreadStatus.CANCELLED -> ExecutionStatus.CANCELLED
 * - ThreadStatus.TIMEOUT -> ExecutionStatus.FAILED
 */
export enum ExecutionStatus {
  /** 待执行 */
  PENDING = 'PENDING',
  /** 执行中 */
  RUNNING = 'RUNNING',
  /** 已暂停 */
  PAUSED = 'PAUSED',
  /** 已完成 */
  COMPLETED = 'COMPLETED',
  /** 执行失败 */
  FAILED = 'FAILED',
  /** 已取消 */
  CANCELLED = 'CANCELLED'
}

/**
 * 统一的执行事件类型枚举（仅作为类型参考）
 *
 * 此枚举用于提供统一的执行事件命名参考，
 * Graph 已有 EventManager，无需额外实现。
 * Agent Loop 不需要独立的事件系统。
 * 此枚举仅作为事件命名的参考。
 */
export enum ExecutionEventType {
  // 实例生命周期事件
  /** 实例已创建 */
  INSTANCE_CREATED = 'INSTANCE_CREATED',
  /** 实例已启动 */
  INSTANCE_STARTED = 'INSTANCE_STARTED',
  /** 实例已暂停 */
  INSTANCE_PAUSED = 'INSTANCE_PAUSED',
  /** 实例已恢复 */
  INSTANCE_RESUMED = 'INSTANCE_RESUMED',
  /** 实例已完成 */
  INSTANCE_COMPLETED = 'INSTANCE_COMPLETED',
  /** 实例执行失败 */
  INSTANCE_FAILED = 'INSTANCE_FAILED',
  /** 实例已取消 */
  INSTANCE_CANCELLED = 'INSTANCE_CANCELLED',

  // 执行过程事件
  /** 节点开始执行 */
  NODE_STARTED = 'NODE_STARTED',
  /** 节点执行完成 */
  NODE_COMPLETED = 'NODE_COMPLETED',
  /** 节点执行失败 */
  NODE_FAILED = 'NODE_FAILED',

  // 工具调用事件
  /** 工具调用开始 */
  TOOL_CALL_STARTED = 'TOOL_CALL_STARTED',
  /** 工具调用完成 */
  TOOL_CALL_COMPLETED = 'TOOL_CALL_COMPLETED',
  /** 工具调用失败 */
  TOOL_CALL_FAILED = 'TOOL_CALL_FAILED',

  // 检查点事件
  /** 检查点已创建 */
  CHECKPOINT_CREATED = 'CHECKPOINT_CREATED',
  /** 检查点已恢复 */
  CHECKPOINT_RESTORED = 'CHECKPOINT_RESTORED'
}

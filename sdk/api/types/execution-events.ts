/**
 * 执行事件类型定义
 * 用于ExecutionBuilder的异步执行和观察器
 */

import type { ThreadResult } from '@modular-agent/types';

/**
 * 执行事件类型
 */
export type ExecutionEvent =
  | StartEvent
  | CompleteEvent
  | ErrorEvent
  | CancelledEvent
  | ProgressEvent
  | NodeExecutedEvent;

/**
 * 开始事件
 */
export interface StartEvent {
  type: 'start';
  timestamp: number;
  workflowId: string;
}

/**
 * 完成事件
 */
export interface CompleteEvent {
  type: 'complete';
  timestamp: number;
  workflowId: string;
  threadId: string;
  result: ThreadResult;
  executionStats: {
    duration: number;
    steps: number;
    nodesExecuted: number;
  };
}

/**
 * 错误事件
 */
export interface ErrorEvent {
  type: 'error';
  timestamp: number;
  workflowId: string;
  threadId: string;
  error: Error;
}

/**
 * 取消事件
 */
export interface CancelledEvent {
  type: 'cancelled';
  timestamp: number;
  workflowId: string;
  threadId: string;
  reason: string;
}

/**
 * 进度事件
 */
export interface ProgressEvent {
  type: 'progress';
  timestamp: number;
  workflowId: string;
  threadId: string;
  progress: {
    status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
    currentStep: number;
    totalSteps?: number;
    currentNodeId: string;
    currentNodeType: string;
  };
}

/**
 * 节点执行事件
 */
export interface NodeExecutedEvent {
  type: 'nodeExecuted';
  timestamp: number;
  workflowId: string;
  threadId: string;
  nodeId: string;
  nodeType: string;
  nodeResult: any;
  executionTime: number;
}
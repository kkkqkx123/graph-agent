/**
 * 线程上下文类型定义
 */

import type { ID } from '../common';

/**
 * FORK/JOIN上下文
 * 用于FORK/JOIN场景的线程关系管理
 */
export interface ForkJoinContext {
  /** Fork操作ID */
  forkId: string;
  /** Fork路径ID（用于Join时识别主线程） */
  forkPathId: string;
}

/**
 * Triggered子工作流上下文
 * 用于Triggered子工作流场景的线程关系管理
 */
export interface TriggeredSubworkflowContext {
  /** 父线程ID */
  parentThreadId: ID;
  /** 子线程ID数组 */
  childThreadIds: ID[];
  /** 触发的子工作流ID */
  triggeredSubworkflowId: ID;
}
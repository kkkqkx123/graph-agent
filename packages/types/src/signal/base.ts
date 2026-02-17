/**
 * 基础信号类型定义
 * 定义线程中断信号的基础类型
 */

import type { ID } from '../common.js';
import type { ThreadInterruptedException } from '../errors/index.js';

/**
 * 线程中断信号
 * 扩展标准的 AbortSignal，添加线程和节点上下文信息
 */
export interface ThreadAbortSignal extends Omit<AbortSignal, 'reason'> {
  /** 线程ID */
  threadId: ID;
  /** 节点ID */
  nodeId: ID;
  /** 中断原因 */
  reason: ThreadInterruptedException;
}
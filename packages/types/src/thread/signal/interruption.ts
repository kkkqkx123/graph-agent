/**
 * 中断请求类型定义
 * 定义线程中断请求相关的类型
 */

import type { ID } from '../../common.js';
import type { InterruptionType } from '../../errors/index.js';

/**
 * 中断请求选项
 */
export interface InterruptionRequestOptions {
  /** 中断类型 */
  type: Exclude<InterruptionType, null>;
  /** 线程ID */
  threadId: ID;
  /** 节点ID */
  nodeId: ID;
  /** 中断原因（可选） */
  reason?: string;
}
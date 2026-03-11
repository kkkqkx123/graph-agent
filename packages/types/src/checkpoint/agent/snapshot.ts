/**
 * Agent Loop 状态快照类型定义
 */

import type { Message } from '../../message/index.js';
import { AgentLoopStatus } from '../../agent/status.js';

/**
 * Agent Loop 状态快照
 */
export interface AgentLoopStateSnapshot {
  /** 状态 */
  status: AgentLoopStatus;
  /** 当前迭代次数 */
  currentIteration: number;
  /** 工具调用次数 */
  toolCallCount: number;
  /** 开始时间 */
  startTime: number | null;
  /** 结束时间 */
  endTime: number | null;
  /** 错误信息 */
  error: any;
  /** 消息历史 */
  messages: Message[];
  /** 变量集合 */
  variables: Record<string, any>;
  /** 配置 */
  config?: any;
}
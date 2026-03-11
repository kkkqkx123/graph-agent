/**
 * Agent 相关事件类型定义
 */

import type { ID, Timestamp, Metadata } from '../common.js';
import type { BaseEvent } from './base.js';

/**
 * Agent 自定义事件类型
 *
 * 用于 Agent Hook 触发的自定义事件
 */
export interface AgentCustomEvent extends BaseEvent {
  type: 'AGENT_CUSTOM_EVENT';
  /** Agent Loop ID */
  agentLoopId: ID;
  /** 自定义事件名称 */
  eventName: string;
  /** 事件数据 */
  eventData: Record<string, any>;
  /** 当前迭代次数 */
  iteration?: number;
  /** 父 Thread ID（如果作为 Graph 节点执行） */
  parentThreadId?: ID;
  /** 节点 ID（如果作为 Graph 节点执行） */
  nodeId?: ID;
  /** 事件元数据 */
  metadata?: Metadata;
}

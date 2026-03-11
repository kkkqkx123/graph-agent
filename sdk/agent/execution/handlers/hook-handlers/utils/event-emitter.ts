/**
 * Agent Hook 事件发射工具
 *
 * 负责触发 Agent Hook 相关的自定义事件
 * 参考 Graph 模块的 event-emitter.ts 设计
 */

import type { AgentLoopEntity } from '../../../../entities/agent-loop-entity.js';
import type { AgentCustomEvent } from '@modular-agent/types';
import { EventSystemError } from '@modular-agent/types';
import { getErrorOrNew, now } from '@modular-agent/common-utils';

/**
 * Agent 自定义事件类型
 *
 * 扩展自 BaseEvent，添加 Agent 特定字段
 */
export interface AgentCustomEventData {
  /** Agent Loop ID */
  agentLoopId: string;
  /** 事件名称 */
  eventName: string;
  /** 事件数据 */
  eventData: Record<string, any>;
  /** 当前迭代次数 */
  iteration?: number;
  /** 父 Thread ID（如果作为 Graph 节点执行） */
  parentThreadId?: string;
  /** 节点 ID（如果作为 Graph 节点执行） */
  nodeId?: string;
}

/**
 * 触发 Agent 自定义事件
 *
 * @param entity Agent Loop 实体
 * @param eventName 事件名称
 * @param eventData 事件数据
 * @param emitEvent 事件发射函数
 */
export async function emitAgentHookEvent(
  entity: AgentLoopEntity,
  eventName: string,
  eventData: Record<string, any>,
  emitEvent: (event: AgentCustomEvent) => Promise<void>
): Promise<void> {
  const event: AgentCustomEvent = {
    type: 'AGENT_CUSTOM_EVENT',
    timestamp: now(),
    threadId: entity.parentThreadId || entity.id,  // 使用 parentThreadId 或 entity.id 作为 threadId
    agentLoopId: entity.id,
    eventName,
    eventData,
    iteration: entity.state.currentIteration,
    parentThreadId: entity.parentThreadId,
    nodeId: entity.nodeId,
    metadata: {
      profileId: entity.config.profileId,
      toolCallCount: entity.state.toolCallCount
    }
  };

  try {
    await emitEvent(event);
  } catch (error) {
    // 抛出事件系统错误，由上层统一处理
    throw new EventSystemError(
      `Failed to emit agent custom event "${eventName}" for agent loop "${entity.id}"`,
      'emit',
      'AGENT_CUSTOM_EVENT',
      entity.nodeId,
      undefined,
      { eventName, agentLoopId: entity.id, originalError: getErrorOrNew(error) }
    );
  }
}

/**
 * Hook事件发射工具
 * 负责触发Hook相关的自定义事件
 */

import type { HookExecutionContext } from '../index';
import type { NodeCustomEvent } from '@modular-agent/types/events';
import { EventType } from '@modular-agent/types/events';

/**
 * 触发自定义事件
 * @param context Hook执行上下文
 * @param eventName 事件名称
 * @param eventData 事件数据
 * @param emitEvent 事件发射函数
 */
export async function emitHookEvent(
  context: HookExecutionContext,
  eventName: string,
  eventData: Record<string, any>,
  emitEvent: (event: NodeCustomEvent) => Promise<void>
): Promise<void> {
  const { thread, node } = context;

  const event: NodeCustomEvent = {
    type: EventType.NODE_CUSTOM_EVENT,
    timestamp: Date.now(),
    workflowId: thread.workflowId,
    threadId: thread.id,
    nodeId: node.id,
    nodeType: node.type,
    eventName,
    eventData,
    metadata: node.metadata
  };

  try {
    await emitEvent(event);
  } catch (error) {
    // 事件触发失败不应影响节点执行结果
    console.error(
      `Failed to emit custom event "${eventName}" for node "${node.id}":`,
      error
    );
  }
}
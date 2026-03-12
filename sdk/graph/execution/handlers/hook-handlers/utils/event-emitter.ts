/**
 * Hook事件发射工具
 * 负责触发Hook相关的自定义事件
 */

import type { HookExecutionContext } from '../index.js';
import type { NodeCustomEvent } from '@modular-agent/types';
import { EventSystemError } from '@modular-agent/types';
import { getErrorOrNew } from '@modular-agent/common-utils';
import { buildNodeCustomEvent } from '../../../../../core/utils/event/builders/index.js';

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

  const event = buildNodeCustomEvent({
    workflowId: thread.workflowId,
    threadId: thread.id,
    nodeId: node.id,
    nodeType: node.type,
    eventName,
    eventData,
    metadata: node.metadata
  });

  try {
    await emitEvent(event);
  } catch (error) {
    // 抛出事件系统错误，由 ErrorService 统一处理
    throw new EventSystemError(
      `Failed to emit custom event "${eventName}" for node "${node.id}"`,
      'emit',
      'NODE_CUSTOM_EVENT',
      node.id,
      undefined,
      { eventName, nodeId: node.id, originalError: getErrorOrNew(error) }
    );
  }
}

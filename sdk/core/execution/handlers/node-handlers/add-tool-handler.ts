/**
 * 工具添加节点处理器
 * 负责将工具添加到工具上下文中
 *
 * 设计原则：
 * - 只包含核心执行逻辑
 * - 依赖ToolContextManager进行工具管理
 * - 返回执行结果
 */

import type { Node, AddToolNodeConfig } from '@modular-agent/types';
import type { Thread } from '@modular-agent/types';
import { ExecutionError } from '@modular-agent/types';
import { now, diffTimestamp, getErrorOrNew } from '@modular-agent/common-utils';
import { ToolContextManager } from '../../managers/tool-context-manager.js';
import type { EventManager } from '../../../services/event-manager.js';
import { EventType } from '@modular-agent/types';
import type { ThreadEntity } from '../../../entities/thread-entity.js';

/**
 * 工具添加节点执行结果
 */
export interface AddToolExecutionResult {
  /** 执行状态 */
  status: 'COMPLETED' | 'FAILED';
  /** 成功添加的工具数量 */
  addedCount?: number;
  /** 被跳过的工具数量（已存在且不覆盖） */
  skippedCount?: number;
  /** 错误信息（如果失败） */
  error?: Error;
  /** 执行时间（毫秒） */
  executionTime: number;
}

/**
 * 工具添加节点处理器上下文
 */
export interface AddToolHandlerContext {
  /** 工具上下文管理器 */
  toolContextManager: ToolContextManager;
  /** 工具服务 */
  toolService: any;
  /** 事件管理器 */
  eventManager: EventManager;
  /** 线程实体（用于工具可见性声明） */
  threadEntity?: ThreadEntity;
}

/**
 * 工具添加节点处理器
 * @param thread Thread实例
 * @param node 节点定义
 * @param context 处理器上下文
 * @returns 执行结果
 */
export async function addToolHandler(
  thread: Thread,
  node: Node,
  context: AddToolHandlerContext
): Promise<AddToolExecutionResult> {
  const config = node.config as AddToolNodeConfig;
  const startTime = now();

  try {
    // 1. 验证工具ID
    const validToolIds: string[] = [];
    const invalidToolIds: string[] = [];

    for (const toolId of config.toolIds) {
      const tool = context.toolService.getTool(toolId);
      if (tool) {
        validToolIds.push(toolId);
      } else {
        invalidToolIds.push(toolId);
      }
    }

    if (invalidToolIds.length > 0) {
      throw new ExecutionError(
        `Invalid tool IDs: ${invalidToolIds.join(', ')}`,
        node.id
      );
    }

    // 2. 添加工具到上下文
    const scope = config.scope || 'THREAD';
    const overwrite = config.overwrite || false;

    const addedCount = context.toolContextManager.addTools(
      thread.id,
      thread.workflowId,
      validToolIds,
      scope,
      overwrite,
      config.descriptionTemplate,
      config.metadata
    );

    // 3. 计算跳过的工具数量
    const skippedCount = validToolIds.length - addedCount;

    // 4. 更新工具可见性（如果提供了 ThreadEntity）
    if (context.threadEntity && addedCount > 0) {
      // 工具可见性更新由ToolVisibilityCoordinator处理
      // 这里只是占位符，实际更新在协调器中完成
    }

    // 5. 触发工具添加事件
    await context.eventManager.emit({
      type: 'TOOL_ADDED',
      timestamp: now(),
      workflowId: thread.workflowId,
      threadId: thread.id,
      nodeId: node.id,
      toolIds: validToolIds,
      scope,
      addedCount,
      skippedCount
    });

    const endTime = now();

    return {
      status: 'COMPLETED',
      addedCount,
      skippedCount,
      executionTime: diffTimestamp(startTime, endTime)
    };
  } catch (error) {
    const endTime = now();
    return {
      status: 'FAILED',
      error: getErrorOrNew(error),
      executionTime: diffTimestamp(startTime, endTime)
    };
  }
}
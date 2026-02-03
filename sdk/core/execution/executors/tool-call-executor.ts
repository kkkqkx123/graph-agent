/**
 * 工具调用执行器
 * 专门处理工具调用执行
 *
 * 核心职责：
 * 1. 执行工具调用数组
 * 2. 处理单个工具调用
 * 3. 管理工具执行结果
 * 4. 触发相关事件
 *
 * 设计原则：
 * - 专门的工具执行逻辑
 * - 与事件协调器集成
 * - 统一的错误处理
 */

import type { ToolService } from '../../services/tool-service';
import type { EventManager } from '../../services/event-manager';
import { safeEmit } from '../utils/event/event-emitter';
import { EventType } from '../../../types/events';
import { now } from '../../../utils';
import type { ConversationManager } from '../managers/conversation-manager';

/**
 * 工具执行结果
 */
export interface ToolExecutionResult {
  /** 工具调用ID */
  toolCallId: string;
  /** 工具名称 */
  toolName: string;
  /** 是否成功 */
  success: boolean;
  /** 执行结果 */
  result?: any;
  /** 错误信息 */
  error?: string;
  /** 执行时间（毫秒） */
  executionTime: number;
}

/**
 * 工具调用执行器类
 */
export class ToolCallExecutor {
  constructor(
    private toolService: ToolService,
    private eventManager?: EventManager
  ) { }

  /**
   * 执行工具调用数组
   *
   * @param toolCalls 工具调用数组
   * @param conversationState 对话管理器
   * @param threadId 线程ID
   * @param nodeId 节点ID
   * @returns 执行结果数组
   */
  async executeToolCalls(
    toolCalls: Array<{ id: string; name: string; arguments: string }>,
    conversationState: ConversationManager,
    threadId?: string,
    nodeId?: string
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];

    for (const toolCall of toolCalls) {
      const result = await this.executeSingleToolCall(
        toolCall,
        conversationState,
        threadId,
        nodeId
      );
      results.push(result);
    }

    return results;
  }

  /**
   * 执行单个工具调用
   *
   * @param toolCall 工具调用
   * @param conversationState 对话管理器
   * @param threadId 线程ID
   * @param nodeId 节点ID
   * @returns 执行结果
   */
  private async executeSingleToolCall(
    toolCall: { id: string; name: string; arguments: string },
    conversationState: ConversationManager,
    threadId?: string,
    nodeId?: string
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    // 触发工具调用开始事件
    if (this.eventManager) {
      await safeEmit(this.eventManager, {
        type: EventType.TOOL_CALL_STARTED,
        timestamp: now(),
        workflowId: '',
        threadId: threadId || '',
        nodeId: nodeId || '',
        toolName: toolCall.name,
        toolArguments: toolCall.arguments
      });
    }

    try {
      // 调用 ToolService 执行工具
      const result = await this.toolService.execute(
        toolCall.name,
        JSON.parse(toolCall.arguments),
        {
          timeout: 30000,
          retries: 0,
          retryDelay: 1000
        }
      );

      const executionTime = Date.now() - startTime;

      // 将工具结果添加到对话历史
      const toolMessage = {
        role: 'tool' as const,
        content: result.success && result.result !== undefined
          ? JSON.stringify(result.result)
          : JSON.stringify({ error: result.error }),
        toolCallId: toolCall.id
      };
      conversationState.addMessage(toolMessage);

      // 触发消息添加事件
      if (this.eventManager) {
        await safeEmit(this.eventManager, {
          type: EventType.MESSAGE_ADDED,
          timestamp: now(),
          workflowId: '',
          threadId: threadId || '',
          nodeId,
          role: toolMessage.role,
          content: toolMessage.content,
          toolCalls: undefined // tool message doesn't have toolCalls
        });
      }

      // 触发工具调用完成事件
      if (this.eventManager) {
        await safeEmit(this.eventManager, {
          type: EventType.TOOL_CALL_COMPLETED,
          timestamp: now(),
          workflowId: '',
          threadId: threadId || '',
          nodeId: nodeId || '',
          toolName: toolCall.name,
          toolResult: result.result,
          executionTime
        });
      }

      return {
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        success: true,
        result: result.result,
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 将错误信息作为工具结果添加到对话历史
      const toolMessage = {
        role: 'tool' as const,
        content: JSON.stringify({ error: errorMessage }),
        toolCallId: toolCall.id
      };
      conversationState.addMessage(toolMessage);

      // 触发消息添加事件
      if (this.eventManager) {
        await safeEmit(this.eventManager, {
          type: EventType.MESSAGE_ADDED,
          timestamp: now(),
          workflowId: '',
          threadId: threadId || '',
          nodeId,
          role: toolMessage.role,
          content: toolMessage.content,
          toolCalls: undefined // tool message doesn't have toolCalls
        });
      }

      // 触发工具调用失败事件
      if (this.eventManager) {
        await safeEmit(this.eventManager, {
          type: EventType.TOOL_CALL_FAILED,
          timestamp: now(),
          workflowId: '',
          threadId: threadId || '',
          nodeId: nodeId || '',
          toolName: toolCall.name,
          error: errorMessage
        });
      }

      return {
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        success: false,
        error: errorMessage,
        executionTime
      };
    }
  }
}
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
import type { Tool } from '@modular-agent/types/tool';
import { safeEmit } from '../utils/event/event-emitter';
import { EventType } from '@modular-agent/types/events';
import { now } from '@modular-agent/common-utils';
import type { ConversationManager } from '../managers/conversation-manager';
import type { CheckpointDependencies } from '../handlers/checkpoint-handlers/checkpoint-utils';
import { createCheckpoint } from '../handlers/checkpoint-handlers/checkpoint-utils';
import { ThreadInterruptedException, ToolAbortError } from '@modular-agent/types/errors';

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
    private eventManager?: EventManager,
    private checkpointDependencies?: CheckpointDependencies
  ) { }

  /**
   * 执行工具调用数组
   *
   * @param toolCalls 工具调用数组
   * @param conversationState 对话管理器
   * @param threadId 线程ID
   * @param nodeId 节点ID
   * @param options 执行选项（包含 AbortSignal）
   * @returns 执行结果数组
   */
  async executeToolCalls(
    toolCalls: Array<{ id: string; name: string; arguments: string }>,
    conversationState: ConversationManager,
    threadId?: string,
    nodeId?: string,
    options?: { abortSignal?: AbortSignal }
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];

    for (const toolCall of toolCalls) {
      // 检查中断信号
      if (options?.abortSignal?.aborted) {
        throw options.abortSignal.reason || new ThreadInterruptedException('Tool execution aborted', 'STOP');
      }

      const result = await this.executeSingleToolCall(
        toolCall,
        conversationState,
        threadId,
        nodeId,
        options
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
   * @param options 执行选项（包含 AbortSignal）
   * @returns 执行结果
   */
  private async executeSingleToolCall(
    toolCall: { id: string; name: string; arguments: string },
    conversationState: ConversationManager,
    threadId?: string,
    nodeId?: string,
    options?: { abortSignal?: AbortSignal }
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    // 获取工具配置
    let toolConfig: Tool | undefined;
    try {
      toolConfig = this.toolService.getTool(toolCall.name);
    } catch (error) {
      // 工具不存在，继续执行
    }

    // 工具调用前创建检查点（如果配置了）
    if (toolConfig?.createCheckpoint && this.checkpointDependencies && threadId) {
      const checkpointConfig = toolConfig.createCheckpoint;
      if (checkpointConfig === true || checkpointConfig === 'before' || checkpointConfig === 'both') {
        try {
          await createCheckpoint(
            {
              threadId,
              toolName: toolCall.name,
              description: toolConfig.checkpointDescriptionTemplate || `Before tool: ${toolCall.name}`
            },
            this.checkpointDependencies
          );
        } catch (error) {
          console.error(
            `Failed to create checkpoint before tool "${toolCall.name}":`,
            error
          );
          // 检查点创建失败不应影响工具执行
        }
      }
    }

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
          retryDelay: 1000,
          signal: options?.abortSignal // 传递 AbortSignal
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

      // 工具调用后创建检查点（如果配置了）
      if (toolConfig?.createCheckpoint && this.checkpointDependencies && threadId) {
        const checkpointConfig = toolConfig.createCheckpoint;
        if (checkpointConfig === 'after' || checkpointConfig === 'both') {
          try {
            await createCheckpoint(
              {
                threadId,
                toolName: toolCall.name,
                description: toolConfig.checkpointDescriptionTemplate || `After tool: ${toolCall.name}`
              },
              this.checkpointDependencies
            );
          } catch (error) {
            console.error(
              `Failed to create checkpoint after tool "${toolCall.name}":`,
              error
            );
            // 检查点创建失败不应影响工具执行
          }
        }
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

      // 处理 AbortError，转换为专门的 ToolAbortError
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ToolAbortError(
          'Tool execution aborted',
          threadId || '',
          nodeId || '',
          toolCall.name,
          error
        );
      }

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
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

import { isAbortError, getThreadInterruptedException } from '@modular-agent/common-utils';
import type { ToolService } from '../../services/tool-service.js';
import type { EventManager } from '../../services/event-manager.js';
import type { Tool, ID } from '@modular-agent/types';
import { safeEmit } from '../utils/event/event-emitter.js';
import { EventType, MessageRole } from '@modular-agent/types';
import { now } from '@modular-agent/common-utils';
import type { ConversationManager } from '../managers/conversation-manager.js';
import type { CheckpointDependencies } from '../handlers/checkpoint-handlers/checkpoint-utils.js';
import { createCheckpoint } from '../handlers/checkpoint-handlers/checkpoint-utils.js';
import { ThreadInterruptedException, SystemExecutionError, ToolError } from '@modular-agent/types';
import { MessageBuilder } from '../../messages/message-builder.js';

/**
 * 工具执行结果
 */
export interface ToolExecutionResult {
  /** 工具调用ID */
  toolCallId: string;
  /** 工具ID */
  toolId: ID;
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
    // 检查中断信号
    if (options?.abortSignal && options.abortSignal.aborted) {
      const reason = getThreadInterruptedException(options.abortSignal);
      if (reason) {
        throw reason;
      }
      throw new ThreadInterruptedException('Tool execution aborted', 'STOP');
    }

    // 使用 Promise.allSettled 并行执行所有工具调用
    // 即使部分工具调用失败，其他工具调用也能继续执行
    const executionPromises = toolCalls.map(toolCall =>
      this.executeSingleToolCall(
        toolCall,
        conversationState,
        threadId,
        nodeId,
        options
      )
    );

    const settledResults = await Promise.allSettled(executionPromises);

    // 转换结果为统一的 ToolExecutionResult[] 格式
    return settledResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // 处理 rejected 的情况
        const toolCall = toolCalls[index];
        if (!toolCall) {
          throw new Error(`Tool call at index ${index} is undefined`);
        }
        
        const error = result.reason;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const executionTime = 0;

        // 使用 MessageBuilder 构建失败的工具结果消息
        const toolMessage = MessageBuilder.buildToolMessage(
          toolCall.id,
          {
            success: false,
            error: errorMessage || 'Tool execution failed',
            executionTime: 0,
            retryCount: 0
          }
        );
        conversationState.addMessage(toolMessage);

        // 触发消息添加事件
        if (this.eventManager) {
          safeEmit(this.eventManager, {
            type: 'MESSAGE_ADDED',
            timestamp: now(),
            workflowId: '',
            threadId: threadId || '',
            nodeId,
            role: toolMessage.role,
            content: typeof toolMessage.content === 'string' ? toolMessage.content : JSON.stringify(toolMessage.content),
            toolCalls: undefined
          });
        }

        // 触发工具调用失败事件
        if (this.eventManager) {
          safeEmit(this.eventManager, {
            type: 'TOOL_CALL_FAILED',
            timestamp: now(),
            workflowId: '',
            threadId: threadId || '',
            nodeId: nodeId || '',
            toolId: toolCall.name,
            error: errorMessage
          });
        }

        return {
          toolCallId: toolCall.id,
          toolId: toolCall.name,
          success: false,
          error: errorMessage,
          executionTime
        };
      }
    });
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
              toolId: toolCall.name,
              description: toolConfig.checkpointDescriptionTemplate || `Before tool: ${toolCall.name}`
            },
            this.checkpointDependencies
          );
        } catch (error) {
          // 抛出系统执行错误，由 ErrorService 统一处理
          throw new SystemExecutionError(
            `Failed to create checkpoint before tool "${toolCall.name}"`,
            'ToolCallExecutor',
            'executeToolCall',
            undefined,
            undefined,
            { toolId: toolCall.name, originalError: error instanceof Error ? error : new Error(String(error)) }
          );
        }
      }
    }

    // 触发工具调用开始事件
    if (this.eventManager) {
      await safeEmit(this.eventManager, {
        type: 'TOOL_CALL_STARTED',
        timestamp: now(),
        workflowId: '',
        threadId: threadId || '',
        nodeId: nodeId || '',
        toolId: toolCall.name,
        toolArguments: toolCall.arguments
      });
    }

    // 构建执行选项，支持从工具配置中读取
    const executionOptions: any = {
      timeout: (toolConfig?.config as any)?.timeout || 30000,
      retries: (toolConfig?.config as any)?.maxRetries || 0,
      retryDelay: (toolConfig?.config as any)?.retryDelay || 1000,
      signal: options?.abortSignal // 传递 AbortSignal
    };

    // 调用 ToolService 执行工具
    const result = await this.toolService.execute(
      toolCall.name,
      JSON.parse(toolCall.arguments),
      executionOptions,
      threadId
    );

    const executionTime = Date.now() - startTime;

    if (result.isErr()) {
      const error = result.error;
      const errorMessage = error.message;

      // 处理 AbortError，转换为 ThreadInterruptedException
      if (isAbortError(error)) {
        const reason = getThreadInterruptedException(options?.abortSignal!);
        if (reason) {
          throw reason;
        }
        // 如果没有获取到 ThreadInterruptedException，创建一个新的
        throw new ThreadInterruptedException(
          'Tool execution aborted',
          'STOP',
          threadId || '',
          nodeId || ''
        );
      }

      // 使用 MessageBuilder 构建失败的工具结果消息
      const toolMessage = MessageBuilder.buildToolMessage(
        toolCall.id,
        {
          success: false,
          error: errorMessage || 'Tool execution failed',
          executionTime,
          retryCount: 0
        }
      );
      conversationState.addMessage(toolMessage);

      // 触发消息添加事件
      if (this.eventManager) {
        await safeEmit(this.eventManager, {
          type: 'MESSAGE_ADDED',
          timestamp: now(),
          workflowId: '',
          threadId: threadId || '',
          nodeId,
          role: toolMessage.role,
          content: typeof toolMessage.content === 'string' ? toolMessage.content : JSON.stringify(toolMessage.content),
          toolCalls: undefined
        });
      }

      // 触发工具调用失败事件
      if (this.eventManager) {
        await safeEmit(this.eventManager, {
          type: 'TOOL_CALL_FAILED',
          timestamp: now(),
          workflowId: '',
          threadId: threadId || '',
          nodeId: nodeId || '',
          toolId: toolCall.name,
          error: errorMessage
        });
      }

      return {
        toolCallId: toolCall.id,
        toolId: toolCall.name,
        success: false,
        error: errorMessage,
        executionTime
      };
    }

    // 成功执行
    const serviceResult = result.value;

    // 使用 MessageBuilder 构建成功的工具结果消息
    const toolMessage = MessageBuilder.buildToolMessage(
      toolCall.id,
      {
        success: serviceResult.success,
        result: serviceResult.result,
        error: serviceResult.error,
        executionTime,
        retryCount: 0
      }
    );
    conversationState.addMessage(toolMessage);

    // 触发消息添加事件
    if (this.eventManager) {
      await safeEmit(this.eventManager, {
        type: 'MESSAGE_ADDED',
        timestamp: now(),
        workflowId: '',
        threadId: threadId || '',
        nodeId,
        role: toolMessage.role,
        content: typeof toolMessage.content === 'string' ? toolMessage.content : JSON.stringify(toolMessage.content),
        toolCalls: undefined
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
              toolId: toolCall.name,
              description: toolConfig.checkpointDescriptionTemplate || `After tool: ${toolCall.name}`
            },
            this.checkpointDependencies
          );
        } catch (error) {
          // 抛出系统执行错误，由 ErrorService 统一处理
          throw new SystemExecutionError(
            `Failed to create checkpoint after tool "${toolCall.name}"`,
            'ToolCallExecutor',
            'executeToolCall',
            undefined,
            undefined,
            { toolId: toolCall.name, originalError: error instanceof Error ? error : new Error(String(error)) }
          );
        }
      }
    }

    // 触发工具调用完成事件
    if (this.eventManager) {
      await safeEmit(this.eventManager, {
        type: 'TOOL_CALL_COMPLETED',
        timestamp: now(),
        workflowId: '',
        threadId: threadId || '',
        nodeId: nodeId || '',
        toolId: toolCall.name,
        toolResult: serviceResult.result,
        executionTime
      });
    }

    return {
      toolCallId: toolCall.id,
      toolId: toolCall.name,
      success: true,
      result: serviceResult.result,
      executionTime
    };
  }
}
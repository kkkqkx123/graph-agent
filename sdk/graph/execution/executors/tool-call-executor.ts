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

import { isAbortError, checkInterruption } from '@modular-agent/common-utils';
import type { ToolService } from '../../services/tool-service.js';
import type { EventManager } from '../../services/event-manager.js';
import type { Tool, ID } from '@modular-agent/types';
import { safeEmit } from '../utils/event/event-emitter.js';
import { now, diffTimestamp, generateId } from '@modular-agent/common-utils';
import type { ConversationManager } from '../managers/conversation-manager.js';
import type { CheckpointDependencies } from '../handlers/checkpoint-handlers/checkpoint-utils.js';
import { createCheckpoint } from '../handlers/checkpoint-handlers/checkpoint-utils.js';
import { ThreadInterruptedException, SystemExecutionError } from '@modular-agent/types';
import { MessageBuilder } from '../../messages/message-builder.js';
import type { ToolVisibilityCoordinator } from '../coordinators/tool-visibility-coordinator.js';
import {
  buildMessageAddedEvent,
  buildToolCallStartedEvent,
  buildToolCallCompletedEvent,
  buildToolCallFailedEvent
} from '../utils/event/event-builder.js';

/**
 * 工具调用任务信息
 * 用于追踪单个工具调用的生命周期
 */
export interface ToolCallTaskInfo {
  /** 任务ID（唯一标识） */
  taskId: string;
  /** 批次ID（同一批并行调用的标识） */
  batchId: string;
  /** 工具调用ID（来自LLM响应） */
  toolCallId: string;
  /** 工具名称 */
  toolName: string;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime?: number;
  /** 状态 */
  status: 'running' | 'completed' | 'failed';
  /** 错误信息（如果失败） */
  error?: string;
}

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
    private checkpointDependencies?: CheckpointDependencies,
    private toolVisibilityCoordinator?: ToolVisibilityCoordinator
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
      const result = checkInterruption(options.abortSignal);
      if (result.type === 'paused' || result.type === 'stopped') {
        throw new ThreadInterruptedException(
          'Tool execution interrupted',
          result.type === 'paused' ? 'PAUSE' : 'STOP',
          result.threadId || threadId || '',
          result.nodeId || nodeId || ''
        );
      }
      throw new ThreadInterruptedException('Tool execution aborted', 'STOP');
    }

    // 生成批次ID（用于追踪这一批并行工具调用）
    const batchId = `batch_${generateId()}`;

    // 为每个工具调用预生成任务ID和任务信息
    const taskInfos: Map<string, ToolCallTaskInfo> = new Map();
    for (const toolCall of toolCalls) {
      const taskId = `task_${generateId()}`;
      taskInfos.set(toolCall.id, {
        taskId,
        batchId,
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        startTime: now(),
        status: 'running'
      });
    }

    // 使用 Promise.allSettled 并行执行所有工具调用
    // 即使部分工具调用失败，其他工具调用也能继续执行
    const executionPromises = toolCalls.map(toolCall =>
      this.executeSingleToolCall(
        toolCall,
        conversationState,
        threadId,
        nodeId,
        batchId,
        taskInfos.get(toolCall.id)!,
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
          const messageEvent = buildMessageAddedEvent({
            threadId: threadId || '',
            role: toolMessage.role,
            content: typeof toolMessage.content === 'string' ? toolMessage.content : JSON.stringify(toolMessage.content),
            nodeId
          });
          safeEmit(this.eventManager, messageEvent);
        }

        // 从taskInfos获取任务信息
        const taskInfo = taskInfos.get(toolCall.id)!;

        // 触发工具调用失败事件
        if (this.eventManager) {
          const failedEvent = buildToolCallFailedEvent({
            threadId: threadId || '',
            nodeId: nodeId || '',
            toolId: toolCall.name,
            toolName: toolCall.name,
            error: new Error(errorMessage),
            taskId: taskInfo.taskId,
            batchId: taskInfo.batchId
          });
          safeEmit(this.eventManager, failedEvent);
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
   * @param batchId 批次ID（用于追踪并行调用）
   * @param taskInfo 任务信息（包含预生成的taskId等）
   * @param options 执行选项（包含 AbortSignal）
   * @returns 执行结果
   */
  private async executeSingleToolCall(
    toolCall: { id: string; name: string; arguments: string },
    conversationState: ConversationManager,
    threadId: string | undefined,
    nodeId: string | undefined,
    batchId: string,
    taskInfo: ToolCallTaskInfo,
    options?: { abortSignal?: AbortSignal }
  ): Promise<ToolExecutionResult> {
    const startTime = taskInfo.startTime;

    // 获取工具配置
    let toolConfig: Tool | undefined;
    try {
      toolConfig = this.toolService.getTool(toolCall.name);
    } catch (error) {
      // 工具不存在，继续执行
    }

    // 检查工具是否在当前可见性上下文中
    if (threadId && this.toolVisibilityCoordinator) {
      if (!this.toolVisibilityCoordinator.isToolVisible(threadId, toolCall.name)) {
        const visibleTools = this.toolVisibilityCoordinator.getEffectiveVisibleTools(threadId);
        const errorMessage = `工具 '${toolCall.name}' 在当前作用域不可用。当前可用工具：[${Array.from(visibleTools).join(', ')}]`;

        // 使用 MessageBuilder 构建失败的工具结果消息
        const toolMessage = MessageBuilder.buildToolMessage(
          toolCall.id,
          {
            success: false,
            error: errorMessage,
            executionTime: diffTimestamp(startTime, now()),
            retryCount: 0
          }
        );
        conversationState.addMessage(toolMessage);

        // 触发消息添加事件
        if (this.eventManager) {
          const messageEvent = buildMessageAddedEvent({
            threadId: threadId || '',
            role: toolMessage.role,
            content: typeof toolMessage.content === 'string' ? toolMessage.content : JSON.stringify(toolMessage.content),
            nodeId
          });
          await safeEmit(this.eventManager, messageEvent);
        }

        // 触发工具调用失败事件
        if (this.eventManager) {
          const failedEvent = buildToolCallFailedEvent({
            threadId: threadId || '',
            nodeId: nodeId || '',
            toolId: toolCall.name,
            toolName: toolCall.name,
            error: new Error(errorMessage),
            taskId: taskInfo.taskId,
            batchId
          });
          await safeEmit(this.eventManager, failedEvent);
        }

        return {
          toolCallId: toolCall.id,
          toolId: toolCall.name,
          success: false,
          error: errorMessage,
          executionTime: diffTimestamp(startTime, now())
        };
      }
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
      const startedEvent = buildToolCallStartedEvent({
        threadId: threadId || '',
        nodeId: nodeId || '',
        toolId: toolCall.name,
        toolName: toolCall.name,
        toolArguments: toolCall.arguments,
        taskId: taskInfo.taskId,
        batchId
      });
      await safeEmit(this.eventManager, startedEvent);
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

    const executionTime = diffTimestamp(startTime, now());

    if (result.isErr()) {
      const error = result.error;
      const errorMessage = error.message;

      // 处理 AbortError
      if (isAbortError(error)) {
        const result = checkInterruption(options?.abortSignal);
        // 只有 PAUSE 或 STOP 才转换为 ThreadInterruptedException
        if (result.type === 'paused' || result.type === 'stopped') {
          throw new ThreadInterruptedException(
            'Tool execution interrupted',
            result.type === 'paused' ? 'PAUSE' : 'STOP',
            result.threadId || threadId || '',
            result.nodeId || nodeId || ''
          );
        }
        // 普通中止（aborted）或未中止（continue），重新抛出原始错误
        throw error;
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
        const messageEvent = buildMessageAddedEvent({
          threadId: threadId || '',
          role: toolMessage.role,
          content: typeof toolMessage.content === 'string' ? toolMessage.content : JSON.stringify(toolMessage.content),
          nodeId
        });
        await safeEmit(this.eventManager, messageEvent);
      }

      // 触发工具调用失败事件
      if (this.eventManager) {
        const failedEvent = buildToolCallFailedEvent({
          threadId: threadId || '',
          nodeId: nodeId || '',
          toolId: toolCall.name,
          toolName: toolCall.name,
          error: new Error(errorMessage),
          taskId: taskInfo.taskId,
          batchId
        });
        await safeEmit(this.eventManager, failedEvent);
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
      const messageEvent = buildMessageAddedEvent({
        threadId: threadId || '',
        role: toolMessage.role,
        content: typeof toolMessage.content === 'string' ? toolMessage.content : JSON.stringify(toolMessage.content),
        nodeId
      });
      await safeEmit(this.eventManager, messageEvent);
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
      const completedEvent = buildToolCallCompletedEvent({
        threadId: threadId || '',
        nodeId: nodeId || '',
        toolId: toolCall.name,
        toolName: toolCall.name,
        toolResult: serviceResult.result,
        executionTime,
        taskId: taskInfo.taskId,
        batchId
      });
      await safeEmit(this.eventManager, completedEvent);
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
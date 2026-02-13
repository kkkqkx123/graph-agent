/**
 * LLM 执行协调器
 * 负责协调 LLM 调用和工具调用的完整流程
 *
 * 核心职责：
 * 1. 作为高层协调入口
 * 2. 委托给专门的组件处理具体逻辑
 * 3. 返回最终执行结果
 *
 * 设计原则：
 * - 简化的协调逻辑
 * - 依赖注入：通过构造函数接收依赖
 * - 职责分离：将具体执行逻辑委托给专门组件
 */

import type { LLMMessage } from '@modular-agent/types/llm';
import type { WorkflowConfig } from '@modular-agent/types/workflow';
import { ConversationManager } from '../managers/conversation-manager';
import { LLMExecutor } from '../executors/llm-executor';
import { type ToolService } from '../../services/tool-service';
import type { EventManager } from '../../services/event-manager';
import { safeEmit } from '../utils/event/event-emitter';
import { EventType } from '@modular-agent/types/events';
import { UserInteractionOperationType } from '@modular-agent/types';
import type { ToolApprovalData } from '@modular-agent/types';
import { now } from '@modular-agent/common-utils';
import { ToolCallExecutor } from '../executors/tool-call-executor';
import { ExecutionError, ThreadInterruptedException } from '@modular-agent/types/errors';
import { generateId } from '@modular-agent/common-utils';
import { CheckpointCoordinator } from './checkpoint-coordinator';
import type { ExecutionContext } from '../context/execution-context';
import { globalMessageStorage } from '../../services/global-message-storage';
import type { InterruptionDetector } from '../managers/interruption-detector';

/**
 * LLM 执行参数
 */
export interface LLMExecutionParams {
  /** 线程 ID */
  threadId: string;
  /** 节点 ID */
  nodeId: string;
  /** 提示词 */
  prompt: string;
  /** LLM 配置 ID */
  profileId?: string;
  /** LLM 参数 */
  parameters?: Record<string, any>;
  /** 工具列表 */
  tools?: any[];
  /** 动态工具配置 */
  dynamicTools?: {
    /** 要动态添加的工具ID或名称 */
    toolIds: string[];
    /** 工具描述模板（可选） */
    descriptionTemplate?: string;
  };
  /** 单次LLM调用最多返回的工具调用数（默认3） */
  maxToolCallsPerRequest?: number;
  /** 工作流配置（用于工具审批） */
  workflowConfig?: WorkflowConfig;
}

/**
 * LLM 执行返回结果
 */
export interface LLMExecutionResponse {
  /** 是否成功 */
  success: boolean;
  /** LLM 响应内容 */
  content?: string;
  /** 错误信息 */
  error?: Error;
  /** 消息历史 */
  messages?: LLMMessage[];
}

/**
 * LLM 执行协调器类
 *
 * 职责：
 * - 作为高层协调入口
 * - 直接协调 LLM 调用、工具调用和对话状态管理
 * - 返回最终执行结果
 *
 * 设计原则：
 * - 简化的协调逻辑
 * - 职责分离：每个组件只负责自己的职责
 * - 依赖注入
 */
export class LLMExecutionCoordinator {
  private interruptionDetector?: InterruptionDetector;

  constructor(
    private llmExecutor: LLMExecutor,
    private toolService: ToolService,
    private eventManager: EventManager,
    private executionContext?: ExecutionContext
  ) {
    if (executionContext) {
      this.interruptionDetector = new (require('../utils/interruption/interruption-detector').InterruptionDetectorImpl)(
        executionContext.getThreadRegistry()
      );
    }
  }

  /**
   * 检查是否应该中断当前执行
   *
   * @param threadId Thread ID
   * @returns 是否应该中断
   */
  shouldInterrupt(threadId: string): boolean {
    if (this.interruptionDetector) {
      return this.interruptionDetector.shouldInterrupt(threadId);
    }
    
    // 向后兼容：如果没有提供 interruptionDetector，使用旧的方式
    if (!this.executionContext) {
      return false;
    }

    const threadContext = this.executionContext.getThreadRegistry().get(threadId);
    if (!threadContext) {
      return false;
    }

    return threadContext.getShouldStop() || threadContext.getShouldPause();
  }

  /**
   * 执行 LLM 调用
   *
   * 此方法作为高层协调入口，直接协调各个组件处理完整流程：
   * 1. 管理对话状态（通过 ConversationManager）
   * 2. 执行 LLM 调用（通过 LLMExecutor）
   * 3. 执行工具调用（通过 ToolCallExecutor）
   * 4. 触发相关事件（通过事件工具函数）
   * 5. 返回最终执行结果
   *
   * @param params 执行参数
   * @param conversationState 对话管理器
   * @returns 执行结果
   */
  async executeLLM(
    params: LLMExecutionParams,
    conversationState: ConversationManager
  ): Promise<LLMExecutionResponse> {
    try {
      // 执行完整的 LLM-工具调用循环
      const content = await this.executeLLMLoop(params, conversationState);

      return {
        success: true,
        content,
        messages: conversationState.getMessages()
      };
    } catch (error) {
      // ThreadInterruptedException 会自动向上传播，无需特殊处理
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * 执行完整的 LLM-工具调用循环
   *
   * 核心职责：
   * 1. 执行完整的 LLM-工具调用循环
   * 2. 控制循环迭代次数
   * 3. 管理 Token 使用监控
   * 4. 处理对话状态
   *
   * @param params 执行参数
   * @param conversationState 对话管理器
   * @returns LLM 响应内容
   */
  private async executeLLMLoop(
    params: LLMExecutionParams,
    conversationState: ConversationManager
  ): Promise<string> {
    const {
      prompt, profileId, parameters, tools, dynamicTools,
      maxToolCallsPerRequest,
      threadId, nodeId
    } = params;

    // 获取 AbortSignal
    const threadContext = this.executionContext?.getThreadRegistry().get(threadId);
    const abortSignal = threadContext?.getAbortSignal();

    // 检查是否应该中断
    if (this.shouldInterrupt(threadId)) {
      const interruptionType = threadContext?.getShouldStop() ? 'STOP' : 'PAUSE';
      throw new ThreadInterruptedException(
        `LLM execution ${interruptionType.toLowerCase()}`,
        interruptionType,
        threadId,
        nodeId
      );
    }

    // 步骤1：添加用户消息
    const userMessage = {
      role: 'user' as const,
      content: prompt
    };
    conversationState.addMessage(userMessage);

    // 触发消息添加事件
    await safeEmit(this.eventManager, {
      type: EventType.MESSAGE_ADDED,
      timestamp: now(),
      workflowId: '',
      threadId: threadId || '',
      nodeId,
      role: userMessage.role,
      content: userMessage.content,
      toolCalls: undefined
    });

    // 检查 Token 使用情况
    await conversationState.checkTokenUsage();

    // 检查 Token 使用警告
    const tokenUsage = conversationState.getTokenUsage();
    if (tokenUsage) {
      const tokenLimit = 100000; // 使用固定限制或从配置获取
      const usagePercentage = (tokenUsage.totalTokens / tokenLimit) * 100;

      // 当使用量超过 80% 时触发警告
      if (usagePercentage > 80) {
        await safeEmit(this.eventManager, {
          type: EventType.TOKEN_USAGE_WARNING,
          timestamp: now(),
          workflowId: '',
          threadId: threadId || '',
          tokensUsed: tokenUsage.totalTokens,
          tokenLimit,
          usagePercentage
        });
      }
    }

    // 如果存在动态工具，合并静态和动态工具
    let availableTools = tools;
    if (dynamicTools?.toolIds) {
      const workflowTools = tools ? new Set(tools.map((t: any) => t.name || t.id)) : new Set();
      availableTools = this.getAvailableTools(workflowTools, dynamicTools);
    }

    // 执行 LLM 调用前再次检查中断
    if (this.shouldInterrupt(threadId)) {
      const threadContext = this.executionContext?.getThreadRegistry().get(threadId);
      const interruptionType = threadContext?.getShouldStop() ? 'STOP' : 'PAUSE';
      throw new ThreadInterruptedException(
        `LLM execution ${interruptionType.toLowerCase()} before LLM call`,
        interruptionType,
        threadId,
        nodeId
      );
    }

    // 执行 LLM 调用（传递 AbortSignal）
    const llmResult = await this.llmExecutor.executeLLMCall(
      conversationState.getMessages(),
      {
        prompt,
        profileId: profileId || 'default',
        parameters: parameters || {},
        tools: availableTools
      },
      { abortSignal }
    );

    // 更新 Token 使用统计
    if (llmResult.usage) {
      conversationState.updateTokenUsage(llmResult.usage);
    }

    // 完成当前请求的 Token 统计
    conversationState.finalizeCurrentRequest();

    // 将 LLM 响应添加到对话历史
    const assistantMessage = {
      role: 'assistant' as const,
      content: llmResult.content,
      toolCalls: llmResult.toolCalls?.map((tc: any) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.name,
          arguments: tc.arguments
        }
      }))
    };
    conversationState.addMessage(assistantMessage);

    // 触发消息添加事件
    await safeEmit(this.eventManager, {
      type: EventType.MESSAGE_ADDED,
      timestamp: now(),
      workflowId: '',
      threadId: threadId || '',
      nodeId,
      role: assistantMessage.role,
      content: assistantMessage.content,
      toolCalls: assistantMessage.toolCalls
    });

    // 检查是否有工具调用
    if (llmResult.toolCalls && llmResult.toolCalls.length > 0) {
      // 验证单次返回的工具调用数量
      const maxToolsPerResponse = maxToolCallsPerRequest ?? 3;
      if (llmResult.toolCalls.length > maxToolsPerResponse) {
        throw new ExecutionError(
          `LLM returned ${llmResult.toolCalls.length} tool calls, ` +
          `exceeds limit of ${maxToolsPerResponse}. ` +
          `Configure maxToolCallsPerRequest to adjust this limit.`,
          nodeId
        );
      }

      // 执行工具调用前检查中断
      if (this.shouldInterrupt(threadId)) {
        const threadContext = this.executionContext?.getThreadRegistry().get(threadId);
        const interruptionType = threadContext?.getShouldStop() ? 'STOP' : 'PAUSE';
        throw new ThreadInterruptedException(
          `LLM execution ${interruptionType.toLowerCase()} before tool calls`,
          interruptionType,
          threadId,
          nodeId
        );
      }

      // 创建工具调用执行器并执行工具调用（传递 AbortSignal）
      const toolCallExecutor = new ToolCallExecutor(this.toolService, this.eventManager);
      await this.executeToolCallsWithApproval(
        llmResult.toolCalls,
        conversationState,
        threadId,
        nodeId,
        params.workflowConfig,
        toolCallExecutor,
        { abortSignal }
      );
    }

    // 触发对话状态变化事件
    const finalTokenUsage = conversationState.getTokenUsage();
    await safeEmit(this.eventManager, {
      type: EventType.CONVERSATION_STATE_CHANGED,
      timestamp: now(),
      workflowId: '',
      threadId: threadId || '',
      nodeId,
      messageCount: conversationState.getMessages().length,
      tokenUsage: finalTokenUsage?.totalTokens || 0
    });

    // 返回最终内容
    return llmResult.content;
  }

  /**
   * 执行工具调用（带审批支持）
   *
   * @param toolCalls 工具调用数组
   * @param conversationState 对话管理器
   * @param threadId 线程ID
   * @param nodeId 节点ID
   * @param workflowConfig 工作流配置
   * @param toolCallExecutor 工具调用执行器
   * @param options 执行选项（包含 AbortSignal）
   */
  private async executeToolCallsWithApproval(
    toolCalls: Array<{ id: string; name: string; arguments: string }>,
    conversationState: ConversationManager,
    threadId: string,
    nodeId: string,
    workflowConfig: WorkflowConfig | undefined,
    toolCallExecutor: ToolCallExecutor,
    options?: { abortSignal?: AbortSignal }
  ): Promise<void> {
    for (const toolCall of toolCalls) {
      // 检查是否需要人工审批
      if (this.requiresHumanApproval(toolCall.name, workflowConfig)) {
        const approvalResult = await this.requestToolApproval(
          toolCall,
          workflowConfig?.toolApproval,
          threadId,
          nodeId,
          conversationState
        );

        if (!approvalResult.approved) {
          // 用户拒绝，跳过此工具调用
          const toolMessage = {
            role: 'tool' as const,
            content: JSON.stringify({
              error: 'Tool call was rejected by user approval',
              rejected: true
            }),
            toolCallId: toolCall.id
          };
          conversationState.addMessage(toolMessage);
          continue;
        }

        // 如果用户提供了编辑后的参数
        if (approvalResult.editedParameters) {
          toolCall.arguments = JSON.stringify(approvalResult.editedParameters);
        }

        // 如果用户提供了额外指令，添加到对话历史
        if (approvalResult.userInstruction) {
          conversationState.addMessage({
            role: 'user',
            content: approvalResult.userInstruction
          });
        }
      }

      // 执行工具调用（传递 AbortSignal）
      await toolCallExecutor.executeToolCalls(
        [toolCall],
        conversationState,
        threadId,
        nodeId,
        options
      );
    }
  }

  /**
   * 检查工具是否需要人工审批
   *
   * @param toolName 工具名称
   * @param workflowConfig 工作流配置
   * @returns 是否需要审批
   */
  private requiresHumanApproval(
    toolName: string,
    workflowConfig: WorkflowConfig | undefined
  ): boolean {
    // 如果没有配置审批，则不需要审批
    if (!workflowConfig?.toolApproval) {
      return false;
    }

    const autoApproved = workflowConfig.toolApproval.autoApprovedTools || [];
    return !autoApproved.includes(toolName);
  }

  /**
   * 请求工具审批
   *
   * @param toolCall 工具调用
   * @param approvalConfig 审批配置
   * @param threadId 线程ID
   * @param nodeId 节点ID
   * @param conversationState 对话管理器
   * @returns 审批结果
   */
  private async requestToolApproval(
    toolCall: { id: string; name: string; arguments: string },
    approvalConfig: any,
    threadId: string,
    nodeId: string,
    conversationState: ConversationManager
  ): Promise<ToolApprovalData> {
    const interactionId = generateId();
    const tool = this.toolService.getTool(toolCall.name);

    // 创建工具审批请求
    const toolApprovalData: ToolApprovalData = {
      toolName: toolCall.name,
      toolDescription: tool?.description || '',
      toolParameters: JSON.parse(toolCall.arguments),
      approved: false
    };

    // 如果有执行上下文，创建检查点以支持长时间审批
    let checkpointId: string | undefined;
    if (this.executionContext) {
      try {
        const dependencies = {
          threadRegistry: this.executionContext.getThreadRegistry(),
          checkpointStateManager: this.executionContext.getCheckpointStateManager(),
          workflowRegistry: this.executionContext.getWorkflowRegistry(),
          globalMessageStorage: globalMessageStorage
        };
        checkpointId = await CheckpointCoordinator.createCheckpoint(threadId, dependencies, {
          description: 'Waiting for tool approval',
          customFields: {
            toolApprovalState: {
              pendingToolCall: toolCall,
              interactionId
            }
          }
        });
      } catch (error) {
        // 检查点创建失败不影响审批流程
        console.warn('Failed to create checkpoint for tool approval:', error);
      }
    }

    try {
      // 触发USER_INTERACTION_REQUESTED事件
      await safeEmit(this.eventManager, {
        type: EventType.USER_INTERACTION_REQUESTED,
        timestamp: now(),
        workflowId: '',
        threadId,
        nodeId,
        interactionId,
        operationType: UserInteractionOperationType.TOOL_APPROVAL,
        prompt: `是否批准调用工具 "${toolCall.name}"?`,
        timeout: approvalConfig?.approvalTimeout || 0, // 使用配置的超时时间，默认无限等待
        metadata: {
          toolApproval: toolApprovalData
        }
      });

      // 等待USER_INTERACTION_RESPONDED事件
      const response = await this.waitForUserInteractionResponse(
        interactionId,
        approvalConfig?.approvalTimeout || 0
      );

      // 解析审批结果
      const approvalResult = response.inputData as ToolApprovalData;

      // 触发USER_INTERACTION_PROCESSED事件
      await safeEmit(this.eventManager, {
        type: EventType.USER_INTERACTION_PROCESSED,
        timestamp: now(),
        workflowId: '',
        threadId,
        interactionId,
        operationType: UserInteractionOperationType.TOOL_APPROVAL,
        results: approvalResult
      });

      return approvalResult;
    } finally {
      // 清理检查点（如果存在）
      if (checkpointId && this.executionContext) {
        try {
          const checkpointStateManager = this.executionContext.getCheckpointStateManager();
          await checkpointStateManager.delete(checkpointId);
        } catch (error) {
          console.warn('Failed to cleanup checkpoint:', error);
        }
      }
    }
  }

  /**
   * 等待用户交互响应
   *
   * @param interactionId 交互ID
   * @param timeoutMs 超时时间（毫秒），0 表示无限等待
   * @returns 用户响应事件
   */
  private waitForUserInteractionResponse(
    interactionId: string,
    timeoutMs: number = 0
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | null = null;

      const handler = (event: any) => {
        if (event.interactionId === interactionId) {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          this.eventManager.off(EventType.USER_INTERACTION_RESPONDED, handler);
          resolve(event);
        }
      };

      // 只有当 timeoutMs > 0 时才设置超时
      if (timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          this.eventManager.off(EventType.USER_INTERACTION_RESPONDED, handler);
          reject(new Error(`User interaction timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      }

      this.eventManager.on(EventType.USER_INTERACTION_RESPONDED, handler);
    });
  }

  /**
   * 获取可用工具schema（包含静态和动态工具）
   */
  private getAvailableTools(workflowTools: Set<string>, dynamicTools?: any): any[] {
    const allToolIds = new Set(workflowTools);

    // 添加动态工具
    if (dynamicTools?.toolIds) {
      dynamicTools.toolIds.forEach((id: string) => allToolIds.add(id));
    }

    return Array.from(allToolIds)
      .map(id => this.toolService.getTool(id))
      .filter(Boolean)
      .filter((tool): tool is NonNullable<typeof tool> => tool != null)
      .map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }));
  }
}
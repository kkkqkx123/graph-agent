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
 * - 依赖注入：通过 LLMContextFactory 管理依赖
 * - 职责分离：将具体执行逻辑委托给专门组件
 */

import type { LLMMessage, ID } from '@modular-agent/types';
import { MessageRole } from '@modular-agent/types';
import type { WorkflowConfig } from '@modular-agent/types';
import { ConversationManager } from '../managers/conversation-manager.js';
import type { EventManager } from '../../services/event-manager.js';
import { safeEmit } from '../utils/event/event-emitter.js';
import type { ToolApprovalData } from '@modular-agent/types';
import { generateId } from '../../../utils/index.js';
import { now, getErrorOrNew } from '@modular-agent/common-utils';
import { ExecutionError } from '@modular-agent/types';
import { CheckpointCoordinator } from './checkpoint-coordinator.js';
import { InterruptionDetectorImpl } from '../managers/interruption-detector.js';
import { checkInterruption, shouldContinue, getInterruptionDescription } from '@modular-agent/common-utils';
import type { InterruptionCheckResult } from '@modular-agent/common-utils';
import { createContextualLogger } from '../../../utils/contextual-logger.js';
import {
  buildMessageAddedEvent,
  buildTokenUsageWarningEvent,
  buildConversationStateChangedEvent,
  buildUserInteractionRequestedEvent,
  buildUserInteractionProcessedEvent
} from '../utils/event/event-builder.js';
import { LLMContextFactory, type LLMContextFactoryConfig } from '../factories/llm-context-factory.js';
import { ToolCallExecutor } from '../executors/tool-call-executor.js';

const logger = createContextualLogger();

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
 * - 使用 LLMContextFactory 管理依赖
 */
export class LLMExecutionCoordinator {
  /** 上下文工厂 */
  private contextFactory: LLMContextFactory;

  /** 中断检测器（延迟初始化） */
  private interruptionDetector?: any;

  /**
   * 构造函数（使用工厂配置）
   *
   * @param config 工厂配置
   */
  constructor(config: LLMContextFactoryConfig) {
    // 创建上下文工厂
    this.contextFactory = new LLMContextFactory(config);

    // 延迟初始化中断检测器
    if (config.interruptionDetector) {
      this.interruptionDetector = config.interruptionDetector;
    } else if (config.threadRegistry) {
      this.interruptionDetector = new InterruptionDetectorImpl(config.threadRegistry);
    }
  }

  /**
   * 获取上下文工厂（供外部访问依赖）
   */
  getContextFactory(): LLMContextFactory {
    return this.contextFactory;
  }

  /**
   * 检查是否已中止
   *
   * @param threadId Thread ID
   * @returns 是否已中止
   */
  isAborted(threadId: string): boolean {
    if (this.interruptionDetector) {
      return this.interruptionDetector.isAborted(threadId);
    }

    // 向后兼容：如果没有提供 interruptionDetector，使用旧的方式
    const threadRegistry = this.contextFactory.getThreadRegistry();
    if (!threadRegistry) {
      return false;
    }

    const threadEntity = threadRegistry.get(threadId);
    if (!threadEntity) {
      return false;
    }

    return threadEntity.getAbortSignal().aborted;
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
    // 执行完整的 LLM-工具调用循环
    const result = await this.executeLLMLoop(params, conversationState);

    // 检查是否是中断状态
    if (typeof result !== 'string') {
      // 是中断状态
      return {
        success: false,
        error: new Error(getInterruptionDescription(result))
      };
    }

    // 正常返回
    return {
      success: true,
      content: result,
      messages: conversationState.getMessages()
    };
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
  * @returns LLM 响应内容或中断状态
  */
  private async executeLLMLoop(
    params: LLMExecutionParams,
    conversationState: ConversationManager
  ): Promise<string | InterruptionCheckResult> {
    const {
      prompt, profileId, parameters, tools,
      maxToolCallsPerRequest,
      threadId, nodeId
    } = params;

    // 获取 AbortSignal
    const threadRegistry = this.contextFactory.getThreadRegistry();
    const threadEntity = threadRegistry?.get(threadId);
    const abortSignal = threadEntity?.getAbortSignal();

    // 使用返回值标记体系检查中断
    if (abortSignal) {
      const interruption = checkInterruption(abortSignal);
      if (!shouldContinue(interruption)) {
        return interruption;
      }
    }

    // 步骤1：添加用户消息
    const userMessage = {
      role: 'user' as MessageRole,
      content: prompt
    };
    conversationState.addMessage(userMessage);

    // 触发消息添加事件
    const userMessageEvent = buildMessageAddedEvent({
      threadId: threadId || '',
      role: userMessage.role,
      content: userMessage.content,
      nodeId
    });
    await safeEmit(this.contextFactory.getEventManager(), userMessageEvent);

    // 检查 Token 使用情况
    await conversationState.checkTokenUsage();

    // 检查 Token 使用警告
    const tokenUsage = conversationState.getTokenUsage();
    if (tokenUsage) {
      const tokenLimit = 100000; // 使用固定限制或从配置获取
      const usagePercentage = (tokenUsage.totalTokens / tokenLimit) * 100;

      // 当使用量超过 80% 时触发警告
      if (usagePercentage > 80) {
        const warningEvent = buildTokenUsageWarningEvent({
          threadId: threadId || '',
          tokensUsed: tokenUsage.totalTokens,
          tokenLimit,
          usagePercentage
        });
        await safeEmit(this.contextFactory.getEventManager(), warningEvent);
      }
    }

    // 从工具上下文管理器获取可用工具
    let availableToolSchemas = tools;
    const toolContextManager = this.contextFactory.getToolContextManager();
    if (toolContextManager) {
      if (toolContextManager) {
        const availableToolIds = toolContextManager.getTools(threadId);

        if (availableToolIds.size > 0) {
          const toolService = this.contextFactory.getToolService();
          const availableTools = Array.from(availableToolIds as Set<string>)
            .map((id) => toolService.getTool(id) as any)
            .filter(Boolean);

          // 直接转换为ToolSchema格式（由外部模块负责，符合设计文档）
          availableToolSchemas = availableTools.map(tool => ({
            id: tool.id,
            description: tool.description,
            parameters: tool.parameters
          }));
        }
      }
    }

    // 执行 LLM 调用前再次检查中断
    if (abortSignal) {
      const interruption = checkInterruption(abortSignal);
      if (!shouldContinue(interruption)) {
        return interruption;
      }
    }

    // 执行 LLM 调用（传递 AbortSignal）
    const llmResult = await this.contextFactory.getLLMExecutor().executeLLMCall(
      conversationState.getMessages(),
      {
        prompt,
        profileId: profileId || 'DEFAULT',
        parameters: parameters || {},
        tools: availableToolSchemas
      },
      { abortSignal }
    );

    // 检查是否是中断状态
    if (!llmResult.success) {
      return (llmResult as { success: false; interruption: InterruptionCheckResult }).interruption;
    }

    const result = llmResult.result;

    // 更新 Token 使用统计
    if (result.usage) {
      conversationState.updateTokenUsage(result.usage);
    }

    // 完成当前请求的 Token 统计
    conversationState.finalizeCurrentRequest();

    // 将 LLM 响应添加到对话历史
    const assistantMessage = {
      role: 'assistant' as MessageRole,
      content: result.content,
      toolCalls: result.toolCalls?.map((tc: any) => ({
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
    const assistantMessageEvent = buildMessageAddedEvent({
      threadId: threadId || '',
      role: assistantMessage.role,
      content: assistantMessage.content,
      nodeId
    });
    await safeEmit(this.contextFactory.getEventManager(), assistantMessageEvent);

    // 检查是否有工具调用
    if (result.toolCalls && result.toolCalls.length > 0) {
      // 验证单次返回的工具调用数量
      const maxToolsPerResponse = maxToolCallsPerRequest ?? 3;
      if (result.toolCalls.length > maxToolsPerResponse) {
        throw new ExecutionError(
          `LLM returned ${result.toolCalls.length} tool calls, ` +
          `exceeds limit of ${maxToolsPerResponse}. ` +
          `Configure maxToolCallsPerRequest to adjust this limit.`,
          nodeId
        );
      }

      // 执行工具调用前检查中断
      if (abortSignal) {
        const interruption = checkInterruption(abortSignal);
        if (!shouldContinue(interruption)) {
          return interruption;
        }
      }

      // 使用注入的工具调用执行器执行工具调用（传递 AbortSignal）
      await this.executeToolCallsWithApproval(
        result.toolCalls,
        conversationState,
        threadId,
        nodeId,
        params.workflowConfig,
        this.contextFactory.getToolCallExecutor(),
        { abortSignal }
      );
    }

    // 触发对话状态变化事件
    const finalTokenUsage = conversationState.getTokenUsage();
    const stateChangedEvent = buildConversationStateChangedEvent({
      threadId: threadId || '',
      messageCount: conversationState.getMessages().length,
      tokenUsage: finalTokenUsage?.totalTokens || 0,
      nodeId
    });
    await safeEmit(this.contextFactory.getEventManager(), stateChangedEvent);

    // 返回最终内容
    return result.content;
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
            role: 'tool' as MessageRole,
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
            role: 'user' as MessageRole,
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
   * @param toolId 工具ID
   * @param workflowConfig 工作流配置
   * @returns 是否需要审批
   */
  private requiresHumanApproval(
    toolId: ID,
    workflowConfig: WorkflowConfig | undefined
  ): boolean {
    // 如果没有配置审批，则不需要审批
    if (!workflowConfig?.toolApproval) {
      return false;
    }

    const autoApproved = workflowConfig.toolApproval.autoApprovedTools || [];
    return !autoApproved.includes(toolId);
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
    const tool = this.contextFactory.getToolService().getTool(toolCall.id);

    // 创建工具审批请求
    const toolApprovalData: ToolApprovalData = {
      toolId: toolCall.id,
      toolDescription: tool?.description || '',
      toolParameters: JSON.parse(toolCall.arguments),
      approved: false
    };

    // 如果有执行上下文，创建检查点以支持长时间审批
    let checkpointId: string | undefined;
    if (this.contextFactory.hasToolApprovalSupport()) {
      try {
        const approvalContext = this.contextFactory.createToolApprovalContext(threadId, nodeId);
        if (approvalContext.workflowRegistry && approvalContext.graphRegistry) {
          const dependencies = {
            threadRegistry: approvalContext.threadRegistry,
            checkpointStateManager: approvalContext.checkpointStateManager,
            workflowRegistry: approvalContext.workflowRegistry,
            graphRegistry: approvalContext.graphRegistry
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
        }
      } catch (error) {
        // 记录警告日志，不中断执行
        logger.warn(
          'Failed to create checkpoint for tool approval',
          {
            operation: 'create_checkpoint',
            toolCallId: toolCall.id,
            threadId,
            nodeId
          },
          undefined,
          getErrorOrNew(error)
        );
      }
    }

    try {
      // 触发USER_INTERACTION_REQUESTED事件
      const requestedEvent = buildUserInteractionRequestedEvent({
        threadId,
        nodeId,
        interactionId,
        operationType: 'TOOL_APPROVAL',
        prompt: `是否批准调用工具 "${toolCall.id}"?`,
        timeout: approvalConfig?.approvalTimeout || 0
      });
      await safeEmit(this.contextFactory.getEventManager(), requestedEvent);

      // 等待USER_INTERACTION_RESPONDED事件
      const response = await this.waitForUserInteractionResponse(
        interactionId,
        approvalConfig?.approvalTimeout || 0
      );

      // 解析审批结果
      const approvalResult = response.inputData as ToolApprovalData;

      // 触发USER_INTERACTION_PROCESSED事件
      const processedEvent = buildUserInteractionProcessedEvent({
        threadId,
        interactionId,
        operationType: 'TOOL_APPROVAL',
        results: approvalResult
      });
      await safeEmit(this.contextFactory.getEventManager(), processedEvent);

      return approvalResult;
    } finally {
      // 清理检查点（如果存在）
      const checkpointStateManager = this.contextFactory.getCheckpointStateManager();
      if (checkpointId && checkpointStateManager) {
        try {
          await checkpointStateManager.delete(checkpointId);
        } catch (error) {
          // 记录警告日志，不中断执行
          logger.warn(
            'Failed to cleanup checkpoint',
            {
              operation: 'cleanup_checkpoint',
              checkpointId,
              threadId,
              nodeId
            },
            undefined,
            getErrorOrNew(error)
          );
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
      const eventManager = this.contextFactory.getEventManager();

      const handler = (event: any) => {
        if (event.interactionId === interactionId) {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          eventManager.off('USER_INTERACTION_RESPONDED', handler);
          resolve(event);
        }
      };

      // 只有当 timeoutMs > 0 时才设置超时
      if (timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          eventManager.off('USER_INTERACTION_RESPONDED', handler);
          reject(new Error(`User interaction timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      }

      eventManager.on('USER_INTERACTION_RESPONDED', handler);
    });
  }

}
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

import type { LLMMessage, ID } from '@modular-agent/types';
import { MessageRole } from '@modular-agent/types';
import type { WorkflowConfig } from '@modular-agent/types';
import { ConversationManager } from '../managers/conversation-manager.js';
import { LLMExecutor } from '../executors/llm-executor.js';
import { type ToolService } from '../../services/tool-service.js';
import type { EventManager } from '../../services/event-manager.js';
import { safeEmit } from '../utils/event/event-emitter.js';
import type { ToolApprovalData } from '@modular-agent/types';
import { generateId } from '../../../utils/index.js';
import { now, getErrorOrNew } from '@modular-agent/common-utils';
import { ToolCallExecutor } from '../executors/tool-call-executor.js';
import { ExecutionError, SystemExecutionError } from '@modular-agent/types';
import { CheckpointCoordinator } from './checkpoint-coordinator.js';
import type { ThreadRegistry } from '../../services/thread-registry.js';
import type { InterruptionDetector } from '../managers/interruption-detector.js';
import { InterruptionDetectorImpl } from '../managers/interruption-detector.js';
import { checkInterruption, shouldContinue, getInterruptionDescription } from '@modular-agent/common-utils';
import type { InterruptionCheckResult } from '@modular-agent/common-utils';
import { createContextualLogger } from '../../../utils/contextual-logger.js';

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
 * - 依赖注入
 */
export class LLMExecutionCoordinator {
  private interruptionDetector?: InterruptionDetector;
  private threadRegistry?: ThreadRegistry;
  private checkpointStateManager?: any;
  private workflowRegistry?: any;
  private graphRegistry?: any;
  private toolContextManager?: any;
  private toolVisibilityCoordinator?: any;

  constructor(
    private llmExecutor: LLMExecutor,
    private toolService: ToolService,
    private eventManager: EventManager,
    threadRegistry?: ThreadRegistry,
    interruptionDetector?: InterruptionDetector,
    checkpointStateManager?: any,
    workflowRegistry?: any,
    graphRegistry?: any,
    toolContextManager?: any,
    toolVisibilityCoordinator?: any
  ) {
    this.threadRegistry = threadRegistry;
    this.checkpointStateManager = checkpointStateManager;
    this.workflowRegistry = workflowRegistry;
    this.graphRegistry = graphRegistry;
    this.toolContextManager = toolContextManager;
    this.toolVisibilityCoordinator = toolVisibilityCoordinator;
    
    if (interruptionDetector) {
      this.interruptionDetector = interruptionDetector;
    } else if (threadRegistry) {
      this.interruptionDetector = new InterruptionDetectorImpl(threadRegistry);
    }
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
    if (!this.threadRegistry) {
      return false;
    }

    const threadEntity = this.threadRegistry.get(threadId);
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
    const threadEntity = this.threadRegistry?.get(threadId);
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
    await safeEmit(this.eventManager, {
      type: 'MESSAGE_ADDED',
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
          type: 'TOKEN_USAGE_WARNING',
          timestamp: now(),
          workflowId: '',
          threadId: threadId || '',
          tokensUsed: tokenUsage.totalTokens,
          tokenLimit,
          usagePercentage
        });
      }
    }

    // 从工具上下文管理器获取可用工具
    let availableToolSchemas = tools;
    if (this.toolContextManager) {
      if (this.toolContextManager) {
        const availableToolIds = this.toolContextManager.getTools(threadId);

        if (availableToolIds.size > 0) {
          const availableTools = Array.from(availableToolIds as Set<string>)
            .map((id) => this.toolService.getTool(id) as any)
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
    const llmResult = await this.llmExecutor.executeLLMCall(
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
      return llmResult.interruption;
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
    await safeEmit(this.eventManager, {
      type: 'MESSAGE_ADDED',
      timestamp: now(),
      workflowId: '',
      threadId: threadId || '',
      nodeId,
      role: assistantMessage.role,
      content: assistantMessage.content,
      toolCalls: assistantMessage.toolCalls
    });

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

      // 创建工具调用执行器并执行工具调用（传递 AbortSignal）
      const toolCallExecutor = new ToolCallExecutor(
        this.toolService,
        this.eventManager,
        undefined,
        this.toolVisibilityCoordinator
      );
      await this.executeToolCallsWithApproval(
        result.toolCalls,
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
      type: 'CONVERSATION_STATE_CHANGED',
      timestamp: now(),
      workflowId: '',
      threadId: threadId || '',
      nodeId,
      messageCount: conversationState.getMessages().length,
      tokenUsage: finalTokenUsage?.totalTokens || 0
    });

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
    const tool = this.toolService.getTool(toolCall.id);

    // 创建工具审批请求
    const toolApprovalData: ToolApprovalData = {
      toolId: toolCall.id,
      toolDescription: tool?.description || '',
      toolParameters: JSON.parse(toolCall.arguments),
      approved: false
    };

    // 如果有执行上下文，创建检查点以支持长时间审批
    let checkpointId: string | undefined;
    if (this.threadRegistry && this.checkpointStateManager && this.workflowRegistry && this.graphRegistry) {
      try {
        const dependencies = {
          threadRegistry: this.threadRegistry,
          checkpointStateManager: this.checkpointStateManager,
          workflowRegistry: this.workflowRegistry,
          graphRegistry: this.graphRegistry
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
      await safeEmit(this.eventManager, {
        type: 'USER_INTERACTION_REQUESTED',
        timestamp: now(),
        workflowId: '',
        threadId,
        nodeId,
        interactionId,
        operationType: 'TOOL_APPROVAL',
        prompt: `是否批准调用工具 "${toolCall.id}"?`,
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
        type: 'USER_INTERACTION_PROCESSED',
        timestamp: now(),
        workflowId: '',
        threadId,
        interactionId,
        operationType: 'TOOL_APPROVAL',
        results: approvalResult
      });

      return approvalResult;
    } finally {
      // 清理检查点（如果存在）
      if (checkpointId && this.checkpointStateManager) {
        try {
          const checkpointStateManager = this.checkpointStateManager;
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

      const handler = (event: any) => {
        if (event.interactionId === interactionId) {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          this.eventManager.off('USER_INTERACTION_RESPONDED', handler);
          resolve(event);
        }
      };

      // 只有当 timeoutMs > 0 时才设置超时
      if (timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          this.eventManager.off('USER_INTERACTION_RESPONDED', handler);
          reject(new Error(`User interaction timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      }

      this.eventManager.on('USER_INTERACTION_RESPONDED', handler);
    });
  }

}
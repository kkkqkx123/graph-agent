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

import type { LLMMessage } from '../../../types/llm';
import { ConversationManager } from '../managers/conversation-manager';
import { LLMExecutor } from '../executors/llm-executor';
import { type ToolService } from '../../services/tool-service';
import type { EventManager } from '../../services/event-manager';
import { safeEmit } from '../utils/event/event-emitter';
import { EventType } from '../../../types/events';
import { now } from '../../../utils';
import { ToolCallExecutor } from '../executors/tool-call-executor';
import { TokenUsageTracker } from '../token-usage-tracker';
import { ExecutionError } from '../../../types/errors';

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
  constructor(
    private llmExecutor: LLMExecutor,
    private toolService: ToolService = toolService,
    private eventManager?: EventManager
  ) { }

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

    // 步骤1：添加用户消息
    const userMessage = {
      role: 'user' as const,
      content: prompt
    };
    conversationState.addMessage(userMessage);

    // 触发消息添加事件
    if (this.eventManager) {
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
    }

    // 检查 Token 使用情况
    await conversationState.checkTokenUsage();

    // 检查 Token 使用警告
    const tokenUsage = conversationState.getTokenUsage();
    if (tokenUsage && this.eventManager) {
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

    // 执行 LLM 调用
    const llmResult = await this.llmExecutor.executeLLMCall(
      conversationState.getMessages(),
      {
        prompt,
        profileId: profileId || 'default',
        parameters: parameters || {},
        tools: availableTools
      }
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
    if (this.eventManager) {
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
    }

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

      // 创建工具调用执行器并执行工具调用
      const toolCallExecutor = new ToolCallExecutor(this.toolService, this.eventManager);
      await toolCallExecutor.executeToolCalls(
        llmResult.toolCalls,
        conversationState,
        threadId,
        nodeId
      );
    }

    // 触发对话状态变化事件
    if (this.eventManager) {
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
    }

    // 返回最终内容
    return llmResult.content;
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
      .map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }));
  }
}
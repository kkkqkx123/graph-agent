/**
 * 对话管理器
 * 管理LLM交互、工具调用、消息历史
 */

import type { LLMMessage, LLMResult, LLMUsage } from '../../types/llm';
import type { ToolExecutionResult } from '../tools/executor-base';
import { ToolService } from '../tools/tool-service';
import { LLMWrapper } from './wrapper';

/**
 * Conversation事件回调
 */
export interface ConversationEventCallbacks {
  /** Token超过限制时的回调 */
  onTokenLimitExceeded?: (tokensUsed: number, tokenLimit: number) => void | Promise<void>;
}

/**
 * Conversation配置选项
 */
export interface ConversationOptions {
  /** Token限制阈值，超过此值触发压缩事件 */
  tokenLimit?: number;
  /** 事件回调 */
  eventCallbacks?: ConversationEventCallbacks;
}

/**
 * Token使用统计
 */
interface TokenUsageStats {
  /** 提示Token数 */
  promptTokens: number;
  /** 完成Token数 */
  completionTokens: number;
  /** 总Token数 */
  totalTokens: number;
  /** 原始API响应的详细信息 */
  rawUsage?: any;
}

/**
 * 对话管理器类
 * 
 * 核心职责：
 * 1. 消息历史管理
 * 2. 单次LLM调用执行
 * 3. 工具调用执行
 * 4. Token统计和压缩事件触发
 * 
 * 重要说明：
 * - Conversation只管理LLM交互，不负责终止、循环等逻辑
 * - 消息压缩由执行引擎通过事件驱动管理，Conversation只负责检测和触发事件
 * - LLM Node、Human Interaction Node、Tool Node托管给Conversation
 */
export class Conversation {
  private messages: LLMMessage[] = [];
  private llmWrapper: LLMWrapper;
  private toolService: ToolService;
  private tokenLimit: number;
  private tokenUsage: TokenUsageStats | null = null;
  private eventCallbacks?: ConversationEventCallbacks;

  /**
   * 构造函数
   * @param llmWrapper LLM包装器
   * @param toolService 工具服务
   * @param options 配置选项
   */
  constructor(
    llmWrapper: LLMWrapper,
    toolService: ToolService,
    options: ConversationOptions = {}
  ) {
    this.llmWrapper = llmWrapper;
    this.toolService = toolService;
    this.tokenLimit = options.tokenLimit || 4000;
    this.eventCallbacks = options.eventCallbacks;
  }

  /**
   * 添加消息
   * @param message 消息对象
   * @returns 添加后的消息数组长度
   */
  addMessage(message: LLMMessage): number {
    // 验证消息格式
    if (!message.role || !message.content) {
      throw new Error('Invalid message format: role and content are required');
    }

    // 将消息追加到数组末尾
    this.messages.push({ ...message });

    return this.messages.length;
  }

  /**
   * 批量添加消息
   * @param messages 消息数组
   * @returns 添加后的消息数组长度
   */
  addMessages(...messages: LLMMessage[]): number {
    for (const message of messages) {
      this.addMessage(message);
    }
    return this.messages.length;
  }

  /**
   * 获取当前消息历史
   * @returns 消息数组的副本
   */
  getMessages(): LLMMessage[] {
    return [...this.messages];
  }

  /**
   * 清空消息历史
   * @param keepSystemMessage 是否保留系统消息
   */
  clearMessages(keepSystemMessage: boolean = true): void {
    if (keepSystemMessage && this.messages.length > 0) {
      const firstMessage = this.messages[0]!;
      if (firstMessage.role === 'system') {
        // 保留系统消息
        this.messages = [firstMessage];
      } else {
        // 清空所有消息
        this.messages = [];
      }
    } else {
      // 清空所有消息
      this.messages = [];
    }
  }

  /**
   * 执行单次LLM调用（非流式）
   * @returns LLM响应结果
   */
  async executeLLMCall(): Promise<LLMResult> {
    // 检查Token使用情况
    await this.checkTokenUsage();

    // 构建LLM请求
    const request = {
      messages: this.messages,
      tools: this.getAvailableTools()
    };

    try {
      // 调用LLM
      const result = await this.llmWrapper.generate(request);

      // 更新Token使用统计
      this.updateTokenUsage(result.usage);

      // 将LLM响应转换为助手消息并添加到历史
      const assistantMessage: LLMMessage = {
        role: 'assistant',
        content: result.content,
        toolCalls: result.toolCalls
      };
      this.messages.push(assistantMessage);

      return result;
    } catch (error) {
      throw new Error(`LLM call failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 执行单次LLM调用（流式）
   * @returns LLM响应结果流
   */
  async *executeLLMCallStream(): AsyncIterable<LLMResult> {
    // 检查Token使用情况
    await this.checkTokenUsage();

    // 构建LLM请求
    const request = {
      messages: this.messages,
      tools: this.getAvailableTools(),
      stream: true
    };

    try {
      let finalResult: LLMResult | null = null;

      // 调用LLM流式接口
      for await (const chunk of this.llmWrapper.generateStream(request)) {
        if (chunk.finishReason) {
          finalResult = chunk;
        }
        yield chunk;
      }

      // 更新Token使用统计
      if (finalResult?.usage) {
        this.updateTokenUsage(finalResult.usage);
      }

      // 将LLM响应转换为助手消息并添加到历史
      if (finalResult) {
        const assistantMessage: LLMMessage = {
          role: 'assistant',
          content: finalResult.content,
          toolCalls: finalResult.toolCalls
        };
        this.messages.push(assistantMessage);
      }
    } catch (error) {
      throw new Error(`LLM stream call failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 执行工具调用（通过LLMToolCall）
   * @param toolCall 工具调用对象
   * @returns 工具执行结果
   */
  async executeToolCall(toolCall: { id: string; function: { name: string; arguments: string } }): Promise<ToolExecutionResult> {
    try {
      // 解析参数
      const parameters = JSON.parse(toolCall.function.arguments);
      
      // 调用工具服务执行工具
      const result = await this.toolService.execute(toolCall.function.name, parameters);

      // 将执行结果转换为工具消息并添加到历史
      const toolMessage: LLMMessage = {
        role: 'tool',
        content: result.success ? JSON.stringify(result.result) : JSON.stringify({ error: result.error }),
        toolCallId: toolCall.id
      };
      this.messages.push(toolMessage);

      return result;
    } catch (error) {
      // 捕获异常，将错误信息作为工具结果返回
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // 将错误信息转换为工具消息
      const toolMessage: LLMMessage = {
        role: 'tool',
        content: JSON.stringify({ error: errorMessage }),
        toolCallId: toolCall.id
      };
      this.messages.push(toolMessage);

      return {
        success: false,
        error: errorMessage,
        executionTime: 0,
        retryCount: 0
      };
    }
  }

  /**
   * 执行工具调用（通过工具名称和参数）
   * @param toolName 工具名称
   * @param parameters 工具参数
   * @returns 工具执行结果
   */
  async executeToolCallByName(toolName: string, parameters: Record<string, any>): Promise<ToolExecutionResult> {
    try {
      // 调用工具服务执行工具
      const result = await this.toolService.execute(toolName, parameters);

      // 将执行结果转换为工具消息并添加到历史
      const toolMessage: LLMMessage = {
        role: 'tool',
        content: result.success ? JSON.stringify(result.result) : JSON.stringify({ error: result.error }),
        toolCallId: toolName
      };
      this.messages.push(toolMessage);

      return result;
    } catch (error) {
      // 捕获异常，将错误信息作为工具结果返回
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // 将错误信息转换为工具消息
      const toolMessage: LLMMessage = {
        role: 'tool',
        content: JSON.stringify({ error: errorMessage }),
        toolCallId: toolName
      };
      this.messages.push(toolMessage);

      return {
        success: false,
        error: errorMessage,
        executionTime: 0,
        retryCount: 0
      };
    }
  }

  /**
   * 批量执行工具调用（通过LLMToolCall）
   * @param toolCalls 工具调用数组
   * @returns 执行结果数组
   */
  async executeToolCalls(toolCalls: Array<{ id: string; function: { name: string; arguments: string } }>): Promise<ToolExecutionResult[]> {
    // 并行执行所有工具调用
    const results = await Promise.all(
      toolCalls.map(call => this.executeToolCall(call))
    );

    return results;
  }

  /**
   * 检查Token使用情况，触发压缩事件
   */
  async checkTokenUsage(): Promise<void> {
    const tokensUsed = this.estimateTokenUsage();

    // 如果超过限制，触发Token限制事件
    if (tokensUsed > this.tokenLimit) {
      await this.triggerTokenLimitEvent(tokensUsed);
    }
  }

  /**
   * 估算Token使用情况
   * @returns Token数量
   */
  private estimateTokenUsage(): number {
    // 优先使用API响应的Token统计
    if (this.tokenUsage) {
      return this.tokenUsage.totalTokens;
    }

    // 使用本地估算方法
    return this.estimateTokensLocally();
  }

  /**
   * 本地估算Token数量
   * @returns Token数量
   */
  private estimateTokensLocally(): number {
    let totalChars = 0;

    for (const message of this.messages) {
      if (typeof message.content === 'string') {
        totalChars += message.content.length;
      } else if (Array.isArray(message.content)) {
        // 处理数组内容
        for (const item of message.content) {
          if (typeof item === 'string') {
            totalChars += item.length;
          } else if (typeof item === 'object' && item !== null) {
            totalChars += JSON.stringify(item).length;
          }
        }
      }
    }

    // 粗略估算：平均每个Token约2.5个字符
    return Math.ceil(totalChars / 2.5);
  }

  /**
   * 更新Token使用统计
   * @param usage Token使用数据
   */
  private updateTokenUsage(usage?: LLMUsage): void {
    if (!usage) {
      return;
    }

    this.tokenUsage = {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      rawUsage: usage
    };
  }

  /**
   * 获取Token使用统计
   * @returns Token使用统计
   */
  getTokenUsage(): TokenUsageStats | null {
    return this.tokenUsage ? { ...this.tokenUsage } : null;
  }

  /**
   * 获取最近N条消息
   * @param n 消息数量
   * @returns 消息数组
   */
  getRecentMessages(n: number): LLMMessage[] {
    if (n >= this.messages.length) {
      return this.getMessages();
    }

    return this.messages.slice(-n).map(msg => ({ ...msg }));
  }

  /**
   * 按角色过滤消息
   * @param role 消息角色
   * @returns 消息数组
   */
  filterMessagesByRole(role: string): LLMMessage[] {
    return this.messages
      .filter(msg => msg.role === role)
      .map(msg => ({ ...msg }));
  }

  /**
   * 获取可用工具定义
   * @returns 工具定义数组
   */
  private getAvailableTools(): any[] {
    // 从工具服务获取所有可用工具
    const tools = this.toolService.listTools();

    // 转换为LLM需要的格式
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }

  /**
   * 触发Token限制事件
   * @param tokensUsed 当前使用的Token数量
   */
  private async triggerTokenLimitEvent(tokensUsed: number): Promise<void> {
    if (this.eventCallbacks?.onTokenLimitExceeded) {
      try {
        await this.eventCallbacks.onTokenLimitExceeded(tokensUsed, this.tokenLimit);
      } catch (error) {
        console.error('Error in onTokenLimitExceeded callback:', error);
      }
    } else {
      // 如果没有回调，记录警告
      console.warn(`Token limit exceeded: ${tokensUsed} > ${this.tokenLimit}`);
    }
  }

  /**
   * 克隆 Conversation 实例
   * 创建一个包含相同消息历史和配置的新 Conversation 实例
   * @returns 克隆的 Conversation 实例
   */
  clone(): Conversation {
    // 创建新的 Conversation 实例
    const clonedConversation = new Conversation(
      this.llmWrapper,
      this.toolService,
      {
        tokenLimit: this.tokenLimit,
        eventCallbacks: this.eventCallbacks
      }
    );

    // 复制所有消息历史
    clonedConversation.messages = this.messages.map(msg => ({ ...msg }));

    // 复制 token 使用统计
    if (this.tokenUsage) {
      clonedConversation.tokenUsage = { ...this.tokenUsage };
    }

    return clonedConversation;
  }
}

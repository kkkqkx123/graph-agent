/**
 * LLM执行器
 * 负责协调LLM调用和工具执行的循环
 * 
 * 核心职责：
 * 1. 执行LLM调用（非流式和流式）
 * 2. 执行工具调用
 * 3. 管理工具调用循环
 * 4. 协调ConversationManager的状态更新
 */

import type { LLMMessage, LLMToolCall, LLMResult, LLMUsage } from '../../types/llm';
import type { ToolExecutionResult } from '../tools/base-tool-executor';
import { ConversationManager } from './managers/conversation-manager';
import { LLMWrapper } from '../llm/wrapper';
import { ToolService } from '../tools/tool-service';
import { ExecutionError } from '../../types/errors';

/**
 * LLM执行器回调
 */
export interface LLMExecutorCallbacks {
  /** 工具调用回调 */
  onToolCall?: (toolCall: LLMToolCall) => void;
  /** 工具结果回调 */
  onToolResult?: (result: any) => void;
  /** 迭代回调 */
  onIteration?: (iteration: number, message: LLMMessage) => void;
}

/**
 * LLM执行器配置选项
 */
export interface LLMExecutorOptions {
  /** 最大迭代次数，Infinity 表示不限制 */
  maxIterations?: number;
  /** 回调函数 */
  callbacks?: LLMExecutorCallbacks;
}

/**
 * Promise.withResolvers 辅助函数
 */
function promiseWithResolvers<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * LLM执行器类
 */
export class LLMExecutor implements AsyncIterable<LLMMessage> {
  private conversationManager: ConversationManager;
  private llmWrapper: LLMWrapper;
  private toolService: ToolService;
  private maxIterations: number;
  private iterationCount: number;
  private callbacks: LLMExecutorCallbacks;

  // 迭代器状态
  private consumed: boolean;
  private mutated: boolean;
  private message: Promise<LLMMessage> | null;
  private toolResponseCache: Promise<LLMMessage | null> | undefined;
  private completion: {
    promise: Promise<LLMMessage>;
    resolve: (value: LLMMessage) => void;
    reject: (reason?: any) => void;
  };

  /**
   * 构造函数
   * @param conversationManager 对话管理器
   * @param options 配置选项
   */
  constructor(
    conversationManager: ConversationManager,
    options: LLMExecutorOptions = {}
  ) {
    this.conversationManager = conversationManager;
    this.llmWrapper = new LLMWrapper();
    this.toolService = new ToolService();
    this.maxIterations = options.maxIterations || Infinity;
    this.callbacks = options.callbacks || {};

    // 初始化迭代器状态
    this.consumed = false;
    this.mutated = false;
    this.message = null;
    this.toolResponseCache = undefined;
    this.iterationCount = 0;
    this.completion = promiseWithResolvers();
  }

  /**
   * 更新最大迭代次数
   * @param maxIterations 最大迭代次数，Infinity 表示不限制
   */
  updateMaxIterations(maxIterations: number): void {
    this.maxIterations = maxIterations;
  }

  /**
   * 获取最大迭代次数
   * @returns 最大迭代次数
   */
  getMaxIterations(): number {
    return this.maxIterations;
  }

  /**
   * 获取对话管理器
   * @returns ConversationManager 实例
   */
  getConversationManager(): ConversationManager {
    return this.conversationManager;
  }

  /**
   * 执行单次LLM调用（非流式）
   * @returns LLM响应结果
   */
  async executeLLMCall(): Promise<LLMResult> {
    // 检查Token使用情况
    await this.conversationManager.checkTokenUsage();

    // 构建LLM请求
    const request = {
      messages: this.conversationManager.getMessages(),
      tools: this.getAvailableTools()
    };

    try {
      // 调用LLM
      const result = await this.llmWrapper.generate(request);

      // 更新Token使用统计
      this.conversationManager.updateTokenUsage(result.usage);

      // 将LLM响应转换为助手消息并添加到历史
      const assistantMessage: LLMMessage = {
        role: 'assistant',
        content: result.content,
        toolCalls: result.toolCalls
      };
      this.conversationManager.addMessage(assistantMessage);

      return result;
    } catch (error) {
      throw new ExecutionError(
        `LLM call failed: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        undefined,
        { originalError: error },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 执行单次LLM调用（流式）
   * @returns LLM响应结果流
   */
  async *executeLLMCallStream(): AsyncIterable<LLMResult> {
    // 检查Token使用情况
    await this.conversationManager.checkTokenUsage();

    // 构建LLM请求
    const request = {
      messages: this.conversationManager.getMessages(),
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
        this.conversationManager.updateTokenUsage(finalResult.usage);
      }

      // 将LLM响应转换为助手消息并添加到历史
      if (finalResult) {
        const assistantMessage: LLMMessage = {
          role: 'assistant',
          content: finalResult.content,
          toolCalls: finalResult.toolCalls
        };
        this.conversationManager.addMessage(assistantMessage);
      }
    } catch (error) {
      throw new ExecutionError(
        `LLM stream call failed: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        undefined,
        { originalError: error },
        error instanceof Error ? error : undefined
      );
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
      this.conversationManager.addMessage(toolMessage);

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
      this.conversationManager.addMessage(toolMessage);

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
      this.conversationManager.addMessage(toolMessage);

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
      this.conversationManager.addMessage(toolMessage);

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
   * 生成工具响应
   * @returns 工具响应 Promise
   */
  async generateToolResponse(): Promise<LLMMessage | null> {
    const lastMessage = await this.getLastMessage();
    if (!lastMessage) {
      return null;
    }
    return this.generateToolResponseInternal(lastMessage);
  }

  /**
   * 内部生成工具响应（带缓存）
   * @param lastMessage 最后一条消息
   * @returns 工具响应 Promise
   */
  private async generateToolResponseInternal(lastMessage: LLMMessage): Promise<LLMMessage | null> {
    // 如果已缓存，直接返回
    if (this.toolResponseCache !== undefined) {
      return this.toolResponseCache;
    }

    // 检查是否有工具调用
    if (!lastMessage.toolCalls || lastMessage.toolCalls.length === 0) {
      this.toolResponseCache = Promise.resolve(null);
      return null;
    }

    // 执行工具调用
    const toolResults = await this.executeToolCalls(lastMessage.toolCalls);

    // 构建工具消息
    const toolMessage: LLMMessage = {
      role: 'tool',
      content: JSON.stringify(toolResults),
      toolCallId: lastMessage.toolCalls[0]?.id || ''
    };

    // 触发工具结果回调
    if (this.callbacks.onToolResult) {
      this.callbacks.onToolResult(toolResults);
    }

    // 缓存结果
    this.toolResponseCache = Promise.resolve(toolMessage);

    return toolMessage;
  }

  /**
   * 获取最后一条消息
   * @returns 最后一条消息
   */
  private async getLastMessage(): Promise<LLMMessage | null> {
    if (this.message) {
      return this.message;
    }

    // 从 ConversationManager 获取最后一条消息
    const messages = this.conversationManager.getMessages();
    if (messages.length === 0) {
      return null;
    }

    const lastMessage = messages[messages.length - 1];
    return lastMessage || null;
  }

  /**
   * 等待完成
   * @returns 完成后的消息
   */
  async done(): Promise<LLMMessage> {
    return this.completion.promise;
  }

  /**
   * 运行直到完成
   * @returns 最终消息
   */
  async runUntilDone(): Promise<LLMMessage> {
    // 如果已消费，直接等待完成
    if (this.consumed) {
      return this.done();
    }

    // 开始消费迭代器
    for await (const message of this) {
      // 自然填充 message
    }

    // 等待完成
    return this.done();
  }

  /**
   * AsyncIterable 接口实现
   */
  async *[Symbol.asyncIterator](): AsyncIterator<LLMMessage> {
    if (this.consumed) {
      throw new ExecutionError(
        'LLMExecutor can only be consumed once',
        undefined,
        undefined,
        { iterationCount: this.iterationCount }
      );
    }

    this.consumed = true;
    this.mutated = true;
    this.toolResponseCache = undefined;

    let stream: any = null;

    try {
      while (true) {
        // 检查最大迭代次数
        if (this.iterationCount >= this.maxIterations) {
          break;
        }

        // 重置状态
        this.mutated = false;
        this.message = null;
        this.toolResponseCache = undefined;
        this.iterationCount++;

        try {
          // 执行 LLM 调用（ConversationManager 内部会管理消息历史）
          stream = await this.executeLLMCallStream();

          // 获取最终消息
          const finalMessage = await stream.finalMessage();
          this.message = Promise.resolve(finalMessage);

          // 触发迭代回调
          if (this.callbacks.onIteration) {
            this.callbacks.onIteration(this.iterationCount, finalMessage);
          }

          // 生成工具响应（ConversationManager 内部会自动添加工具消息到历史）
          const toolResponse = await this.generateToolResponseInternal(finalMessage);

          // 检查终止条件
          if (!toolResponse && !this.mutated) {
            break;
          }

          // yield 消息
          yield finalMessage;
        } finally {
          // 中止流式响应
          if (stream && typeof stream.abort === 'function') {
            stream.abort();
          }
        }
      }

      // 检查是否有最终消息
      if (!this.message) {
        throw new ExecutionError(
          'No message generated',
          undefined,
          undefined,
          { iterationCount: this.iterationCount }
        );
      }

      // 完成
      this.completion.resolve(await this.message);
    } catch (error) {
      // 重置状态
      this.consumed = false;
      // 静默处理未处理的 Promise 错误
      this.completion.promise.catch(() => { });
      this.completion.reject(error);
      this.completion = promiseWithResolvers();
      throw error;
    }
  }

  /**
   * Thenable 接口实现
   * @param onfulfilled 成功回调
   * @param onrejected 失败回调
   * @returns Promise
   */
  then<TResult1 = LLMMessage, TResult2 = never>(
    onfulfilled?: ((value: LLMMessage) => TResult1 | Promise<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | Promise<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.runUntilDone().then(onfulfilled, onrejected);
  }

  /**
   * 检查是否已消费
   * @returns 是否已消费
   */
  isConsumed(): boolean {
    return this.consumed;
  }

  /**
   * 检查参数是否已修改
   * @returns 参数是否已修改
   */
  isMutated(): boolean {
    return this.mutated;
  }

  /**
   * 获取迭代次数
   * @returns 迭代次数
   */
  getIterationCount(): number {
    return this.iterationCount;
  }
}
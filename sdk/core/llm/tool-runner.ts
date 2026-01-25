/**
 * 工具运行器
 * 自动处理工具调用循环
 */

import type { LLMMessage, LLMToolCall } from '../../types/llm';

/**
 * 工具调用回调
 */
export interface ToolCallCallbacks {
  /** 工具调用回调 */
  onToolCall?: (toolCall: LLMToolCall) => void;
  /** 工具结果回调 */
  onToolResult?: (result: any) => void;
  /** 迭代回调 */
  onIteration?: (iteration: number, message: LLMMessage) => void;
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
 * 工具运行器
 */
export class ToolRunner implements AsyncIterable<LLMMessage> {
  private consumed: boolean;
  private mutated: boolean;
  private maxIterations: number;
  private message: Promise<LLMMessage> | null;
  private toolResponseCache: Promise<LLMMessage | null> | undefined;
  private completion: {
    promise: Promise<LLMMessage>;
    resolve: (value: LLMMessage) => void;
    reject: (reason?: any) => void;
  };
  private iterationCount: number;
  private callbacks: ToolCallCallbacks;
  private conversation: any; // Conversation 实例

  constructor(
    conversation: any,
    callbacks?: ToolCallCallbacks
  ) {
    this.consumed = false;
    this.mutated = false;
    this.maxIterations = Infinity; // 默认不限制迭代次数
    this.message = null;
    this.toolResponseCache = undefined;
    this.iterationCount = 0;
    this.callbacks = callbacks || {};
    this.completion = promiseWithResolvers();
    this.conversation = conversation;
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

    // 从 Conversation 获取最后一条消息
    const messages = this.conversation.getMessages();
    if (messages.length === 0) {
      return null;
    }

    const lastMessage = messages[messages.length - 1];
    return lastMessage || null;
  }

  /**
   * 执行工具调用
   * @param toolCalls 工具调用数组
   * @returns 工具结果数组
   */
  private async executeToolCalls(toolCalls: LLMToolCall[]): Promise<any[]> {
    const results: any[] = [];

    for (const toolCall of toolCalls) {
      try {
        // 触发工具调用回调
        if (this.callbacks.onToolCall) {
          this.callbacks.onToolCall(toolCall);
        }

        // 执行工具
        const result = await this.conversation.executeToolCall(toolCall);
        results.push({
          toolCallId: toolCall.id,
          result,
          is_error: false
        });
      } catch (error) {
        results.push({
          toolCallId: toolCall.id,
          error: (error as Error).message,
          is_error: true
        });
      }
    }

    return results;
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
      throw new Error('ToolRunner can only be consumed once');
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
          // 执行 LLM 调用（Conversation 内部会管理消息历史）
          stream = await this.conversation.executeLLMCallStream();

          // 获取最终消息
          const finalMessage = await stream.finalMessage();
          this.message = Promise.resolve(finalMessage);

          // 触发迭代回调
          if (this.callbacks.onIteration) {
            this.callbacks.onIteration(this.iterationCount, finalMessage);
          }

          // 生成工具响应（Conversation 内部会自动添加工具消息到历史）
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
        throw new Error('No message generated');
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
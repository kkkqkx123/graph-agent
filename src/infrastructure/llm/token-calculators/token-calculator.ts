import { injectable } from 'inversify';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';

/**
 * Token计算器
 *
 * 使用tiktoken进行精确的token计算
 * 优先使用API返回的token计数，本地计算仅作为回退方案
 */
@injectable()
export class TokenCalculator {
  private tiktokenEncoding: any = null;
  private encodingName = 'cl100k_base'; // 默认使用OpenAI的cl100k_base编码
  private isInitialized = false;

  /**
   * 初始化tiktoken编码器
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 动态导入tiktoken
      const tiktoken = await import('tiktoken');
      this.tiktokenEncoding = tiktoken.get_encoding(this.encodingName as any);
      this.isInitialized = true;
      console.debug(`Token计算器使用编码器: ${this.tiktokenEncoding.name}`);
    } catch (error) {
      console.error('加载tiktoken编码器失败:', error);
      throw new Error(
        'tiktoken is required for token processing. ' +
        'Please install it with: npm install tiktoken'
      );
    }
  }

  /**
   * 计算LLM请求的token数量
   * 使用tiktoken进行精确计算
   */
  async calculateTokens(request: LLMRequest): Promise<number> {
    try {
      // 转换消息格式
      const messages = request.messages.map(msg => ({
        role: msg.getRole(),
        content: msg.getContent(),
        name: msg.getName()
      }));

      return await this.countMessagesTokens(messages);
    } catch (error) {
      console.error('计算请求token失败:', error);
      return 0;
    }
  }

  /**
   * 计算文本的token数量
   * 使用tiktoken进行精确计算
   */
  async calculateTextTokens(text: string): Promise<number> {
    return await this.countTokens(text);
  }

  /**
   * 计算特定模型的token数量
   * 使用tiktoken进行精确计算
   */
  async calculateTokensForModel(text: string, model: string): Promise<number> {
    // 统一使用tiktoken计算，不区分模型
    return await this.countTokens(text);
  }

  /**
   * 估算响应的token数量
   * 基于请求的复杂度和历史响应模式
   */
  async estimateResponseTokens(request: LLMRequest): Promise<number> {
    try {
      // 基于请求长度估算响应长度
      const requestText = request.messages.map(m => m.getContent()).join(' ');
      const requestTokens = await this.countTokens(requestText);

      // 通常响应长度是请求长度的一定比例
      const responseRatio = 0.5; // 响应通常是请求的50%长度
      const baseResponseTokens = Math.ceil(requestTokens * responseRatio);

      // 考虑maxTokens限制
      if (request.maxTokens) {
        return Math.min(baseResponseTokens, request.maxTokens);
      }

      // 设置合理的默认上限
      return Math.min(baseResponseTokens, 1000);
    } catch (error) {
      console.error('估算响应token失败:', error);
      return 0;
    }
  }

  /**
   * 计算对话历史的token数量
   */
  async calculateConversationTokens(messages: Array<{ role: string; content: string }>): Promise<number> {
    try {
      return await this.countMessagesTokens(messages);
    } catch (error) {
      console.error('计算对话历史token失败:', error);
      return 0;
    }
  }

  /**
   * 检查是否超过token限制
   */
  async isWithinTokenLimit(request: LLMRequest, maxTokens: number): Promise<boolean> {
    try {
      const requestTokens = await this.calculateTokens(request);
      const estimatedResponseTokens = await this.estimateResponseTokens(request);

      const totalEstimatedTokens = requestTokens + estimatedResponseTokens;

      return totalEstimatedTokens <= maxTokens;
    } catch (error) {
      console.error('检查token限制失败:', error);
      return false;
    }
  }

  /**
   * 截断消息以适应token限制
   */
  async truncateMessages(messages: Array<{ role: string; content: string }>, maxTokens: number): Promise<Array<{ role: string; content: string }>> {
    try {
      // 保留系统消息
      const systemMessages = messages.filter(m => m.role === 'system');
      const otherMessages = messages.filter(m => m.role !== 'system');

      let currentTokens = 0;
      const truncatedMessages: Array<{ role: string; content: string }> = [...systemMessages];

      // 计算系统消息的token
      for (const message of systemMessages) {
        currentTokens += await this.countTokens(message.content) + 4;
      }

      // 从最新消息开始添加，直到达到限制
      for (let i = otherMessages.length - 1; i >= 0; i--) {
        const message = otherMessages[i];
        if (message && message.content) {
          const messageTokens = await this.countTokens(message.content) + 4;

          if (currentTokens + messageTokens <= maxTokens) {
            truncatedMessages.unshift(message);
            currentTokens += messageTokens;
          } else {
            break;
          }
        }
      }

      return truncatedMessages;
    } catch (error) {
      console.error('截断消息失败:', error);
      return messages;
    }
  }

  /**
   * 截断文本到指定token数量
   */
  async truncateText(text: string, maxTokens: number): Promise<string> {
    if (!text || maxTokens <= 0) {
      return '';
    }

    try {
      await this.initialize();

      const tokens = this.tiktokenEncoding.encode(text);
      if (tokens.length <= maxTokens) {
        return text;
      }

      // 截断到指定token数量
      const truncatedTokens = tokens.slice(0, maxTokens);
      return this.tiktokenEncoding.decode(truncatedTokens);
    } catch (error) {
      console.error('截断文本失败:', error);
      // 如果截断失败，返回空字符串
      return '';
    }
  }

  /**
   * 计算文本的token数量
   * 使用tiktoken进行精确计算
   */
  private async countTokens(text: string): Promise<number> {
    if (!text) {
      return 0;
    }

    try {
      await this.initialize();
      return this.tiktokenEncoding.encode(text).length;
    } catch (error) {
      console.error('计算token失败:', error);
      // 如果tiktoken失败，返回0而不是使用字符数/4
      return 0;
    }
  }

  /**
   * 计算消息列表的token数量
   * 考虑消息格式的开销
   */
  private async countMessagesTokens(messages: any[]): Promise<number> {
    if (!messages || messages.length === 0) {
      return 0;
    }

    try {
      await this.initialize();

      let totalTokens = 0;

      // 每条消息的开销
      const tokensPerMessage = 3;
      const tokensPerName = 1;

      for (const message of messages) {
        // 计算消息内容的token
        totalTokens += tokensPerMessage;
        const content = this.extractMessageContent(message);
        totalTokens += this.tiktokenEncoding.encode(content).length;

        // 如果有名称，添加名称的token
        if (message.name) {
          totalTokens += tokensPerName + this.tiktokenEncoding.encode(message.name).length;
        }
      }

      // 添加回复的token
      totalTokens += 3;

      return totalTokens;
    } catch (error) {
      console.error('计算消息token失败:', error);
      return 0;
    }
  }

  /**
   * 提取消息内容
   */
  private extractMessageContent(message: any): string {
    const content = message.content;
    if (typeof content === 'string') {
      return content;
    } else if (Array.isArray(content)) {
      // 处理内容列表，提取文本部分
      const textParts: string[] = [];
      for (const item of content) {
        if (typeof item === 'string') {
          textParts.push(item);
        } else if (typeof item === 'object' && item !== null && "text" in item) {
          textParts.push(String(item.text));
        }
      }
      return textParts.join(' ');
    } else {
      return String(content);
    }
  }

  /**
   * 检查计算器是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 获取编码器名称
   */
  getEncodingName(): string {
    return this.encodingName;
  }
}
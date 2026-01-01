import { injectable } from 'inversify';
import { BaseTokenCalculator, TokenUsage, TokenCalculationStats } from './base-token-calculator';

/**
 * Tiktoken Token本地计算器
 * 
 * 基于tiktoken库进行本地token计算，不依赖API响应。
 * 用于预计算场景，如请求前的token估算、文本截断等。
 */
@injectable()
export class LocalTokenCalculator extends BaseTokenCalculator {
  private encoding: any = null;
  private encodingName = 'cl100k_base';
  private cache: Map<string, number> = new Map();
  private enableCache: boolean = true;
  private isInitialized = false;

  constructor(
    modelName: string = 'gpt-3.5-turbo',
    enableCache: boolean = true
  ) {
    super('tiktoken', modelName);
    this.enableCache = enableCache;
  }

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
      this.encoding = tiktoken.get_encoding(this.encodingName as any);
      this.isInitialized = true;
      console.debug(`Tiktoken计算器使用编码器: ${this.encoding.name}`);
    } catch (error) {
      console.error('加载tiktoken编码器失败:', error);
      throw new Error(
        'tiktoken is required for token processing. ' +
        'Please install it with: npm install tiktoken'
      );
    }
  }

  /**
   * 计算文本的token数量
   * @param text 输入文本
   * @returns token数量，如果无法计算则返回null
   */
  async countTokens(text: string): Promise<number | null> {
    if (!text) {
      return 0;
    }

    const startTime = Date.now();

    // 检查缓存
    if (this.enableCache) {
      const cachedResult = this.cache.get(text);
      if (cachedResult !== undefined) {
        this.updateCacheStats(true);
        return cachedResult;
      }
      this.updateCacheStats(false);
    }

    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const tokenCount = this.encoding.encode(text).length;

      // 存储到缓存
      if (this.enableCache) {
        this.cache.set(text, tokenCount);
      }

      // 更新统计
      const calculationTime = Date.now() - startTime;
      this.updateStatsOnSuccess(tokenCount, calculationTime);

      return tokenCount;
    } catch (error) {
      console.error(`计算token失败: ${error}`);
      this.updateStatsOnFailure();
      return null;
    }
  }

  /**
   * 计算消息列表的token数量
   * @param messages 消息列表
   * @returns token数量，如果无法计算则返回null
   */
  async countMessagesTokens(messages: any[]): Promise<number | null> {
    if (!messages || messages.length === 0) {
      return 0;
    }

    const startTime = Date.now();

    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // 使用OpenAI的消息格式计算
      const tokenCount = this.countOpenAIMessagesTokens(messages);

      // 更新统计
      const calculationTime = Date.now() - startTime;
      this.updateStatsOnSuccess(tokenCount, calculationTime);

      return tokenCount;
    } catch (error) {
      console.error(`计算消息token失败: ${error}`);
      this.updateStatsOnFailure();
      return null;
    }
  }

  /**
   * 计算OpenAI格式消息的token数量
   * @param messages 消息列表
   * @returns token数量
   */
  private countOpenAIMessagesTokens(messages: any[]): number {
    let totalTokens = 0;

    // 每条消息的开销
    const tokensPerMessage = 3;
    const tokensPerName = 1;

    for (const message of messages) {
      // 计算消息内容的token
      totalTokens += tokensPerMessage;
      const content = this.extractMessageContent(message);
      totalTokens += this.encoding.encode(content).length;

      // 如果有名称，添加名称的token
      if (message.name) {
        totalTokens += tokensPerName + this.encoding.encode(message.name).length;
      }
    }

    // 添加回复的token
    totalTokens += 3;

    return totalTokens;
  }

  /**
   * 解析API响应中的token使用信息
   * Tiktoken计算器不负责解析API响应，返回null
   * @param response API响应数据
   * @returns null
   */
  async parseApiResponse(response: any): Promise<TokenUsage | null> {
    // Tiktoken计算器不负责解析API响应
    console.warn('LocalTokenCalculator不支持解析API响应，请使用ApiResponseTokenCalculator');
    return null;
  }

  /**
   * 截断文本到指定token数量
   * @param text 输入文本
   * @param maxTokens 最大token数量
   * @returns 截断后的文本
   */
  async truncateText(text: string, maxTokens: number): Promise<string> {
    if (!text || maxTokens <= 0) {
      return '';
    }

    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const tokens = this.encoding.encode(text);
      if (tokens.length <= maxTokens) {
        return text;
      }

      // 截断到指定token数量
      const truncatedTokens = tokens.slice(0, maxTokens);
      return this.encoding.decode(truncatedTokens);
    } catch (error) {
      console.error(`截断文本失败: ${error}`);
      // 如果截断失败，返回原始文本
      return text;
    }
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计信息
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: 1000 // 默认最大缓存大小
    };
  }

  /**
   * 批量计算token数量
   * @param texts 文本列表
   * @returns token数量列表
   */
  async countTokensBatch(texts: string[]): Promise<(number | null)[]> {
    if (!this.enableCache) {
      // 如果没有缓存，逐个计算
      return Promise.all(texts.map(text => this.countTokens(text)));
    }

    // 批量检查缓存
    const results: (number | null)[] = [];
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const cachedResult = this.cache.get(text!);
      if (cachedResult !== undefined) {
        results[i] = cachedResult;
      } else {
        results[i] = null;
        uncachedTexts.push(text!);
        uncachedIndices.push(i);
      }
    }

    // 批量计算未缓存的文本
    if (uncachedTexts.length > 0 && this.encoding) {
      try {
        // 使用tiktoken的批量编码
        const uncachedTokens = uncachedTexts.map(text =>
          this.encoding.encode(text).length
        );

        // 更新结果和缓存
        for (let i = 0; i < uncachedTexts.length; i++) {
          const tokenCount = uncachedTokens[i];
          const originalIndex = uncachedIndices[i];
          const text = uncachedTexts[i];
          if (originalIndex !== undefined && text !== undefined) {
            results[originalIndex] = tokenCount;
            this.cache.set(text, tokenCount);
          }
        }
      } catch (error) {
        console.error(`批量计算token失败: ${error}`);
        // 设置失败的结果为null
        for (const originalIndex of uncachedIndices) {
          if (originalIndex !== undefined) {
            results[originalIndex] = null;
          }
        }
      }
    }

    return results;
  }

  /**
   * 检查计算器是否已初始化
   * @returns 是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 获取编码器名称
   * @returns 编码器名称
   */
  getEncodingName(): string {
    return this.encodingName;
  }
}
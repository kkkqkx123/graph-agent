import { injectable, inject } from 'inversify';
import { BaseTokenCalculator, TokenUsage, TokenCalculationStats } from './base-token-calculator';

/**
 * OpenAI Token计算器
 * 
 * 基于tiktoken库实现OpenAI模型的精确Token计算。
 * 支持Chat Completions API和Responses API (GPT-5)。
 */
@injectable()
export class OpenAITokenCalculator extends BaseTokenCalculator {
  private encoding: any = null;
  private encodingName = 'cl100k_base';
  private cache: Map<string, number> = new Map();
  private enableCache: boolean = true;

  constructor(
    @inject('ConfigManager') private configManager: any,
    modelName: string = 'gpt-3.5-turbo',
    enableCache: boolean = true
  ) {
    super('openai', modelName);
    this.enableCache = enableCache;
    this.loadEncoding();
  }

  private async loadEncoding(): Promise<void> {
    try {
      // 动态导入tiktoken
      const tiktoken = await import('tiktoken');
      this.encoding = tiktoken.get_encoding(this.encodingName as any);
      console.debug(`OpenAI计算器使用编码器: ${this.encoding.name}`);
    } catch (error) {
      console.error('加载tiktoken编码器失败:', error);
      throw new Error(
        'tiktoken is required for OpenAI token processing. ' +
        'Please install it with: npm install tiktoken'
      );
    }
  }

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
      if (!this.encoding) {
        await this.loadEncoding();
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
      console.error(`计算OpenAI token失败: ${error}`);
      this.updateStatsOnFailure();
      return null;
    }
  }

  async countMessagesTokens(messages: any[]): Promise<number | null> {
    if (!messages || messages.length === 0) {
      return 0;
    }

    const startTime = Date.now();

    try {
      if (!this.encoding) {
        await this.loadEncoding();
      }

      // 使用OpenAI的消息格式计算
      const tokenCount = this.countOpenAIMessagesTokens(messages);

      // 更新统计
      const calculationTime = Date.now() - startTime;
      this.updateStatsOnSuccess(tokenCount, calculationTime);

      return tokenCount;
    } catch (error) {
      console.error(`计算OpenAI消息token失败: ${error}`);
      this.updateStatsOnFailure();
      return null;
    }
  }

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

  parseApiResponse(response: any): TokenUsage | null {
    try {
      const usage = response.usage;
      if (!usage) {
        console.warn('OpenAI响应中未找到usage信息');
        return null;
      }

      // 解析缓存token信息
      const promptDetails = usage.prompt_tokens_details || {};
      const completionDetails = usage.completion_tokens_details || {};

      const cachedTokens = promptDetails.cached_tokens || 0;

      // 解析扩展token信息
      const extendedTokens: Record<string, number> = {};

      // 音频token
      const audioTokens = promptDetails['audio_tokens'] || 0;
      if (audioTokens > 0) {
        extendedTokens['prompt_audio_tokens'] = audioTokens;
      }

      const completionAudioTokens = completionDetails['audio_tokens'] || 0;
      if (completionAudioTokens > 0) {
        extendedTokens['completion_audio_tokens'] = completionAudioTokens;
      }

      // 推理token
      const reasoningTokens = completionDetails['reasoning_tokens'] || 0;
      if (reasoningTokens > 0) {
        extendedTokens['reasoning_tokens'] = reasoningTokens;
      }

      // 预测token
      const acceptedPredictionTokens = completionDetails['accepted_prediction_tokens'] || 0;
      const rejectedPredictionTokens = completionDetails['rejected_prediction_tokens'] || 0;
      if (acceptedPredictionTokens > 0) {
        extendedTokens['accepted_prediction_tokens'] = acceptedPredictionTokens;
      }
      if (rejectedPredictionTokens > 0) {
        extendedTokens['rejected_prediction_tokens'] = rejectedPredictionTokens;
      }

      // 思考token
      const thoughtsTokens = completionDetails['thoughts_tokens'] || 0;
      if (thoughtsTokens > 0) {
        extendedTokens['thoughts_tokens'] = thoughtsTokens;
      }

      // 工具调用token
      const toolCallTokens = completionDetails['tool_call_tokens'] || 0;
      if (toolCallTokens > 0) {
        extendedTokens['tool_call_tokens'] = toolCallTokens;
      }

      const tokenUsage: TokenUsage = {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
        // 缓存token统计
        cachedTokens,
        cachedPromptTokens: cachedTokens,
        cachedCompletionTokens: 0, // OpenAI通常不缓存completion_tokens
        // 音频token统计
        promptAudioTokens: audioTokens,
        completionAudioTokens: completionAudioTokens,
        // 推理token统计
        reasoningTokens,
        // 预测token统计
        acceptedPredictionTokens,
        rejectedPredictionTokens,
        // 思考token统计
        thoughtsTokens,
        // 工具调用token统计
        toolCallTokens,
        // 元数据
        metadata: {
          model: response.model,
          responseId: response.id,
          object: response.object,
          created: response.created,
          systemFingerprint: response.system_fingerprint,
          provider: 'openai',
          ...extendedTokens
        }
      };

      // 保存最后一次的使用情况
      this._lastUsage = tokenUsage;

      return tokenUsage;
    } catch (error) {
      console.error(`解析OpenAI响应失败: ${error}`);
      return null;
    }
  }

  override getSupportedModels(): string[] {
    // 从配置文件获取支持的模型
    const models = this.configManager.get('llm.openai.supportedModels', []);
    if (models.length > 0) {
      return models;
    }

    // 默认支持的模型
    return [
      'gpt-4', 'gpt-4-32k', 'gpt-4-0613', 'gpt-4-32k-0613',
      'gpt-4-turbo', 'gpt-4-turbo-2024-04-09', 'gpt-4-turbo-preview',
      'gpt-4o', 'gpt-4o-2024-05-13', 'gpt-4o-2024-08-06',
      'gpt-4o-mini', 'gpt-4o-mini-2024-07-18',
      'gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-3.5-turbo-0613',
      'gpt-3.5-turbo-16k-0613', 'gpt-3.5-turbo-0301',
      'gpt-5', 'gpt-5-codex', 'gpt-5.1'
    ];
  }

  override getModelPricing(modelName: string): Record<string, number> | null {
    // 从配置文件获取定价信息
    const pricing = this.configManager.get(`llm.openai.pricing.${modelName}`, null);
    if (pricing) {
      return pricing;
    }

    // 默认定价信息（仅作为后备）
    const defaultPricing: Record<string, Record<string, number>> = {
      'gpt-4o': { prompt: 0.005, completion: 0.015 },
      'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
      'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
      'gpt-4': { prompt: 0.03, completion: 0.06 },
      'gpt-3.5-turbo': { prompt: 0.001, completion: 0.002 },
      'gpt-5': { prompt: 0.01, completion: 0.03 }
    };

    return defaultPricing[modelName] || null;
  }

  isSupportedResponse(response: any): boolean {
    // 检查是否支持解析该响应
    return (
      'usage' in response &&
      typeof response.usage === 'object' &&
      (['prompt_tokens', 'completion_tokens', 'total_tokens'] as const).some(
        key => key in response.usage
      )
    );
  }

  async truncateText(text: string, maxTokens: number): Promise<string> {
    if (!text || maxTokens <= 0) {
      return '';
    }

    try {
      if (!this.encoding) {
        await this.loadEncoding();
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

  clearCache(): void {
    this.cache.clear();
  }

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
        console.error(`批量计算OpenAI token失败: ${error}`);
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
}
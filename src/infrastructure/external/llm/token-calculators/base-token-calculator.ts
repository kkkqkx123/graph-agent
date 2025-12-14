import { injectable } from 'inversify';

/**
 * Token计算统计信息
 */
export interface TokenCalculationStats {
  totalCalculations: number;
  successfulCalculations: number;
  failedCalculations: number;
  cacheHits: number;
  cacheMisses: number;
  totalTokensCalculated: number;
  totalCalculationTime: number;
  lastCalculationTime?: Date;
}

/**
 * Token使用情况
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  promptTokensCost?: number;
  completionTokensCost?: number;
  totalCost?: number;
  cachedTokens?: number;
  cachedPromptTokens?: number;
  cachedCompletionTokens?: number;
  promptAudioTokens?: number;
  completionAudioTokens?: number;
  reasoningTokens?: number;
  acceptedPredictionTokens?: number;
  rejectedPredictionTokens?: number;
  thoughtsTokens?: number;
  toolCallTokens?: number;
  metadata?: Record<string, unknown>;
}

/**
 * 统一的Token计算器接口
 */
export interface ITokenCalculator {
  /**
   * 计算文本的token数量
   * @param text 输入文本
   * @returns token数量，如果无法计算则返回null
   */
  countTokens(text: string): Promise<number | null>;

  /**
   * 计算消息列表的token数量
   * @param messages 消息列表
   * @returns token数量，如果无法计算则返回null
   */
  countMessagesTokens(messages: any[]): Promise<number | null>;

  /**
   * 解析API响应中的token使用信息
   * @param response API响应数据
   * @returns 解析出的token使用信息
   */
  parseApiResponse(response: any): TokenUsage | null;

  /**
   * 获取提供商名称
   * @returns 提供商名称
   */
  getProviderName(): string;

  /**
   * 获取支持的模型列表
   * @returns 支持的模型列表
   */
  getSupportedModels(): string[];

  /**
   * 检查是否支持指定模型
   * @param modelName 模型名称
   * @returns 是否支持该模型
   */
  isModelSupported(modelName: string): boolean;

  /**
   * 获取模型定价信息
   * @param modelName 模型名称
   * @returns 定价信息，格式为 {"prompt": 0.001, "completion": 0.002}
   */
  getModelPricing(modelName: string): Record<string, number> | null;

  /**
   * 计算Token使用成本
   * @param tokenUsage Token使用情况
   * @param modelName 模型名称
   * @returns 成本，如果无法计算则返回null
   */
  calculateCost(tokenUsage: TokenUsage, modelName: string): number | null;

  /**
   * 获取计算统计信息
   * @returns 统计信息
   */
  getStats(): TokenCalculationStats;

  /**
   * 重置统计信息
   */
  resetStats(): void;

  /**
   * 清空缓存
   */
  clearCache(): void;

  /**
   * 截断文本到指定token数量
   * @param text 输入文本
   * @param maxTokens 最大token数量
   * @returns 截断后的文本
   */
  truncateText(text: string, maxTokens: number): Promise<string>;
}

/**
 * Token计算器基础实现类
 */
@injectable()
export abstract class BaseTokenCalculator implements ITokenCalculator {
  protected readonly providerName: string;
  protected readonly modelName: string;
  protected _stats: TokenCalculationStats;
  protected _lastUsage: TokenUsage | null = null;

  constructor(providerName: string, modelName: string) {
    this.providerName = providerName;
    this.modelName = modelName;
    this._stats = {
      totalCalculations: 0,
      successfulCalculations: 0,
      failedCalculations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalTokensCalculated: 0,
      totalCalculationTime: 0
    };
  }

  getProviderName(): string {
    return this.providerName;
  }

  getSupportedModels(): string[] {
    return [this.modelName];
  }

  isModelSupported(modelName: string): boolean {
    return modelName in this.getSupportedModels();
  }

  getStats(): TokenCalculationStats {
    return { ...this._stats };
  }

  resetStats(): void {
    this._stats = {
      totalCalculations: 0,
      successfulCalculations: 0,
      failedCalculations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalTokensCalculated: 0,
      totalCalculationTime: 0
    };
    this._lastUsage = null;
  }

  getLastApiUsage(): TokenUsage | null {
    return this._lastUsage;
  }

  isApiUsageAvailable(): boolean {
    return this._lastUsage !== null;
  }

  getModelPricing(modelName: string): Record<string, number> | null {
    // 默认实现，子类应该覆盖
    return null;
  }

  calculateCost(tokenUsage: TokenUsage, modelName: string): number | null {
    const pricing = this.getModelPricing(modelName);
    if (!pricing) {
      return null;
    }

    try {
      const promptCost = tokenUsage.promptTokens * pricing.get("prompt", 0);
      const completionCost = tokenUsage.completionTokens * pricing.get("completion", 0);
      return promptCost + completionCost;
    } catch (error) {
      console.error(`计算成本失败: ${error}`);
      return null;
    }
  }

  protected updateStatsOnSuccess(tokenCount: number, calculationTime: number): void {
    this._stats.totalCalculations += 1;
    this._stats.successfulCalculations += 1;
    this._stats.totalTokensCalculated += tokenCount;
    this._stats.totalCalculationTime += calculationTime;
    this._stats.lastCalculationTime = new Date();
  }

  protected updateStatsOnFailure(): void {
    this._stats.totalCalculations += 1;
    this._stats.failedCalculations += 1;
  }

  protected updateCacheStats(hit: boolean): void {
    if (hit) {
      this._stats.cacheHits += 1;
    } else {
      this._stats.cacheMisses += 1;
    }
  }

  protected extractMessageContent(message: any): string {
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

  // 抽象方法，子类必须实现
  abstract countTokens(text: string): Promise<number | null>;
  abstract countMessagesTokens(messages: any[]): Promise<number | null>;
  abstract parseApiResponse(response: any): TokenUsage | null;
  abstract truncateText(text: string, maxTokens: number): Promise<string>;
  abstract clearCache(): void;
}
import { injectable, inject } from 'inversify';
import { BaseTokenCalculator, TokenUsage } from './base-token-calculator';

/**
 * API响应Token计算器
 * 
 * 专注于解析API响应中的token使用信息，不进行本地计算。
 * 用于API调用后的token统计和成本计算。
 */
@injectable()
export class ApiResponseTokenCalculator extends BaseTokenCalculator {
  constructor(
    @inject('ConfigManager') private configManager: any,
    modelName: string = 'gpt-3.5-turbo'
  ) {
    super('api-response', modelName);
  }

  /**
   * 计算文本的token数量
   * API响应计算器不负责本地计算，返回null
   * @param text 输入文本
   * @returns null
   */
  async countTokens(text: string): Promise<number | null> {
    // API响应计算器不负责本地计算
    console.warn('ApiResponseTokenCalculator不支持本地token计算，请使用TiktokenTokenCalculator');
    return null;
  }

  /**
   * 计算消息列表的token数量
   * API响应计算器不负责本地计算，返回null
   * @param messages 消息列表
   * @returns null
   */
  async countMessagesTokens(messages: any[]): Promise<number | null> {
    // API响应计算器不负责本地计算
    console.warn('ApiResponseTokenCalculator不支持本地token计算，请使用TiktokenTokenCalculator');
    return null;
  }

  /**
   * 解析API响应中的token使用信息
   * @param response API响应数据
   * @returns 解析出的token使用信息
   */
  async parseApiResponse(response: any): Promise<TokenUsage | null> {
    try {
      const usage = response.usage;
      if (!usage) {
        console.warn('API响应中未找到usage信息');
        return null;
      }

      // 解析详细信息
      const promptDetails = usage.prompt_tokens_details || {};
      const completionDetails = usage.completion_tokens_details || {};

      // 推理token（单独统计，但已包含在completion_tokens中）
      const reasoningTokens = completionDetails['reasoning_tokens'] || 0;

      // 构建元数据，保留原始API响应的详细信息
      const metadata: Record<string, unknown> = {
        model: response['model'],
        responseId: response['id'],
        object: response['object'],
        created: response['created'],
        systemFingerprint: response['system_fingerprint'],
        provider: this.providerName,
        // 保留原始详细信息用于调试和审计
        promptTokensDetails: promptDetails,
        completionTokensDetails: completionDetails
      };

      const tokenUsage: TokenUsage = {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
        reasoningTokens,
        metadata
      };

      // 保存最后一次的使用情况
      this._lastUsage = tokenUsage;

      return tokenUsage;
    } catch (error) {
      console.error(`解析API响应失败: ${error}`);
      return null;
    }
  }

  /**
   * 截断文本到指定token数量
   * API响应计算器不负责文本截断，返回空字符串
   * @param text 输入文本
   * @param maxTokens 最大token数量
   * @returns 空字符串
   */
  async truncateText(text: string, maxTokens: number): Promise<string> {
    // API响应计算器不负责文本截断
    console.warn('ApiResponseTokenCalculator不支持文本截断，请使用TiktokenTokenCalculator');
    return '';
  }

  /**
   * 清空缓存
   * API响应计算器不需要缓存
   */
  clearCache(): void {
    // API响应计算器不需要缓存
  }

  /**
   * 获取支持的模型列表
   * @returns 支持的模型列表
   */
  override getSupportedModels(): string[] {
    // 从配置文件获取支持的模型
    const models = this.configManager.get(`llm.${this.providerName}.supportedModels`, []);
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

  /**
   * 获取模型定价信息
   * @param modelName 模型名称
   * @returns 定价信息，格式为 {"prompt": 0.001, "completion": 0.002}
   */
  override getModelPricing(modelName: string): Record<string, number> | null {
    // 从配置文件获取定价信息
    const pricing = this.configManager.get(`llm.${this.providerName}.pricing.${modelName}`, null);
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

  /**
   * 检查是否支持解析该响应
   * @param response API响应数据
   * @returns 是否支持解析
   */
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
}
import { injectable, inject } from 'inversify';
import { BaseTokenCalculator, TokenUsage } from './base-token-calculator';
import { LocalTokenCalculator } from './local-token-calculator';
import { ApiResponseTokenCalculator } from './api-response-token-calculator';
import { LLMRequest } from '../../../domain/llm/entities/llm-request';
import { TYPES } from '../../../di/service-keys';

/**
 * 统一的Token计算器
 *
 * 聚合TiktokenTokenCalculator和ApiResponseTokenCalculator的功能：
 * - 使用TiktokenTokenCalculator进行本地token计算（预计算、文本截断等）
 * - 使用ApiResponseTokenCalculator解析API响应中的token使用信息
 *
 * 使用场景：
 * - 请求前：使用tiktoken进行token估算和文本截断
 * - 请求后：解析API响应获取准确的token使用信息
 */
@injectable()
export class TokenCalculator extends BaseTokenCalculator {
  private tiktokenCalculator: LocalTokenCalculator;
  private apiResponseCalculator: ApiResponseTokenCalculator;

  constructor(
    @inject(TYPES.ConfigManager) configManager: any,
    modelName: string = 'gpt-3.5-turbo',
    enableCache: boolean = true
  ) {
    super('unified', modelName);

    // 初始化两个计算器
    this.tiktokenCalculator = new LocalTokenCalculator(modelName, enableCache);
    this.apiResponseCalculator = new ApiResponseTokenCalculator(configManager, modelName);
  }

  /**
   * 计算文本的token数量
   * 使用tiktoken进行本地计算
   * @param text 输入文本
   * @returns token数量，如果无法计算则返回null
   */
  async countTokens(text: string): Promise<number | null> {
    return this.tiktokenCalculator.countTokens(text);
  }

  /**
   * 计算消息列表的token数量
   * 使用tiktoken进行本地计算
   * @param messages 消息列表
   * @returns token数量，如果无法计算则返回null
   */
  async countMessagesTokens(messages: any[]): Promise<number | null> {
    return this.tiktokenCalculator.countMessagesTokens(messages);
  }

  /**
   * 解析API响应中的token使用信息
   *
   * 聚合逻辑：
   * - 优先使用API响应中的token计数
   * - 当API响应token计数为0时，视为API供应商响应有误，使用本地计算作为回退
   *
   * @param response API响应数据
   * @param originalRequest 原始请求（可选，用于回退计算）
   * @returns 解析出的token使用信息
   */
  async parseApiResponse(response: any, originalRequest?: LLMRequest): Promise<TokenUsage | null> {
    const apiUsage = await this.apiResponseCalculator.parseApiResponse(response);

    if (!apiUsage) {
      return null;
    }

    // 检查API响应的token计数是否有效
    const isApiUsageValid =
      apiUsage.totalTokens > 0 || apiUsage.promptTokens > 0 || apiUsage.completionTokens > 0;

    if (isApiUsageValid) {
      // API响应有效，直接使用
      this._lastUsage = apiUsage;
      return apiUsage;
    }

    // API响应token计数为0，视为API供应商响应有误
    console.warn('API响应token计数为0，视为API供应商响应有误，使用本地计算作为回退');

    if (!originalRequest) {
      console.warn('未提供原始请求，无法进行本地计算回退');
      return apiUsage;
    }

    // 使用本地计算作为回退
    return await this.calculateUsageFromLocal(originalRequest, response);
  }

  /**
   * 使用本地计算生成TokenUsage
   * @param request LLM请求
   * @param response API响应（用于提取completion内容）
   * @returns 本地计算的TokenUsage
   */
  private async calculateUsageFromLocal(
    request: LLMRequest,
    response: any
  ): Promise<TokenUsage | null> {
    try {
      // 计算prompt tokens
      const messages = request.messages.map(msg => ({
        role: msg.getRole(),
        content: msg.getContent(),
        name: msg.getName(),
      }));
      const promptTokens = (await this.tiktokenCalculator.countMessagesTokens(messages)) || 0;

      // 计算completion tokens
      let completionTokens = 0;
      const choices = response['choices'];
      if (choices && choices.length > 0) {
        const choice = choices[0];
        const content = choice.message?.content || '';
        completionTokens = (await this.tiktokenCalculator.countTokens(content)) || 0;
      }

      const totalTokens = promptTokens + completionTokens;

      // 构建TokenUsage
      const tokenUsage: TokenUsage = {
        promptTokens,
        completionTokens,
        totalTokens,
        metadata: {
          model: response['model'],
          responseId: response['id'],
          object: response['object'],
          created: response['created'],
          systemFingerprint: response['system_fingerprint'],
          provider: 'local-fallback',
          fallbackReason: 'api-response-tokens-zero',
          originalApiUsage: response.usage,
        },
      };

      this._lastUsage = tokenUsage;
      return tokenUsage;
    } catch (error) {
      console.error('本地计算回退失败:', error);
      return null;
    }
  }

  /**
   * 截断文本到指定token数量
   * 使用tiktoken进行本地计算
   * @param text 输入文本
   * @param maxTokens 最大token数量
   * @returns 截断后的文本
   */
  async truncateText(text: string, maxTokens: number): Promise<string> {
    return this.tiktokenCalculator.truncateText(text, maxTokens);
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.tiktokenCalculator.clearCache();
  }

  /**
   * 获取支持的模型列表
   * @returns 支持的模型列表
   */
  override getSupportedModels(): string[] {
    return this.apiResponseCalculator.getSupportedModels();
  }

  /**
   * 获取模型定价信息
   * @param modelName 模型名称
   * @returns 定价信息，格式为 {"prompt": 0.001, "completion": 0.002}
   */
  override getModelPricing(modelName: string): Record<string, number> | null {
    return this.apiResponseCalculator.getModelPricing(modelName);
  }

  /**
   * 检查是否支持解析该响应
   * @param response API响应数据
   * @returns 是否支持解析
   */
  isSupportedResponse(response: any): boolean {
    return this.apiResponseCalculator.isSupportedResponse(response);
  }

  /**
   * 计算LLM请求的token数量
   * 使用tiktoken进行精确计算
   * @param request LLM请求
   * @returns token数量
   */
  async calculateTokens(request: LLMRequest): Promise<number> {
    try {
      // 转换消息格式
      const messages = request.messages.map(msg => ({
        role: msg.getRole(),
        content: msg.getContent(),
        name: msg.getName(),
      }));

      return (await this.countMessagesTokens(messages)) || 0;
    } catch (error) {
      console.error('计算请求token失败:', error);
      return 0;
    }
  }

  /**
   * 计算文本的token数量
   * 使用tiktoken进行精确计算
   * @param text 输入文本
   * @returns token数量
   */
  async calculateTextTokens(text: string): Promise<number> {
    return (await this.countTokens(text)) || 0;
  }

  /**
   * 计算特定模型的token数量
   * 使用tiktoken进行精确计算
   * @param text 输入文本
   * @param model 模型名称
   * @returns token数量
   */
  async calculateTokensForModel(text: string, model: string): Promise<number> {
    // 统一使用tiktoken计算，不区分模型
    return (await this.countTokens(text)) || 0;
  }

  /**
   * 估算响应的token数量
   * 基于请求的复杂度和历史响应模式
   * @param request LLM请求
   * @returns 估算的token数量
   */
  async estimateResponseTokens(request: LLMRequest): Promise<number> {
    try {
      // 基于请求长度估算响应长度
      const requestText = request.messages.map(m => m.getContent()).join(' ');
      const requestTokens = (await this.countTokens(requestText)) || 0;

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
   * @param messages 消息列表
   * @returns token数量
   */
  async calculateConversationTokens(
    messages: Array<{ role: string; content: string }>
  ): Promise<number> {
    try {
      return (await this.countMessagesTokens(messages)) || 0;
    } catch (error) {
      console.error('计算对话历史token失败:', error);
      return 0;
    }
  }

  /**
   * 检查是否超过token限制
   * @param request LLM请求
   * @param maxTokens 最大token数量
   * @returns 是否在限制内
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
   * @param messages 消息列表
   * @param maxTokens 最大token数量
   * @returns 截断后的消息列表
   */
  async truncateMessages(
    messages: Array<{ role: string; content: string }>,
    maxTokens: number
  ): Promise<Array<{ role: string; content: string }>> {
    try {
      // 保留系统消息
      const systemMessages = messages.filter(m => m.role === 'system');
      const otherMessages = messages.filter(m => m.role !== 'system');

      let currentTokens = 0;
      const truncatedMessages: Array<{ role: string; content: string }> = [...systemMessages];

      // 计算系统消息的token
      for (const message of systemMessages) {
        currentTokens += ((await this.countTokens(message.content)) || 0) + 4;
      }

      // 从最新消息开始添加，直到达到限制
      for (let i = otherMessages.length - 1; i >= 0; i--) {
        const message = otherMessages[i];
        if (message && message.content) {
          const messageTokens = ((await this.countTokens(message.content)) || 0) + 4;

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
   * 检查计算器是否已初始化
   * @returns 是否已初始化
   */
  isReady(): boolean {
    return this.tiktokenCalculator.isReady();
  }

  /**
   * 获取编码器名称
   * @returns 编码器名称
   */
  getEncodingName(): string {
    return this.tiktokenCalculator.getEncodingName();
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计信息
   */
  getCacheStats(): { size: number; maxSize: number } {
    return this.tiktokenCalculator.getCacheStats();
  }

  /**
   * 批量计算token数量
   * @param texts 文本列表
   * @returns token数量列表
   */
  async countTokensBatch(texts: string[]): Promise<(number | null)[]> {
    return this.tiktokenCalculator.countTokensBatch(texts);
  }
}

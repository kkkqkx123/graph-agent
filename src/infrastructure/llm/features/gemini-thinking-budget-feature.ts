import { IFeature } from './feature.interface';

/**
 * Gemini 思考预算功能
 *
 * 处理 Gemini 的思考预算和思考过程功能
 */
export class GeminiThinkingBudgetFeature implements IFeature {
  /**
   * 检查功能是否支持指定的提供商
   */
  isSupported(provider: string): boolean {
    return provider === 'gemini' || provider === 'gemini-openai';
  }

  /**
   * 将功能应用到请求中
   */
  applyToRequest(request: any, config: any): any {
    const enhancedRequest = { ...request };

    // 检查是否有思考预算配置
    const thinkingBudget = config.thinkingBudget || config.metadata?.thinkingBudget;
    const includeThoughts = config.includeThoughts || config.metadata?.includeThoughts;

    if (thinkingBudget || includeThoughts) {
      // 初始化 extra_body
      if (!enhancedRequest.extra_body) {
        enhancedRequest.extra_body = {};
      }

      // 初始化 google 配置
      if (!enhancedRequest.extra_body.google) {
        enhancedRequest.extra_body.google = {};
      }

      // 设置思考配置
      enhancedRequest.extra_body.google.thinking_config = {
        thinking_budget: thinkingBudget || 'medium',
        include_thoughts: includeThoughts || false
      };
    }

    return enhancedRequest;
  }
}
import { IFeature } from '../feature.interface';

/**
 * Gemini 思考预算功能
 * 
 * 处理 Gemini 的思考预算和思考过程功能
 */
export class GeminiThinkingBudgetFeature implements IFeature {
  name = 'thinking_budget';
  version = '1.0.0';
  description = 'Gemini 思考预算功能，控制模型的推理努力程度和是否包含思考过程';

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

  /**
   * 从响应中提取功能相关数据
   */
  extractFromResponse(response: any): any {
    // 提取思考过程和努力使用情况
    const thoughts = response.choices?.[0]?.message?.thoughts;
    const effortUsed = response.choices?.[0]?.message?.effort_used;

    if (thoughts || effortUsed) {
      return {
        thoughts,
        effortUsed
      };
    }

    return undefined;
  }

  /**
   * 验证功能配置
   */
  validateConfig(config: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    const thinkingBudget = config.thinkingBudget || config.metadata?.thinkingBudget;

    if (thinkingBudget) {
      const validBudgets = ['low', 'medium', 'high'];
      if (!validBudgets.includes(thinkingBudget)) {
        errors.push(`thinking_budget must be one of: ${validBudgets.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取功能所需的参数定义
   */
  getRequiredParameters(): string[] {
    return [];
  }

  /**
   * 获取功能可选的参数定义
   */
  getOptionalParameters(): string[] {
    return ['thinkingBudget', 'includeThoughts'];
  }
}
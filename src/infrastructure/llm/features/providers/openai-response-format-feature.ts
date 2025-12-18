import { IFeature } from '../feature.interface';

/**
 * OpenAI 响应格式功能
 * 
 * 处理 OpenAI 的响应格式功能，如 JSON 模式
 */
export class OpenAIResponseFormatFeature implements IFeature {
  name = 'response_format';
  version = '1.0.0';
  description = 'OpenAI 响应格式功能，支持 JSON 模式等结构化输出';

  /**
   * 检查功能是否支持指定的提供商
   */
  isSupported(provider: string): boolean {
    return provider === 'openai';
  }

  /**
   * 将功能应用到请求中
   */
  applyToRequest(request: any, config: any): any {
    const enhancedRequest = { ...request };

    // 检查是否有响应格式配置
    const responseFormat = config.responseFormat || config.metadata?.responseFormat;

    if (responseFormat) {
      enhancedRequest.response_format = responseFormat;
    }

    return enhancedRequest;
  }

  /**
   * 从响应中提取功能相关数据
   */
  extractFromResponse(response: any): any {
    // OpenAI 响应格式功能通常不需要从响应中提取特殊数据
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

    const responseFormat = config.responseFormat || config.metadata?.responseFormat;

    if (responseFormat) {
      if (typeof responseFormat !== 'object') {
        errors.push('response_format must be an object');
      } else {
        // 验证响应格式结构
        if (responseFormat.type && !['text', 'json_object'].includes(responseFormat.type)) {
          errors.push('response_format.type must be either "text" or "json_object"');
        }

        if (responseFormat.type === 'json_object' && responseFormat.schema) {
          // 如果提供了 JSON schema，验证其结构
          if (typeof responseFormat.schema !== 'object') {
            errors.push('response_format.schema must be a valid JSON schema object');
          }
        }
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
    return ['responseFormat'];
  }
}
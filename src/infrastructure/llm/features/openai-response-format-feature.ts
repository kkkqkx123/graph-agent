import { IFeature } from './feature.interface';

/**
 * OpenAI 响应格式功能
 *
 * 处理 OpenAI 的响应格式功能，如 JSON 模式
 */
export class OpenAIResponseFormatFeature implements IFeature {
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
}
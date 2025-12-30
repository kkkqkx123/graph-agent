import { IFeature } from './feature.interface';

/**
 * Gemini 缓存内容功能
 *
 * 处理 Gemini 的缓存内容功能，提高重复请求的性能
 */
export class GeminiCachedContentFeature implements IFeature {
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

    // 检查是否有缓存内容配置
    const cachedContent = config.cachedContent || config.metadata?.cachedContent;

    if (cachedContent) {
      // 初始化 extra_body
      if (!enhancedRequest.extra_body) {
        enhancedRequest.extra_body = {};
      }

      // 初始化 google 配置
      if (!enhancedRequest.extra_body.google) {
        enhancedRequest.extra_body.google = {};
      }

      // 设置缓存内容
      enhancedRequest.extra_body.google.cached_content = cachedContent;
    }

    return enhancedRequest;
  }
}
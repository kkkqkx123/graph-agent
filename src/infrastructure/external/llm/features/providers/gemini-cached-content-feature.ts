import { IFeature } from '../interfaces/feature.interface';

/**
 * Gemini 缓存内容功能
 * 
 * 处理 Gemini 的缓存内容功能，提高重复请求的性能
 */
export class GeminiCachedContentFeature implements IFeature {
  name = 'cached_content';
  version = '1.0.0';
  description = 'Gemini 缓存内容功能，通过缓存提高重复请求的性能';

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

  /**
   * 从响应中提取功能相关数据
   */
  extractFromResponse(response: any): any {
    // 提取缓存使用信息
    const cacheUsage = response.usage?.cache_usage;
    const cachedContentTokenCount = response.usage?.cached_content_token_count;
    
    if (cacheUsage || cachedContentTokenCount) {
      return {
        cacheUsage,
        cachedContentTokenCount
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
    
    const cachedContent = config.cachedContent || config.metadata?.cachedContent;
    
    if (cachedContent && typeof cachedContent !== 'string') {
      errors.push('cached_content must be a string');
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
    return ['cachedContent'];
  }
}
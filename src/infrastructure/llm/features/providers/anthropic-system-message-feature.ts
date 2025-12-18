import { IFeature } from '../feature.interface';

/**
 * Anthropic 系统消息功能
 * 
 * 处理 Anthropic 的系统消息功能，将系统消息从消息列表中提取并作为单独参数
 */
export class AnthropicSystemMessageFeature implements IFeature {
  name = 'system_message';
  version = '1.0.0';
  description = 'Anthropic 系统消息功能，将系统消息从消息列表中提取并作为单独参数处理';

  /**
   * 检查功能是否支持指定的提供商
   */
  isSupported(provider: string): boolean {
    return provider === 'anthropic';
  }

  /**
   * 将功能应用到请求中
   */
  applyToRequest(request: any, config: any): any {
    const enhancedRequest = { ...request };

    // 从消息列表中提取系统消息
    if (request.messages && Array.isArray(request.messages)) {
      const systemMessages = request.messages.filter((msg: any) => msg.role === 'system');

      if (systemMessages.length > 0) {
        // 将系统消息内容合并
        const systemContent = systemMessages
          .map((msg: any) => msg.content)
          .join('\n');

        // 设置系统参数
        enhancedRequest.system = systemContent;

        // 从消息列表中移除系统消息
        enhancedRequest.messages = request.messages.filter((msg: any) => msg.role !== 'system');
      }
    }

    return enhancedRequest;
  }

  /**
   * 从响应中提取功能相关数据
   */
  extractFromResponse(response: any): any {
    // Anthropic 系统消息功能通常不需要从响应中提取特殊数据
    return undefined;
  }

  /**
   * 验证功能配置
   */
  validateConfig(config: any): {
    isValid: boolean;
    errors: string[];
  } {
    // Anthropic 系统消息功能不需要特殊配置验证
    return {
      isValid: true,
      errors: []
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
    return [];
  }
}
import { IFeature } from './feature.interface';

/**
 * Anthropic 系统消息功能
 *
 * 处理 Anthropic 的系统消息功能，将系统消息从消息列表中提取并作为单独参数
 */
export class AnthropicSystemMessageFeature implements IFeature {
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
}
/**
 * 内容提取器
 *
 * 用于从响应中提取和处理内容
 */

/**
 * 内容提取器
 */
export class ContentExtractor {
  /**
   * 提取文本内容
   *
   * @param content 内容对象
   * @returns 文本内容或null
   */
  extractTextContent(content: any): string | null {
    if (typeof content === 'string') {
      return content;
    } else if (typeof content === 'object' && content !== null) {
      return content['text'] || null;
    }
    return null;
  }

  /**
   * 从响应中提取内容
   *
   * @param response 响应对象
   * @returns 提取的内容字典
   */
  extractContentFromResponse(response: Record<string, any>): Record<string, any> {
    const extracted = {
      text: null as string | null,
      content: null as any,
      raw: response,
    };

    // 尝试从常见字段提取内容
    if (typeof response === 'object' && response !== null) {
      if ('text' in response) {
        extracted.text = response['text'];
      }
      if ('content' in response) {
        extracted.content = response['content'];
      }
      if ('message' in response) {
        const message = response['message'];
        if (typeof message === 'object' && message !== null && 'content' in message) {
          extracted.content = message['content'];
        }
      }
    }

    return extracted;
  }

  /**
   * 提取消息列表
   *
   * @param response 响应对象
   * @returns 消息列表
   */
  extractMessages(response: Record<string, any>): Record<string, any>[] {
    const messages: Record<string, any>[] = [];

    if (typeof response === 'object' && response !== null) {
      if ('messages' in response && Array.isArray(response['messages'])) {
        return response['messages'];
      } else if ('choices' in response && Array.isArray(response['choices'])) {
        for (const choice of response['choices']) {
          if (typeof choice === 'object' && choice !== null && 'message' in choice) {
            messages.push(choice['message']);
          }
        }
      }
    }

    return messages;
  }
}

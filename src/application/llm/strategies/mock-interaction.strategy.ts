/**
 * 模拟交互策略
 *
 * 用于测试环境，模拟用户输入
 */

import { injectable } from 'inversify';
import { IInteractionStrategy, InteractionType } from './interaction-strategy.interface';

@injectable()
export class MockInteraction implements IInteractionStrategy {
  private responses: Map<string, string> = new Map();

  constructor() {
    this.setupDefaultResponses();
  }

  async promptUser(question: string, timeout: number): Promise<string> {
    // 模拟处理延迟
    await new Promise(resolve => setTimeout(resolve, 100));

    // 根据问题内容返回预设响应
    const questionLower = question.toLowerCase();

    if (questionLower.includes('hello') || questionLower.includes('hi')) {
      return this.responses.get('greeting') || 'Hello!';
    } else if (questionLower.includes('help')) {
      return this.responses.get('help') || 'How can I help you?';
    } else if (questionLower.includes('weather')) {
      return this.responses.get('weather') || 'I cannot provide weather information.';
    } else {
      return this.responses.get('default') || 'Mock response for testing.';
    }
  }

  async close(): Promise<void> {
    // 模拟交互不需要清理资源
    this.responses.clear();
  }

  getType(): InteractionType {
    return InteractionType.TERMINAL; // Mock使用TERMINAL类型
  }

  /**
   * 设置模拟响应
   */
  setMockResponse(key: string, response: string): void {
    this.responses.set(key, response);
  }

  private setupDefaultResponses(): void {
    this.responses.set('default', 'Mock response for testing.');
    this.responses.set('greeting', 'Hello! I\'m a mock interaction.');
    this.responses.set('help', 'I can help you with various tasks.');
    this.responses.set('weather', 'I\'m sorry, but I cannot provide real weather information.');
  }
}
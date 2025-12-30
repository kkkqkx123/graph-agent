/**
 * 用户交互策略接口
 * 
 * 定义用户交互的标准接口，支持多种交互方式（终端、Web界面等）
 */
export interface UserInteractionStrategy {
  /**
   * 提示用户输入
   * @param question 提示问题
   * @param timeout 超时时间（毫秒）
   * @returns 用户输入的内容
   */
  promptUser(question: string, timeout: number): Promise<string>;
  
  /**
   * 关闭交互资源
   */
  close(): Promise<void>;
}

/**
 * 终端交互策略
 * 
 * 使用Node.js readline模块实现终端用户交互
 */
export class TerminalInteraction implements UserInteractionStrategy {
  private rlInterface: any = null;

  async promptUser(question: string, timeout: number): Promise<string> {
    // 延迟导入readline，避免在非Node.js环境中报错
    const readline = await import('readline');
    
    if (!this.rlInterface) {
      this.rlInterface = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }

    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | null = null;
      let resolved = false;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      // 设置超时
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          if (resolved) return;
          resolved = true;
          cleanup();
          reject(new Error(`用户输入超时 (${timeout}ms)`));
        }, timeout);
      }

      // 使用question方法等待用户输入
      this.rlInterface.question(question, (input: string) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(input.trim());
      });
    });
  }

  async close(): Promise<void> {
    if (this.rlInterface) {
      this.rlInterface.close();
      this.rlInterface = null;
    }
  }
}

/**
 * 模拟交互策略
 * 
 * 用于测试环境，模拟用户输入
 */
export class MockInteraction implements UserInteractionStrategy {
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
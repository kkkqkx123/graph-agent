import { injectable } from 'inversify';
import { LLMRequest } from '../../../../domain/llm/entities/llm-request';

@injectable()
export class TokenCalculator {
  /**
   * 计算LLM请求的token数量
   * 这是一个简化的实现，实际应用中应该使用特定模型的tokenizer
   */
  async calculateTokens(request: LLMRequest): Promise<number> {
    let totalTokens = 0;

    // 计算每个消息的token数量
    for (const message of request.messages) {
      totalTokens += this.calculateTextTokens(message.content);
      // 添加角色和格式化的开销
      totalTokens += 4; // 大约每个消息的格式开销
    }

    // 添加其他参数的token开销
    if (request.temperature !== undefined) {
      totalTokens += 1;
    }
    if (request.maxTokens !== undefined) {
      totalTokens += 1;
    }
    if (request.stop) {
      totalTokens += this.calculateTextTokens(request.stop);
    }

    return Math.ceil(totalTokens);
  }

  /**
   * 计算文本的token数量
   * 这是一个简化的实现，假设平均每个token约4个字符
   */
  private calculateTextTokens(text: string): number {
    if (!text) return 0;
    
    // 简单的启发式方法：平均每个token约4个字符
    // 这不是精确的，但对于估算足够了
    return Math.ceil(text.length / 4);
  }

  /**
   * 计算特定模型的token数量
   * 在实际应用中，这里应该使用特定模型的tokenizer
   */
  async calculateTokensForModel(text: string, model: string): Promise<number> {
    // 这里可以根据不同的模型使用不同的tokenizer
    // 例如，对于OpenAI的模型，可以使用tiktoken库
    
    switch (model.toLowerCase()) {
      case 'gpt-3.5-turbo':
      case 'gpt-4':
      case 'gpt-4-turbo':
        // 对于OpenAI模型，可以使用tiktoken
        return this.calculateTextTokens(text);
      
      case 'claude-3-opus':
      case 'claude-3-sonnet':
      case 'claude-3-haiku':
        // 对于Anthropic模型
        return this.calculateTextTokens(text);
      
      case 'gemini-pro':
      case 'gemini-pro-vision':
        // 对于Google Gemini模型
        return this.calculateTextTokens(text);
      
      default:
        // 默认使用通用计算方法
        return this.calculateTextTokens(text);
    }
  }

  /**
   * 估算响应的token数量
   * 基于请求的复杂度和历史响应模式
   */
  estimateResponseTokens(request: LLMRequest): number {
    // 基于请求长度估算响应长度
    const requestTokens = this.calculateTextTokens(
      request.messages.map(m => m.content).join(' ')
    );
    
    // 通常响应长度是请求长度的一定比例
    // 这里使用简单的启发式方法
    const responseRatio = 0.5; // 响应通常是请求的50%长度
    const baseResponseTokens = Math.ceil(requestTokens * responseRatio);
    
    // 考虑maxTokens限制
    if (request.maxTokens) {
      return Math.min(baseResponseTokens, request.maxTokens);
    }
    
    // 设置合理的默认上限
    return Math.min(baseResponseTokens, 1000);
  }

  /**
   * 计算对话历史的token数量
   */
  calculateConversationTokens(messages: Array<{ role: string; content: string }>): number {
    let totalTokens = 0;
    
    for (const message of messages) {
      totalTokens += this.calculateTextTokens(message.content);
      totalTokens += 4; // 格式开销
    }
    
    return totalTokens;
  }

  /**
   * 检查是否超过token限制
   */
  isWithinTokenLimit(request: LLMRequest, maxTokens: number): boolean {
    const requestTokens = this.calculateTextTokens(
      request.messages.map(m => m.content).join(' ')
    );
    
    // 考虑响应token和格式开销
    const estimatedResponseTokens = this.estimateResponseTokens(request);
    const formatOverhead = request.messages.length * 4;
    
    const totalEstimatedTokens = requestTokens + estimatedResponseTokens + formatOverhead;
    
    return totalEstimatedTokens <= maxTokens;
  }

  /**
   * 截断消息以适应token限制
   */
  truncateMessages(messages: Array<{ role: string; content: string }>, maxTokens: number): Array<{ role: string; content: string }> {
    // 保留系统消息
    const systemMessages = messages.filter(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');
    
    let currentTokens = 0;
    const truncatedMessages: Array<{ role: string; content: string }> = [...systemMessages];
    
    // 计算系统消息的token
    for (const message of systemMessages) {
      currentTokens += this.calculateTextTokens(message.content) + 4;
    }
    
    // 从最新消息开始添加，直到达到限制
    for (let i = otherMessages.length - 1; i >= 0; i--) {
      const message = otherMessages[i];
      const messageTokens = this.calculateTextTokens(message.content) + 4;
      
      if (currentTokens + messageTokens <= maxTokens) {
        truncatedMessages.unshift(message);
        currentTokens += messageTokens;
      } else {
        break;
      }
    }
    
    return truncatedMessages;
  }
}
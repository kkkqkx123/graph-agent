/**
 * HumanRelay服务实现
 *
 * 负责HumanRelay业务逻辑编排
 * 简化版本：移除交互策略，直接使用简单实现
 */

import { injectable } from 'inversify';
import { LLMRequest } from '../../domain/llm/entities/llm-request';
import { LLMResponse } from '../../domain/llm/entities/llm-response';
import { LLMMessage, LLMMessageRole } from '../../domain/llm/value-objects/llm-message';
import { HumanRelayMode } from '../../domain/llm/value-objects/human-relay-mode';

/**
 * HumanRelay配置接口
 */
export interface HumanRelayConfig {
  mode: HumanRelayMode;
  maxHistoryLength: number;
  defaultTimeout: number;
  templates?: {
    single?: string;
    multi?: string;
  };
}

/**
 * HumanRelay服务接口
 */
export interface IHumanRelayService {
  /**
   * 处理HumanRelay请求
   * @param request LLM请求
   * @param config HumanRelay配置
   * @returns LLM响应
   */
  processRequest(request: LLMRequest, config: HumanRelayConfig): Promise<LLMResponse>;
}

/**
 * 提示数据结构
 */
interface Prompt {
  id: string;
  content: string;
  mode: HumanRelayMode;
  conversationContext?: string;
  status: string;
  createdAt: Date;
  timeout: number;
}

@injectable()
export class HumanRelay implements IHumanRelayService {
  private conversationHistory: any[] = [];

  async processRequest(request: LLMRequest, config: HumanRelayConfig): Promise<LLMResponse> {
    try {
      // 1. 构建提示
      const prompt = this.buildPrompt(request, config);

      // 2. 发送提示并等待用户响应（简化实现）[后续在interfaces层设计]
      const userResponse = await this.sendPromptAndWaitForResponse(prompt, config.defaultTimeout);

      // 3. 构建LLM响应
      return this.createLLMResponse(userResponse, request);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 构建提示
   */
  private buildPrompt(request: LLMRequest, config: HumanRelayConfig): Prompt {
    // 转换消息格式
    const iLLMMessages = request.messages.map(msg => ({
      role: this.convertMessageRole(msg.getRole()),
      content: msg.getContent(),
      metadata: {},
    }));

    // 构建内容和上下文
    let content: string;
    let conversationContext: string | undefined;

    if (config.mode === HumanRelayMode.SINGLE) {
      // 单轮模式：合并所有消息作为完整上下文
      content = iLLMMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    } else {
      // 多轮模式：只使用最新消息作为增量内容
      const latestMessage = iLLMMessages[iLLMMessages.length - 1];
      if (!latestMessage) {
        throw new Error('消息列表不能为空');
      }

      // 历史消息作为上下文（除了最新消息）
      const historyMessages = iLLMMessages.slice(0, -1);
      conversationContext =
        historyMessages.length > 0
          ? historyMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n')
          : undefined;

      content = `${latestMessage.role}: ${latestMessage.content}`;
    }

    return {
      id: this.generateId(),
      content,
      mode: config.mode,
      conversationContext,
      status: 'created',
      createdAt: new Date(),
      timeout: config.defaultTimeout,
    };
  }

  /**
   * 转换消息角色
   */
  private convertMessageRole(role: LLMMessageRole): string {
    switch (role) {
      case LLMMessageRole.SYSTEM:
        return 'system';
      case LLMMessageRole.USER:
        return 'user';
      case LLMMessageRole.ASSISTANT:
        return 'assistant';
      case LLMMessageRole.TOOL:
        return 'tool';
      default:
        return 'user';
    }
  }

  /**
   * 发送提示并等待响应（简化实现）
   */
  private async sendPromptAndWaitForResponse(prompt: Prompt, timeout: number): Promise<string> {
    // 简化实现：直接返回模拟响应
    console.log('HumanRelay提示:', prompt.content);
    console.log('等待用户输入...');

    // 模拟用户输入延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    return '这是模拟的用户响应。在实际实现中，这里应该等待真实用户输入。';
  }

  /**
   * 创建LLM响应
   */
  private createLLMResponse(userResponse: string, request: LLMRequest): LLMResponse {
    const promptTokens = this.estimateTokensSync(request);
    const completionTokens = this.estimateTokensSync(userResponse);

    return LLMResponse.create(
      request.id,
      'human-relay',
      [
        {
          index: 0,
          message: LLMMessage.createAssistant(userResponse),
          finish_reason: 'stop',
        },
      ],
      {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      'stop',
      0,
      {
        metadata: {
          responseType: 'simulated',
        },
      }
    );
  }

  /**
   * 估算token数量（内部方法）
   */
  private estimateTokensSync(request: LLMRequest | string): number {
    const text =
      typeof request === 'string' ? request : request.messages.map(m => m.getContent()).join(' ');
    // 简单估算：1个字符约等于0.25个token
    return Math.ceil(text.length * 0.25);
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

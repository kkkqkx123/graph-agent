/**
 * LLM Call Manager
 *
 * 负责管理 LLM 调用历史
 */

import { injectable, inject } from 'inversify';
import { LLMCall } from '../../../domain/interaction/value-objects/llm-call';
import { InteractionTokenUsage } from '../../../domain/interaction/value-objects/token-usage';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * LLM Call Manager 接口
 */
export interface ILLMCallManager {
  /**
   * 添加 LLM 调用
   */
  addLLMCall(llmCall: LLMCall): void;

  /**
   * 获取所有 LLM 调用
   */
  getLLMCalls(): LLMCall[];

  /**
   * 获取指定 ID 的 LLM 调用
   */
  getLLMCall(id: string): LLMCall | undefined;

  /**
   * 清空 LLM 调用历史
   */
  clearLLMCalls(): void;

  /**
   * 获取 LLM 调用数量
   */
  getLLMCallCount(): number;

  /**
   * 获取总 Token 使用情况
   */
  getTotalTokenUsage(): InteractionTokenUsage;
}

/**
 * LLM Call Manager 实现
 */
@injectable()
export class LLMCallManager implements ILLMCallManager {
  private llmCalls: LLMCall[] = [];

  constructor(@inject('Logger') private readonly logger: ILogger) {}

  addLLMCall(llmCall: LLMCall): void {
    this.llmCalls.push(llmCall);
    this.logger.debug('添加 LLM 调用', { model: llmCall.model });
  }

  getLLMCalls(): LLMCall[] {
    return [...this.llmCalls];
  }

  getLLMCall(id: string): LLMCall | undefined {
    return this.llmCalls.find(call => call.id === id);
  }

  clearLLMCalls(): void {
    this.llmCalls = [];
    this.logger.debug('清空 LLM 调用历史');
  }

  getLLMCallCount(): number {
    return this.llmCalls.length;
  }

  getTotalTokenUsage(): InteractionTokenUsage {
    let promptTokens = 0;
    let completionTokens = 0;

    for (const call of this.llmCalls) {
      if (call.usage) {
        promptTokens += call.usage.promptTokens;
        completionTokens += call.usage.completionTokens;
      }
    }

    return new InteractionTokenUsage({
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    });
  }
}
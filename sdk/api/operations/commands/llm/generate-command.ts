/**
 * GenerateCommand - LLM生成命令
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '@modular-agent/types/command';
import type { LLMRequest, LLMResult } from '@modular-agent/types/llm';
import { LLMWrapper } from '@modular-agent/sdk/core/llm/wrapper';

/**
 * LLM生成命令
 */
export class GenerateCommand extends BaseCommand<LLMResult> {
  constructor(
    private readonly request: LLMRequest,
    private readonly llmWrapper: LLMWrapper,
  ) {
    super();
  }

  protected async executeInternal(): Promise<LLMResult> {
    const result = await this.llmWrapper.generate(this.request);
    return result;
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    if (!this.request.messages || this.request.messages.length === 0) {
      errors.push('消息列表不能为空');
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }

  getMetadata(): CommandMetadata {
    return {
      name: 'GenerateCommand',
      description: 'LLM非流式生成',
      category: 'execution',
      requiresAuth: true,
      version: '1.0.0'
    };
  }
}
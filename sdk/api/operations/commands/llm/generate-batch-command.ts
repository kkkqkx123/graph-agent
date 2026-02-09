/**
 * GenerateBatchCommand - LLM批量生成命令
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '../../../types/command';
import type { LLMRequest, LLMResult } from '../../../../types/llm';
import { LLMWrapper } from '../../../../core/llm/wrapper';

/**
 * LLM批量生成命令
 */
export class GenerateBatchCommand extends BaseCommand<LLMResult[]> {
  constructor(
    private readonly requests: LLMRequest[],
    private readonly llmWrapper: LLMWrapper,
  ) {
    super();
  }

  protected async executeInternal(): Promise<LLMResult[]> {
    const results = await Promise.all(
      this.requests.map(request => this.llmWrapper.generate(request))
    );
    return results;
  }

  validate(): CommandValidationResult {
    const errors: string[] = [];

    if (!this.requests || this.requests.length === 0) {
      errors.push('请求列表不能为空');
    }

    for (let i = 0; i < this.requests.length; i++) {
      const request = this.requests[i];
      if (!request || !request.messages || request.messages.length === 0) {
        errors.push(`请求${i}的消息列表不能为空`);
      }
    }

    return errors.length > 0 ? validationFailure(errors) : validationSuccess();
  }

  getMetadata(): CommandMetadata {
    return {
      name: 'GenerateBatchCommand',
      description: 'LLM批量生成',
      category: 'execution',
      requiresAuth: true,
      version: '1.0.0'
    };
  }
}
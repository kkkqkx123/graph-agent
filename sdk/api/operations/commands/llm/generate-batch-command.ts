/**
 * GenerateBatchCommand - LLM批量生成命令
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '../../../core/command';
import { success, failure, ExecutionResult } from '../../../types/execution-result';
import type { LLMRequest, LLMResult } from '../../../../types/llm';
import { LLMWrapper } from '../../../../core/llm/wrapper';

/**
 * LLM批量生成命令
 */
export class GenerateBatchCommand extends BaseCommand<LLMResult[]> {
  constructor(
    private readonly requests: LLMRequest[],
    private readonly llmWrapper: LLMWrapper
  ) {
    super();
  }

  async execute(): Promise<ExecutionResult<LLMResult[]>> {
    try {
      const results = await Promise.all(
        this.requests.map(request => this.llmWrapper.generate(request))
      );
      return success(results, this.getExecutionTime());
    } catch (error) {
      return failure<LLMResult[]>(
        error instanceof Error ? error.message : String(error),
        this.getExecutionTime()
      );
    }
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
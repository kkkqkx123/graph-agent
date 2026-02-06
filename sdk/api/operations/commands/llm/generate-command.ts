/**
 * GenerateCommand - LLM生成命令
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '../../../types/command';
import { success, failure, ExecutionResult } from '../../../types/execution-result';
import type { LLMRequest, LLMResult } from '../../../../types/llm';
import { LLMWrapper } from '../../../../core/llm/wrapper';

/**
 * LLM生成命令
 */
export class GenerateCommand extends BaseCommand<LLMResult> {
  constructor(
    private readonly request: LLMRequest,
    private readonly llmWrapper: LLMWrapper
  ) {
    super();
  }

  async execute(): Promise<ExecutionResult<LLMResult>> {
    try {
      const result = await this.llmWrapper.generate(this.request);
      return success(result, this.getExecutionTime());
    } catch (error) {
      return failure<LLMResult>(
        error instanceof Error ? error.message : String(error),
        this.getExecutionTime()
      );
    }
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
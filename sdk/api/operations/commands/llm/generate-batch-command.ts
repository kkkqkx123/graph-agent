/**
 * GenerateBatchCommand - LLM批量生成命令
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '../../../types/command';
import type { LLMRequest, LLMResult } from '@modular-agent/types';
import { APIDependencyManager } from '../../../core/sdk-dependencies';

/**
 * LLM批量生成命令
 */
export class GenerateBatchCommand extends BaseCommand<LLMResult[]> {
  constructor(
    private readonly requests: LLMRequest[],
    private readonly dependencies: APIDependencyManager
  ) {
    super();
  }

  protected async executeInternal(): Promise<LLMResult[]> {
    const llmWrapper = this.dependencies.getLLMWrapper();
    const results = await Promise.all(
      this.requests.map(request => llmWrapper.generate(request))
    );
    
    // 处理 Result 类型，提取成功的结果或抛出错误
    const llmResults: LLMResult[] = [];
    for (const result of results) {
      if (result.isErr()) {
        throw result.error;
      }
      llmResults.push(result.value);
    }
    
    return llmResults;
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
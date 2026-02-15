/**
 * GenerateCommand - LLM生成命令
 */

import { BaseCommand, CommandMetadata, CommandValidationResult, validationSuccess, validationFailure } from '../../../types/command';
import type { LLMRequest, LLMResult } from '@modular-agent/types';
import { APIDependencyManager } from '../../../core/sdk-dependencies';

/**
 * LLM生成命令
 */
export class GenerateCommand extends BaseCommand<LLMResult> {
  constructor(
    private readonly request: LLMRequest,
    private readonly dependencies: APIDependencyManager
  ) {
    super();
  }

  protected async executeInternal(): Promise<LLMResult> {
    const llmWrapper = this.dependencies.getLLMWrapper();
    const result = await llmWrapper.generate(this.request);
    
    // 处理 Result 类型，提取成功的结果或抛出错误
    if (result.isErr()) {
      throw result.error;
    }
    
    return result.value;
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
/**
 * 提示词模块规则
 */

import { IModuleRule, MergeStrategy } from '../config/loading/types';
import { PromptLoader } from './loaders/prompt-loader';
import { ILogger } from '@shared/types/logger';

/**
 * 创建提示词模块规则
 */
export function createPromptModuleRule(logger: ILogger): IModuleRule {
  return {
    moduleType: 'prompts',
    patterns: [
      'prompts/system/**/*.md',
      'prompts/rules/**/*.md',
      'prompts/user_commands/**/*.md',
      'prompts/context/**/*.md',
      'prompts/examples/**/*.md',
      'prompts/constraints/**/*.md',
      'prompts/format/**/*.md'
    ],
    priority: 70,
    loader: new PromptLoader(logger),
    schema: {
      type: 'object',
      properties: {
        prompts: {
          type: 'object'
        }
      }
    } as any,
    dependencies: ['global'],
    mergeStrategy: MergeStrategy.MERGE_DEEP
  };
}
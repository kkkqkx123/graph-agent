/**
 * LLM模块规则定义
 */

import { IModuleRule, MergeStrategy } from '../types';
import { IModuleLoader } from '../types';
import { ILogger } from '@shared/types/logger';

/**
 * LLM模块Schema
 */
export const LLMSchema = {
  type: 'object',
  properties: {
    providers: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          provider: { type: 'string' },
          base_url: { type: 'string' },
          api_key: { type: 'string' },
          models: { type: 'array', items: { type: 'string' } }
        },
        required: ['provider', 'base_url']
      }
    },
    groups: {
      type: 'object',
      additionalProperties: {
        type: 'object'
      }
    }
  }
};

/**
 * 创建LLM模块规则
 */
export function createLLMModuleRule(
  loader: IModuleLoader,
  logger: ILogger
): IModuleRule {
  return {
    moduleType: 'llm',
    patterns: [
      'llms/_group.toml',
      'llms/provider/**/common.toml',
      'llms/provider/**/*.toml',
      'llms/groups/*.toml',
      'llms/polling_pools/*.toml',
      'llms/*.toml'
    ],
    priority: 100,
    loader,
    schema: LLMSchema as any,
    dependencies: ['global'],
    mergeStrategy: MergeStrategy.MERGE_DEEP
  };
}

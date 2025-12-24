/**
 * 提示模块规则定义
 */

import { IModuleRule, MergeStrategy } from '../types';
import { IModuleLoader } from '../types';
import { ILogger } from '@shared/types/logger';

/**
 * 提示模块Schema
 */
export const PromptSchema = {
  type: 'object',
  properties: {
    templates: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          template: { type: 'string' },
          variables: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                description: { type: 'string' },
                required: { type: 'boolean' },
                default: {}
              },
              required: ['type', 'description']
            }
          }
        },
        required: ['name', 'template']
      }
    },
    categories: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          templates: { type: 'array', items: { type: 'string' } }
        },
        required: ['description']
      }
    }
  }
};

/**
 * 创建提示模块规则
 */
export function createPromptModuleRule(
  loader: IModuleLoader,
  logger: ILogger
): IModuleRule {
  return {
    moduleType: 'prompts',
    patterns: [
      'prompts/_templates.toml',
      'prompts/categories/*.toml',
      'prompts/templates/**/*.toml',
      'prompts/*.toml'
    ],
    priority: 80,
    loader,
    schema: PromptSchema as any,
    dependencies: ['global'],
    mergeStrategy: MergeStrategy.MERGE_DEEP
  };
}

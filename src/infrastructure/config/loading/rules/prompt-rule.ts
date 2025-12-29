/**
 * 提示模块规则定义
 *
 * 支持简化的提示词配置格式：
 * - 基本提示词：包含 name, description, content
 * - 模板定义：包含 name, description, template, variables
 */

import { IModuleRule, MergeStrategy } from '../types';
import { IModuleLoader } from '../types';
import { ILogger } from '../../../../domain/common/types';

/**
 * 提示模块Schema（简化版）
 */
export const PromptSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    content: { type: 'string' },
    template: {
      type: 'object',
      additionalProperties: { type: 'string' }
    },
    variables: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          required: { type: 'boolean' },
          description: { type: 'string' }
        },
        required: ['required']
      }
    },
    metadata: {
      type: 'object',
      properties: {
        role: { type: 'string' },
        priority: { type: 'number' }
      }
    }
  },
  anyOf: [
    { required: ['name', 'content'] },  // 基本提示词
    { required: ['name', 'template'] }  // 模板定义
  ]
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
      'prompts/**/*.md',
      'prompts/**/*.toml'
    ],
    priority: 100,
    loader,
    schema: PromptSchema as any,
    dependencies: ['global'],
    mergeStrategy: MergeStrategy.MERGE_DEEP
  };
}

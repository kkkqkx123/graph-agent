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
 * 构建文件路径（单一处理逻辑）
 *
 * 引用格式说明：
 * - 简单引用：category.name（如 system.assistant）
 *   - 查找：configs/prompts/{category}/{name}.toml
 * - 复合引用：category.composite.part（如 system.coder.index 或 system.coder.01_code_style）
 *   - 查找：configs/prompts/{category}/{composite}/{part}.toml
 *
 * 注意：采用单一处理逻辑，不尝试多种可能的路径，确保执行逻辑可预测
 *
 * @param category 类别
 * @param name 名称（可能包含复合名称，如 "coder.index" 或 "coder.01_code_style"）
 * @returns 文件路径
 */
export function buildFilePath(category: string, name: string): string {
  // 处理复合引用（如 "coder.index" 或 "coder.01_code_style"）
  if (name.includes('.')) {
    const parts = name.split('.');
    const dirPath = `configs/prompts/${category}/${parts.slice(0, -1).join('/')}`;
    const fileName = parts[parts.length - 1];
    return `${dirPath}/${fileName}.toml`;
  }

  // 简单引用：category.name（如 system.assistant）
  return `configs/prompts/${category}/${name}.toml`;
}

/**
 * 创建提示模块规则
 */
export function createPromptModuleRule(
  loader: IModuleLoader,
  logger: ILogger
): IModuleRule {
  return {
    moduleType: 'prompts',
    patterns: ['prompts/**/*.toml'],
    priority: 100,
    loader,
    schema: PromptSchema as any,
    dependencies: ['global'],
    mergeStrategy: MergeStrategy.MERGE_DEEP
  };
}

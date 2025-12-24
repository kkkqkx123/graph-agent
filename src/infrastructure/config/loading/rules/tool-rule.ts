/**
 * 工具模块规则定义
 */

import { IModuleRule, MergeStrategy } from '../types';
import { IModuleLoader } from '../types';
import { ILogger } from '@shared/types/logger';

/**
 * 工具模块Schema
 */
export const ToolSchema = {
  type: 'object',
  properties: {
    tool_types: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          class_path: { type: 'string' },
          description: { type: 'string' },
          enabled: { type: 'boolean' }
        },
        required: ['class_path', 'description', 'enabled']
      }
    },
    tool_sets: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          enabled: { type: 'boolean' },
          tools: { type: 'array', items: { type: 'string' } }
        },
        required: ['description', 'enabled', 'tools']
      }
    }
  }
};

/**
 * 创建工具模块规则
 */
export function createToolModuleRule(
  loader: IModuleLoader,
  logger: ILogger
): IModuleRule {
  return {
    moduleType: 'tools',
    patterns: [
      'tools/__registry__.toml',
      'tools/builtin/*.toml',
      'tools/native/*.toml',
      'tools/rest/*.toml',
      'tools/mcp/*.toml'
    ],
    priority: 90,
    loader,
    schema: ToolSchema as any,
    dependencies: ['global'],
    mergeStrategy: MergeStrategy.MERGE_DEEP
  };
}

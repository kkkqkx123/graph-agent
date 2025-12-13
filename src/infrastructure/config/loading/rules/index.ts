/**
 * 预定义模块规则
 */

import { IModuleRule, MergeStrategy } from '../types';
import { LLMLoader } from '../loaders/llm-loader';
import { ToolLoader } from '../loaders/tool-loader';
import { ILogger } from '@shared/types/logger';

// LLM模块Schema（简化版）
const LLMSchema = {
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

// 工具模块Schema（简化版）
const ToolSchema = {
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
 * 创建LLM模块规则
 */
export function createLLMModuleRule(logger: ILogger): IModuleRule {
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
    loader: new LLMLoader(logger),
    schema: LLMSchema as any,
    dependencies: ['global'],
    mergeStrategy: MergeStrategy.MERGE_DEEP
  };
}

/**
 * 创建工具模块规则
 */
export function createToolModuleRule(logger: ILogger): IModuleRule {
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
    loader: new ToolLoader(logger),
    schema: ToolSchema as any,
    dependencies: ['global'],
    mergeStrategy: MergeStrategy.MERGE_DEEP
  };
}

/**
 * 获取所有预定义模块规则
 */
export function getPredefinedModuleRules(logger: ILogger): IModuleRule[] {
  return [
    createLLMModuleRule(logger),
    createToolModuleRule(logger)
  ];
}
/**
 * 配置加载规则模块
 * 
 * 简化版本：每个模块一个规则文件，直接包含Schema和规则定义
 * 通过依赖注入容器管理加载器和规则的关系
 */

import { IModuleRule } from '../types';
import { ILogger } from '@shared/types/logger';
import { createLLMModuleRule } from './llm-rule';
import { createToolModuleRule } from './tool-rule';
import { createPromptModuleRule } from './prompt-rule';

// 导出所有Schema
export { LLMSchema } from './llm-rule';
export { ToolSchema } from './tool-rule';
export { PromptSchema } from './prompt-rule';

// 导出所有规则创建函数
export { createLLMModuleRule } from './llm-rule';
export { createToolModuleRule } from './tool-rule';
export { createPromptModuleRule } from './prompt-rule';

/**
 * 创建所有预定义模块规则
 * 
 * @param loaders 加载器映射表
 * @param logger 日志记录器
 * @returns 模块规则数组
 */
export function createAllModuleRules(
  loaders: Map<string, any>,
  logger: ILogger
): IModuleRule[] {
  const rules: IModuleRule[] = [];

  // 创建LLM规则
  if (loaders.has('llm')) {
    rules.push(createLLMModuleRule(loaders.get('llm'), logger));
  }

  // 创建工具规则
  if (loaders.has('tools')) {
    rules.push(createToolModuleRule(loaders.get('tools'), logger));
  }

  // 创建提示规则
  if (loaders.has('prompts')) {
    rules.push(createPromptModuleRule(loaders.get('prompts'), logger));
  }

  return rules;
}

/**
 * 创建单个模块规则
 * 
 * @param moduleType 模块类型
 * @param loader 加载器实例
 * @param logger 日志记录器
 * @returns 模块规则
 */
export function createModuleRule(
  moduleType: string,
  loader: any,
  logger: ILogger
): IModuleRule {
  switch (moduleType) {
    case 'llm':
      return createLLMModuleRule(loader, logger);
    case 'tools':
      return createToolModuleRule(loader, logger);
    case 'prompts':
      return createPromptModuleRule(loader, logger);
    default:
      throw new Error(`不支持的模块类型: ${moduleType}`);
  }
}

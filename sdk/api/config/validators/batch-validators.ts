/**
 * 批量配置验证函数
 * 提供批量验证配置的功能
 * 
 * 设计原则：
 * - 所有函数都是纯函数
 * - 不持有任何状态
 * - 返回批量验证结果
 */

import type { WorkflowDefinition } from '@modular-agent/types';
import type { NodeTemplate } from '@modular-agent/types';
import type { TriggerTemplate } from '@modular-agent/types';
import type { Script } from '@modular-agent/types';
import type { ConfigFile } from '../types.js';
import { ok, err, all } from '@modular-agent/common-utils';
import type { Result } from '@modular-agent/types';
import { ValidationError } from '@modular-agent/types';
import { validateWorkflowConfig } from './workflow-validator.js';
import { validateNodeTemplateConfig } from './node-template-validator.js';
import { validateTriggerTemplateConfig } from './trigger-template-validator.js';
import { validateScriptConfig } from './script-validator.js';

/**
 * 批量验证工作流配置
 * @param configs 配置对象数组
 * @returns 验证结果数组
 */
export function validateBatchWorkflows(
  configs: ConfigFile[]
): Result<WorkflowDefinition[], ValidationError[]> {
  const results: Result<WorkflowDefinition, ValidationError[]>[] = configs.map(config =>
    validateWorkflowConfig(config)
  );

  // 组合结果，全部成功时返回成功，否则返回第一个错误
  return all(results);
}

/**
 * 批量验证节点模板配置
 * @param configs 配置对象数组
 * @returns 验证结果数组
 */
export function validateBatchNodeTemplates(
  configs: ConfigFile[]
): Result<NodeTemplate[], ValidationError[]> {
  const results: Result<NodeTemplate, ValidationError[]>[] = configs.map(config =>
    validateNodeTemplateConfig(config)
  );

  // 组合结果，全部成功时返回成功，否则返回第一个错误
  return all(results);
}

/**
* 批量验证触发器模板配置
* @param configs 配置对象数组
* @returns 验证结果数组
*/
export function validateBatchTriggerTemplates(
  configs: ConfigFile[]
): Result<TriggerTemplate[], ValidationError[]> {
  const results: Result<TriggerTemplate, ValidationError[]>[] = configs.map(config =>
    validateTriggerTemplateConfig(config)
  );

  // 组合结果，全部成功时返回成功，否则返回第一个错误
  return all(results);
}

/**
 * 批量验证脚本配置
 * @param configs 配置对象数组
 * @returns 验证结果数组
 */
export function validateBatchScripts(
  configs: ConfigFile[]
): Result<Script[], ValidationError[]> {
  const results: Result<Script, ValidationError[]>[] = configs.map(config =>
    validateScriptConfig(config)
  );

  // 组合结果，全部成功时返回成功，否则返回第一个错误
  return all(results);
}

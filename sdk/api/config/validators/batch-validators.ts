/**
 * 批量配置验证函数
 * 提供批量验证配置的功能
 * 
 * 设计原则：
 * - 所有函数都是纯函数
 * - 不持有任何状态
 * - 返回批量验证结果
 */

import type { WorkflowDefinition } from '@modular-agent/types/workflow';
import type { NodeTemplate } from '@modular-agent/types/node-template';
import type { TriggerTemplate } from '@modular-agent/types/trigger-template';
import type { Script } from '@modular-agent/types/code';
import type { ConfigFile } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils/result-utils';
import type { Result } from '@modular-agent/types/result';
import { ValidationError } from '@modular-agent/types/errors';
import { validateWorkflowConfig } from './workflow-validator';
import { validateNodeTemplateConfig } from './node-template-validator';
import { validateTriggerTemplateConfig } from './trigger-template-validator';
import { validateScriptConfig } from './script-validator';

/**
 * 批量验证工作流配置
 * @param configs 配置对象数组
 * @returns 验证结果数组
 */
export function validateBatchWorkflows(
  configs: ConfigFile[]
): Result<WorkflowDefinition[], ValidationError[][]> {
  const results: Result<WorkflowDefinition, ValidationError[]>[] = configs.map(config => 
    validateWorkflowConfig(config)
  );
  
  // 检查是否有验证失败的情况
  const errors = results.filter(r => r.isErr()).map(r => r.error);
  if (errors.length > 0) {
    return err(errors);
  }
  
  // 所有验证都成功，返回成功结果
  const workflows = results.filter(r => r.isOk()).map(r => r.value);
  return ok(workflows);
}

/**
 * 批量验证节点模板配置
 * @param configs 配置对象数组
 * @returns 验证结果数组
 */
export function validateBatchNodeTemplates(
  configs: ConfigFile[]
): Result<NodeTemplate[], ValidationError[][]> {
  const results: Result<NodeTemplate, ValidationError[]>[] = configs.map(config => 
    validateNodeTemplateConfig(config)
  );
  
  // 检查是否有验证失败的情况
  const errors = results.filter(r => r.isErr()).map(r => r.error);
  if (errors.length > 0) {
    return err(errors);
  }
  
  // 所有验证都成功，返回成功结果
  const templates = results.filter(r => r.isOk()).map(r => r.value);
  return ok(templates);
  }

  /**
  * 批量验证触发器模板配置
  * @param configs 配置对象数组
  * @returns 验证结果数组
  */
  export function validateBatchTriggerTemplates(
   configs: ConfigFile[]
  ): Result<TriggerTemplate[], ValidationError[][]> {
   const results: Result<TriggerTemplate, ValidationError[]>[] = configs.map(config => 
     validateTriggerTemplateConfig(config)
   );
   
   // 检查是否有验证失败的情况
   const errors = results.filter(r => r.isErr()).map(r => r.error);
   if (errors.length > 0) {
     return err(errors);
   }
   
   // 所有验证都成功，返回成功结果
   const templates = results.filter(r => r.isOk()).map(r => r.value);
   return ok(templates);
}

/**
 * 批量验证脚本配置
 * @param configs 配置对象数组
 * @returns 验证结果数组
 */
export function validateBatchScripts(
  configs: ConfigFile[]
): Result<Script[], ValidationError[][]> {
  const results: Result<Script, ValidationError[]>[] = configs.map(config => 
    validateScriptConfig(config)
  );
  
  // 检查是否有验证失败的情况
  const errors = results.filter(r => r.isErr()).map(r => r.error);
  if (errors.length > 0) {
    return err(errors);
  }
  
  // 所有验证都成功，返回成功结果
  const scripts = results.filter(r => r.isOk()).map(r => r.value);
  return ok(scripts);
}
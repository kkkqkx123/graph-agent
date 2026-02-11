/**
 * 工作流配置验证函数
 * 负责验证工作流配置的有效性
 * 注意：实际验证逻辑委托给 WorkflowValidator，这里仅作为适配器
 */

import type { WorkflowDefinition } from '@modular-agent/types/workflow';
import type { ConfigFile } from '@modular-agent/types';
import { ConfigType } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils/result-utils';
import type { Result } from '@modular-agent/types/result';
import { ValidationError } from '@modular-agent/types/errors';
import { WorkflowValidator } from '@modular-agent/sdk/core/validation/workflow-validator';

/**
 * 验证工作流配置
 * @param config 配置对象
 * @returns 验证结果
 */
export function validateWorkflowConfig(config: ConfigFile): Result<WorkflowDefinition, ValidationError[]> {
  const workflow = config as WorkflowDefinition;
  const workflowValidator = new WorkflowValidator();
  
  // 委托给 WorkflowValidator 进行验证
  return workflowValidator.validate(workflow);
}
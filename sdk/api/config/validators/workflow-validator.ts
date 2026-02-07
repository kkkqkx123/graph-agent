/**
 * 工作流配置验证器
 * 负责验证工作流配置的有效性
 * 注意：实际验证逻辑委托给 WorkflowValidator，这里仅作为适配器
 */

import type { WorkflowDefinition } from '../../../types/workflow';
import type { ConfigFile } from '../types';
import { ConfigType } from '../types';
import { BaseConfigValidator } from './base-validator';
import { ok, err, type Result } from '../../utils/result';
import { ValidationError } from '../../../types/errors';
import { WorkflowValidator } from '../../../core/validation/workflow-validator';

/**
 * 工作流配置验证器
 */
export class WorkflowConfigValidator extends BaseConfigValidator<ConfigType.WORKFLOW> {
  private workflowValidator: WorkflowValidator;

  constructor() {
    super(ConfigType.WORKFLOW);
    this.workflowValidator = new WorkflowValidator();
  }

  /**
   * 验证工作流配置
   * @param config 配置对象
   * @returns 验证结果
   */
  validate(config: ConfigFile): Result<WorkflowDefinition, ValidationError[]> {
    const workflow = config as WorkflowDefinition;
    
    // 委托给 WorkflowValidator 进行验证
    return this.workflowValidator.validate(workflow);
  }
}
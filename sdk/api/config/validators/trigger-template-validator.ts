/**
 * 触发器模板配置验证函数
 * 负责验证触发器模板配置的有效性
 * 注意：实际验证逻辑完全委托给 trigger-validator 函数，这里仅作为适配器
 */

import type { TriggerTemplate } from '@modular-agent/types';
import type { ConfigFile } from '../types';
import { ok, err } from '@modular-agent/common-utils';
import type { Result } from '@modular-agent/types';
import { ValidationError } from '@modular-agent/types';
import { validateWorkflowTrigger } from '../../../core/validation/trigger-validator';
import {
  validateRequiredFields,
  validateNumberField
} from './base-validator';

/**
 * 验证触发器模板配置
 * @param config 配置对象
 * @returns 验证结果
 */
export function validateTriggerTemplateConfig(config: ConfigFile): Result<TriggerTemplate, ValidationError[]> {
  const template = config as TriggerTemplate;
  const errors: ValidationError[] = [];

  // 验证必需字段
  errors.push(...validateRequiredFields(
    template,
    ['name', 'condition', 'action', 'createdAt', 'updatedAt'],
    'TriggerTemplate'
  ));

  // 验证时间戳
  if (template.createdAt !== undefined) {
    errors.push(...validateNumberField(template.createdAt, 'TriggerTemplate.createdAt', {
      integer: true,
      min: 0
    }));
  }

  if (template.updatedAt !== undefined) {
    errors.push(...validateNumberField(template.updatedAt, 'TriggerTemplate.updatedAt', {
      integer: true,
      min: 0
    }));
  }

  // 完全委托给核心验证器进行触发器配置验证
  // 创建临时 WorkflowTrigger 对象用于验证
  const tempTrigger = {
    id: 'temp-trigger-id',
    name: template.name,
    description: template.description,
    condition: template.condition,
    action: template.action,
    enabled: template.enabled,
    maxTriggers: template.maxTriggers,
    metadata: template.metadata
  };

  const triggerResult = validateWorkflowTrigger(tempTrigger, 'TriggerTemplate');
  if (triggerResult.isErr()) {
    errors.push(...triggerResult.error);
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(template);
}

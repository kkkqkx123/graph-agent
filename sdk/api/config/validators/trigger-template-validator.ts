/**
 * 触发器模板配置验证器
 * 负责验证触发器模板配置的有效性
 */

import type { TriggerTemplate } from '../../../types/trigger-template';
import type { ConfigFile } from '../types';
import { ConfigType } from '../types';
import { BaseConfigValidator } from './base-validator';
import { ok, err, type Result } from '../../utils/result';
import { ValidationError } from '../../../types/errors';
import { EventType } from '../../../types/events';
import { TriggerActionType } from '../../../types/trigger';

/**
 * 触发器模板配置验证器
 */
export class TriggerTemplateConfigValidator extends BaseConfigValidator<ConfigType.TRIGGER_TEMPLATE> {
  constructor() {
    super(ConfigType.TRIGGER_TEMPLATE);
  }

  /**
   * 验证触发器模板配置
   * @param config 配置对象
   * @returns 验证结果
   */
  validate(config: ConfigFile): Result<TriggerTemplate, ValidationError[]> {
    const template = config as TriggerTemplate;
    const errors: ValidationError[] = [];

    // 验证必需字段
    errors.push(...this.validateRequiredFields(
      template,
      ['name', 'condition', 'action', 'createdAt', 'updatedAt'],
      'TriggerTemplate'
    ));

    // 验证名称
    if (template.name) {
      errors.push(...this.validateStringField(template.name, 'TriggerTemplate.name', {
        minLength: 1,
        maxLength: 100
      }));
    }

    // 验证描述
    if (template.description !== undefined) {
      errors.push(...this.validateStringField(template.description, 'TriggerTemplate.description', {
        maxLength: 500
      }));
    }

    // 验证条件对象
    if (template.condition) {
      errors.push(...this.validateObjectField(template.condition, 'TriggerTemplate.condition'));
      
      // 验证事件类型
      if (template.condition.eventType) {
        errors.push(...this.validateEnumField(
          template.condition.eventType,
          'TriggerTemplate.condition.eventType',
          Object.values(EventType)
        ));
      }
    }

    // 验证动作对象
    if (template.action) {
      errors.push(...this.validateObjectField(template.action, 'TriggerTemplate.action'));
      
      // 验证动作类型
      if (template.action.type) {
        errors.push(...this.validateEnumField(
          template.action.type,
          'TriggerTemplate.action.type',
          Object.values(TriggerActionType)
        ));
      }
    }

    // 验证启用状态
    if (template.enabled !== undefined) {
      errors.push(...this.validateBooleanField(template.enabled, 'TriggerTemplate.enabled'));
    }

    // 验证触发次数限制
    if (template.maxTriggers !== undefined) {
      errors.push(...this.validateNumberField(template.maxTriggers, 'TriggerTemplate.maxTriggers', {
        integer: true,
        min: 0
      }));
    }

    // 验证时间戳
    if (template.createdAt !== undefined) {
      errors.push(...this.validateNumberField(template.createdAt, 'TriggerTemplate.createdAt', {
        integer: true,
        min: 0
      }));
    }

    if (template.updatedAt !== undefined) {
      errors.push(...this.validateNumberField(template.updatedAt, 'TriggerTemplate.updatedAt', {
        integer: true,
        min: 0
      }));
    }

    // 验证元数据
    if (template.metadata !== undefined) {
      errors.push(...this.validateObjectField(template.metadata, 'TriggerTemplate.metadata'));
    }

    if (errors.length > 0) {
      return err(errors);
    }

    return ok(template);
  }
}
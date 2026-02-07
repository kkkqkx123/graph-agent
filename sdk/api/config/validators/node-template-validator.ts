/**
 * 节点模板配置验证器
 * 负责验证节点模板配置的有效性
 */

import type { NodeTemplate } from '../../../types/node-template';
import type { ConfigFile } from '../types';
import { ConfigType } from '../types';
import { BaseConfigValidator } from './base-validator';
import { ok, err, type Result } from '../../utils/result';
import { ValidationError } from '../../../types/errors';
import { NodeType } from '../../../types/node';

/**
 * 节点模板配置验证器
 */
export class NodeTemplateConfigValidator extends BaseConfigValidator<ConfigType.NODE_TEMPLATE> {
  constructor() {
    super(ConfigType.NODE_TEMPLATE);
  }

  /**
   * 验证节点模板配置
   * @param config 配置对象
   * @returns 验证结果
   */
  validate(config: ConfigFile): Result<NodeTemplate, ValidationError[]> {
    const template = config as NodeTemplate;
    const errors: ValidationError[] = [];

    // 验证必需字段
    errors.push(...this.validateRequiredFields(
      template,
      ['name', 'type', 'config', 'createdAt', 'updatedAt'],
      'NodeTemplate'
    ));

    // 验证名称
    if (template.name) {
      errors.push(...this.validateStringField(template.name, 'NodeTemplate.name', {
        minLength: 1,
        maxLength: 100
      }));
    }

    // 验证类型
    if (template.type) {
      errors.push(...this.validateEnumField(
        template.type,
        'NodeTemplate.type',
        Object.values(NodeType)
      ));
    }

    // 验证描述
    if (template.description !== undefined) {
      errors.push(...this.validateStringField(template.description, 'NodeTemplate.description', {
        maxLength: 500
      }));
    }

    // 验证配置对象
    if (template.config) {
      errors.push(...this.validateObjectField(template.config, 'NodeTemplate.config'));
    }

    // 验证时间戳
    if (template.createdAt !== undefined) {
      errors.push(...this.validateNumberField(template.createdAt, 'NodeTemplate.createdAt', {
        integer: true,
        min: 0
      }));
    }

    if (template.updatedAt !== undefined) {
      errors.push(...this.validateNumberField(template.updatedAt, 'NodeTemplate.updatedAt', {
        integer: true,
        min: 0
      }));
    }

    // 验证元数据
    if (template.metadata !== undefined) {
      errors.push(...this.validateObjectField(template.metadata, 'NodeTemplate.metadata'));
    }

    if (errors.length > 0) {
      return err(errors);
    }

    return ok(template);
  }
}
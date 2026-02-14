/**
 * 节点模板配置验证函数
 * 负责验证节点模板配置的有效性
 * 注意：实际验证逻辑委托给 NodeValidator，这里仅作为适配器
 */

import type { NodeTemplate } from '@modular-agent/types';
import type { ConfigFile } from '../types';
import { ConfigType } from '../types';
import { ok, err } from '@modular-agent/common-utils';
import type { Result } from '@modular-agent/types';
import { ValidationError } from '@modular-agent/types';
import { NodeValidator } from '../../../core/validation/node-validator';
import { NodeType } from '@modular-agent/types';
import {
  validateRequiredFields,
  validateStringField,
  validateEnumField,
  validateNumberField,
  validateObjectField
} from './base-validator';

/**
 * 验证节点模板配置
 * @param config 配置对象
 * @returns 验证结果
 */
export function validateNodeTemplateConfig(config: ConfigFile): Result<NodeTemplate, ValidationError[]> {
  const template = config as NodeTemplate;
  const errors: ValidationError[] = [];
  const nodeValidator = new NodeValidator();

  // 验证必需字段
  errors.push(...validateRequiredFields(
    template,
    ['name', 'type', 'config', 'createdAt', 'updatedAt'],
    'NodeTemplate'
  ));

  // 验证名称
  if (template.name) {
    errors.push(...validateStringField(template.name, 'NodeTemplate.name', {
      minLength: 1,
      maxLength: 100
    }));
  }

  // 验证类型
  if (template.type) {
    errors.push(...validateEnumField(
      template.type,
      'NodeTemplate.type',
      Object.values(NodeType)
    ));
  }

  // 验证描述
  if (template.description !== undefined) {
    errors.push(...validateStringField(template.description, 'NodeTemplate.description', {
      maxLength: 500
    }));
  }

  // 验证时间戳
  if (template.createdAt !== undefined) {
    errors.push(...validateNumberField(template.createdAt, 'NodeTemplate.createdAt', {
      integer: true,
      min: 0
    }));
  }

  if (template.updatedAt !== undefined) {
    errors.push(...validateNumberField(template.updatedAt, 'NodeTemplate.updatedAt', {
      integer: true,
      min: 0
    }));
  }

  // 验证元数据
  if (template.metadata !== undefined) {
    errors.push(...validateObjectField(template.metadata, 'NodeTemplate.metadata'));
  }

  // 验证节点配置 - 委托给 NodeValidator
  if (template.config) {
    // 创建临时节点对象用于验证配置
    const tempNode = {
      id: 'temp-node-id',
      type: template.type,
      name: template.name,
      description: template.description,
      config: template.config,
      metadata: template.metadata,
      outgoingEdgeIds: [],
      incomingEdgeIds: []
    };

    const configResult = nodeValidator.validateNode(tempNode);
    if (configResult.isErr()) {
      errors.push(...configResult.error);
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(template);
}

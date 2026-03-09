/**
 * 提示词模板配置验证函数
 * 负责验证提示词模板配置的有效性
 */

import type { PromptTemplateConfigFile } from '../types.js';
import type { Result } from '@modular-agent/types';
import { ValidationError, SchemaValidationError } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';
import {
  validateRequiredFields,
  validateStringField,
  validateEnumField,
  validateArrayField
} from './base-validator.js';

/**
 * 验证提示词模板配置
 * @param config 配置对象
 * @returns 验证结果
 */
export function validatePromptTemplateConfig(config: PromptTemplateConfigFile): Result<PromptTemplateConfigFile, ValidationError[]> {
  const errors: ValidationError[] = [];

  // 验证必需字段
  const requiredFields = ['id'];
  errors.push(...validateRequiredFields(config, requiredFields, 'prompt_template'));

  // 验证 id 字段
  if (config.id !== undefined) {
    errors.push(...validateStringField(config.id, 'id', {
      minLength: 1,
      maxLength: 100
    }));
  }

  // 验证 name 字段（如果存在）
  if (config.name !== undefined) {
    errors.push(...validateStringField(config.name, 'name', {
      minLength: 1,
      maxLength: 200
    }));
  }

  // 验证 description 字段（如果存在）
  if (config.description !== undefined) {
    errors.push(...validateStringField(config.description, 'description', {
      maxLength: 1000
    }));
  }

  // 验证 category 字段（如果存在）
  if (config.category !== undefined) {
    errors.push(...validateEnumField(
      config.category,
      'category',
      ['system', 'rules', 'user-command', 'tools', 'composite']
    ));
  }

  // 验证 content 字段（如果存在）
  if (config.content !== undefined) {
    errors.push(...validateStringField(config.content, 'content', {
      minLength: 1
    }));
  }

  // 验证 variables 字段（如果存在）
  if (config.variables !== undefined) {
    errors.push(...validateArrayField(config.variables, 'variables'));
    // 验证每个变量定义
    if (Array.isArray(config.variables)) {
      config.variables.forEach((variable, index) => {
        errors.push(...validateVariableDefinition(variable, index));
      });
    }
  }

  // 验证 fragments 字段（如果存在）
  if (config.fragments !== undefined) {
    errors.push(...validateArrayField(config.fragments, 'fragments'));
    // 验证每个片段ID
    if (Array.isArray(config.fragments)) {
      config.fragments.forEach((fragmentId, index) => {
        errors.push(...validateStringField(fragmentId, `fragments[${index}]`, {
          minLength: 1
        }));
      });
    }
  }

  // 返回验证结果
  if (errors.length > 0) {
    return err(errors);
  }

  return ok(config);
}

/**
 * 验证变量定义
 * @param variable 变量定义
 * @param index 变量索引
 * @returns 验证错误数组
 */
function validateVariableDefinition(variable: any, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `variables[${index}]`;

  // 验证必需字段
  const requiredFields = ['name', 'type', 'required'];
  errors.push(...validateRequiredFields(variable, requiredFields, prefix));

  // 验证 name 字段
  if (variable.name !== undefined) {
    errors.push(...validateStringField(variable.name, `${prefix}.name`, {
      minLength: 1,
      maxLength: 100
    }));
  }

  // 验证 type 字段
  if (variable.type !== undefined) {
    errors.push(...validateEnumField(
      variable.type,
      `${prefix}.type`,
      ['string', 'number', 'boolean', 'object']
    ));
  }

  // 验证 required 字段
  if (variable.required !== undefined && typeof variable.required !== 'boolean') {
    errors.push(new SchemaValidationError(
      `${prefix}.required 必须是布尔类型`,
      {
        field: `${prefix}.required`,
        value: variable.required
      }
    ));
  }

  // 验证 description 字段（如果存在）
  if (variable.description !== undefined) {
    errors.push(...validateStringField(variable.description, `${prefix}.description`, {
      maxLength: 500
    }));
  }

  return errors;
}

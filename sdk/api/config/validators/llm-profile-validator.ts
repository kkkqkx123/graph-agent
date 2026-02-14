/**
 * LLM Profile配置验证函数
 * 负责验证LLM Profile配置的有效性
 */

import type { LLMProfile } from '@modular-agent/types';
import type { ConfigFile } from '../types';
import { ConfigType } from '../types';
import { ok, err } from '@modular-agent/common-utils';
import type { Result } from '@modular-agent/types';
import { ValidationError } from '@modular-agent/types';
import { LLMProvider } from '@modular-agent/types';
import {
  validateRequiredFields,
  validateStringField,
  validateEnumField,
  validateNumberField,
  validateObjectField
} from './base-validator';

/**
 * 验证LLM Profile配置
 * @param config 配置对象
 * @returns 验证结果
 */
export function validateLLMProfileConfig(config: ConfigFile): Result<LLMProfile, ValidationError[]> {
  const profile = config as LLMProfile;
  const errors: ValidationError[] = [];

  // 验证必需字段
  errors.push(...validateRequiredFields(
    profile,
    ['id', 'name', 'provider', 'model', 'apiKey', 'parameters'],
    'LLMProfile'
  ));

  // 验证ID
  if (profile.id) {
    errors.push(...validateStringField(profile.id, 'LLMProfile.id', {
      minLength: 1,
      maxLength: 100
    }));
  }

  // 验证名称
  if (profile.name) {
    errors.push(...validateStringField(profile.name, 'LLMProfile.name', {
      minLength: 1,
      maxLength: 200
    }));
  }

  // 验证提供商
  if (profile.provider) {
    errors.push(...validateEnumField(
      profile.provider,
      'LLMProfile.provider',
      Object.values(LLMProvider)
    ));
  }

  // 验证模型名称
  if (profile.model) {
    errors.push(...validateStringField(profile.model, 'LLMProfile.model', {
      minLength: 1,
      maxLength: 100
    }));
  }

  // 验证API密钥
  if (profile.apiKey) {
    errors.push(...validateStringField(profile.apiKey, 'LLMProfile.apiKey', {
      minLength: 1
    }));
  }

  // 验证基础URL（可选）
  if (profile.baseUrl !== undefined) {
    errors.push(...validateStringField(profile.baseUrl, 'LLMProfile.baseUrl', {
      minLength: 1
    }));
  }

  // 验证参数对象
  if (profile.parameters !== undefined) {
    errors.push(...validateObjectField(profile.parameters, 'LLMProfile.parameters'));
  }

  // 验证请求头（可选）
  if (profile.headers !== undefined) {
    errors.push(...validateObjectField(profile.headers, 'LLMProfile.headers'));
  }

  // 验证超时时间（可选）
  if (profile.timeout !== undefined) {
    errors.push(...validateNumberField(profile.timeout, 'LLMProfile.timeout', {
      min: 0,
      integer: true
    }));
  }

  // 验证最大重试次数（可选）
  if (profile.maxRetries !== undefined) {
    errors.push(...validateNumberField(profile.maxRetries, 'LLMProfile.maxRetries', {
      min: 0,
      integer: true
    }));
  }

  // 验证重试延迟（可选）
  if (profile.retryDelay !== undefined) {
    errors.push(...validateNumberField(profile.retryDelay, 'LLMProfile.retryDelay', {
      min: 0,
      integer: true
    }));
  }

  // 验证元数据（可选）
  if (profile.metadata !== undefined) {
    errors.push(...validateObjectField(profile.metadata, 'LLMProfile.metadata'));
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(profile);
}

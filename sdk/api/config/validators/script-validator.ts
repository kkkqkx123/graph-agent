/**
 * 脚本配置验证器
 * 负责验证脚本配置的有效性
 */

import type { Script } from '../../../types/code';
import type { ConfigFile } from '../types';
import { ConfigType } from '../types';
import { BaseConfigValidator } from './base-validator';
import { ok, err, type Result } from '../../utils/result';
import { ValidationError } from '../../../types/errors';
import { ScriptType } from '../../../types/code';

/**
 * 脚本配置验证器
 */
export class ScriptConfigValidator extends BaseConfigValidator<ConfigType.SCRIPT> {
  constructor() {
    super(ConfigType.SCRIPT);
  }

  /**
   * 验证脚本配置
   * @param config 配置对象
   * @returns 验证结果
   */
  validate(config: ConfigFile): Result<Script, ValidationError[]> {
    const script = config as Script;
    const errors: ValidationError[] = [];

    // 验证必需字段
    errors.push(...this.validateRequiredFields(
      script,
      ['id', 'name', 'type', 'description', 'options'],
      'Script'
    ));

    // 验证ID
    if (script.id) {
      errors.push(...this.validateStringField(script.id, 'Script.id', {
        minLength: 1,
        maxLength: 100
      }));
    }

    // 验证名称
    if (script.name) {
      errors.push(...this.validateStringField(script.name, 'Script.name', {
        minLength: 1,
        maxLength: 100
      }));
    }

    // 验证类型
    if (script.type) {
      errors.push(...this.validateEnumField(
        script.type,
        'Script.type',
        Object.values(ScriptType)
      ));
    }

    // 验证描述
    if (script.description !== undefined) {
      errors.push(...this.validateStringField(script.description, 'Script.description', {
        maxLength: 500
      }));
    }

    // 验证脚本内容或文件路径（至少需要一个）
    if (!script.content && !script.filePath) {
      errors.push(new ValidationError(
        'Script 必须包含 content 或 filePath 中的至少一个',
        'Script',
        script
      ));
    }

    // 验证脚本内容
    if (script.content !== undefined) {
      errors.push(...this.validateStringField(script.content, 'Script.content'));
    }

    // 验证文件路径
    if (script.filePath !== undefined) {
      errors.push(...this.validateStringField(script.filePath, 'Script.filePath'));
    }

    // 验证选项对象
    if (script.options) {
      errors.push(...this.validateObjectField(script.options, 'Script.options'));
      
      // 验证超时时间
      if (script.options.timeout !== undefined) {
        errors.push(...this.validateNumberField(script.options.timeout, 'Script.options.timeout', {
          integer: true,
          min: 0
        }));
      }

      // 验证重试次数
      if (script.options.retries !== undefined) {
        errors.push(...this.validateNumberField(script.options.retries, 'Script.options.retries', {
          integer: true,
          min: 0
        }));
      }

      // 验证重试延迟
      if (script.options.retryDelay !== undefined) {
        errors.push(...this.validateNumberField(script.options.retryDelay, 'Script.options.retryDelay', {
          integer: true,
          min: 0
        }));
      }

      // 验证启用状态
      if (script.options.sandbox !== undefined) {
        errors.push(...this.validateBooleanField(script.options.sandbox, 'Script.options.sandbox'));
      }
    }

    // 验证元数据
    if (script.metadata !== undefined) {
      errors.push(...this.validateObjectField(script.metadata, 'Script.metadata'));
    }

    // 验证启用状态
    if (script.enabled !== undefined) {
      errors.push(...this.validateBooleanField(script.enabled, 'Script.enabled'));
    }

    if (errors.length > 0) {
      return err(errors);
    }

    return ok(script);
  }
}
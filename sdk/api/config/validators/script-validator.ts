/**
 * 脚本配置验证函数
 * 负责验证脚本配置的有效性
 * 注意：实际验证逻辑完全委托给 CodeConfigValidator，这里仅作为适配器
 */

import type { Script } from '@modular-agent/types/code';
import type { ConfigFile } from '../types';
import { ok, err } from '@modular-agent/common-utils/result-utils';
import type { Result } from '@modular-agent/types/result';
import { ValidationError } from '@modular-agent/types/errors';
import { CodeConfigValidator } from '../../../core/validation/code-config-validator';
import {
  validateRequiredFields,
  validateBooleanField
} from './base-validator';

/**
 * 验证脚本配置
 * @param config 配置对象
 * @returns 验证结果
 */
export function validateScriptConfig(config: ConfigFile): Result<Script, ValidationError[]> {
  const script = config as Script;
  const errors: ValidationError[] = [];
  const codeConfigValidator = new CodeConfigValidator();

  // 验证必需字段
  errors.push(...validateRequiredFields(
    script,
    ['id', 'name', 'type', 'description', 'options'],
    'Script'
  ));

  // 验证启用状态
  if (script.enabled !== undefined) {
    errors.push(...validateBooleanField(script.enabled, 'Script.enabled'));
  }

  // 完全委托给 CodeConfigValidator 进行脚本配置验证
  const scriptResult = codeConfigValidator.validateScript(script);
  if (scriptResult.isErr()) {
    errors.push(...scriptResult.error);
  }

  // 验证脚本类型兼容性
  if (script.type && (script.content || script.filePath)) {
    const compatibilityResult = codeConfigValidator.validateScriptTypeCompatibility(
      script.type,
      script.content,
      script.filePath
    );
    if (compatibilityResult.isErr()) {
      errors.push(...compatibilityResult.error);
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(script);
}

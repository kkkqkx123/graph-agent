/**
 * 参数验证器
 * 验证脚本配置和执行参数
 */

import type { Script } from '@modular-agent/types';
import type { ValidationResult } from '../types.js';

/**
 * 参数验证器
 */
export class ParameterValidator {
  /**
   * 验证脚本配置
   * @param script 脚本定义
   * @returns 验证结果
   */
  validate(script: Script): ValidationResult {
    const errors: string[] = [];

    // 验证必需字段
    if (!script.name || typeof script.name !== 'string') {
      errors.push('Script name is required and must be a string');
    }

    if (!script.type || typeof script.type !== 'string') {
      errors.push('Script type is required and must be a string');
    }

    if (!script.description || typeof script.description !== 'string') {
      errors.push('Script description is required and must be a string');
    }

    // 验证脚本内容或文件路径至少有一个
    if (!script.content && !script.filePath) {
      errors.push('Script must have either content or filePath');
    }

    // 验证执行选项
    if (!script.options) {
      errors.push('Script options are required');
    } else {
      // 验证超时时间
      if (script.options.timeout !== undefined && script.options.timeout < 0) {
        errors.push('Script timeout must be a positive number');
      }

      // 验证重试次数
      if (script.options.retries !== undefined && script.options.retries < 0) {
        errors.push('Script retries must be a non-negative number');
      }

      // 验证重试延迟
      if (script.options.retryDelay !== undefined && script.options.retryDelay < 0) {
        errors.push('Script retryDelay must be a non-negative number');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 创建默认验证器
   * @returns 默认验证器实例
   */
  static createDefault(): ParameterValidator {
    return new ParameterValidator();
  }
}
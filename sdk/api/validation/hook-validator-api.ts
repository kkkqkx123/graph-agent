/**
 * HookValidatorAPI - Hook配置验证API
 * 封装Hook验证函数，提供Hook配置验证接口
 */

import { validateHook, validateHooks } from '../../core/validation/hook-validator';
import type { NodeHook } from '../../types/node';
import type { ValidationResult } from '../../types/errors';
import { ValidationError } from '../../types/errors';

/**
 * HookValidatorAPI - Hook配置验证API
 */
export class HookValidatorAPI {
  /**
   * 验证Hook配置
   * @param hook Hook配置
   * @param nodeId 节点ID（用于错误路径）
   * @returns 验证结果
   */
  async validateHook(hook: NodeHook, nodeId: string): Promise<ValidationResult> {
    try {
      validateHook(hook, nodeId);
      return {
        valid: true,
        errors: [],
        warnings: []
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          valid: false,
          errors: [error],
          warnings: []
        };
      }
      return {
        valid: false,
        errors: [new ValidationError(
          error instanceof Error ? error.message : 'Unknown validation error',
          `node.${nodeId}.hooks`
        )],
        warnings: []
      };
    }
  }

  /**
   * 验证Hook数组
   * @param hooks Hook数组
   * @param nodeId 节点ID（用于错误路径）
   * @returns 验证结果
   */
  async validateHooks(hooks: NodeHook[], nodeId: string): Promise<ValidationResult> {
    try {
      validateHooks(hooks, nodeId);
      return {
        valid: true,
        errors: [],
        warnings: []
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          valid: false,
          errors: [error],
          warnings: []
        };
      }
      return {
        valid: false,
        errors: [new ValidationError(
          error instanceof Error ? error.message : 'Unknown validation error',
          `node.${nodeId}.hooks`
        )],
        warnings: []
      };
    }
  }

  /**
   * 批量验证Hook数组（返回所有错误）
   * @param hooks Hook数组
   * @param nodeId 节点ID（用于错误路径）
   * @returns 验证结果
   */
  async validateHooksBatch(hooks: NodeHook[], nodeId: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    if (!hooks || !Array.isArray(hooks)) {
      errors.push(new ValidationError('Hooks must be an array', `node.${nodeId}.hooks`));
      return {
        valid: false,
        errors,
        warnings: []
      };
    }

    for (let i = 0; i < hooks.length; i++) {
      const hook = hooks[i];
      if (!hook) continue;

      try {
        validateHook(hook, nodeId);
      } catch (error) {
        if (error instanceof ValidationError) {
          errors.push(new ValidationError(
            error.message,
            `node.${nodeId}.hooks[${i}]`
          ));
        } else {
          errors.push(new ValidationError(
            error instanceof Error ? error.message : 'Unknown validation error',
            `node.${nodeId}.hooks[${i}]`
          ));
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }
}
/**
 * Hook验证函数
 * 提供Hook配置的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { NodeHook } from '../../types/node';
import { HookType } from '../../types/node';
import { ValidationError, type ValidationResult } from '../../types/errors';

/**
 * Hook配置schema
 */
const hookSchema = z.object({
  hookType: z.nativeEnum(HookType),
  enabled: z.boolean().optional(),
  weight: z.number().optional(),
  condition: z.string().optional(),
  eventName: z.string().min(1, 'Event name is required'),
  eventPayload: z.record(z.string(), z.any()).optional()
});

/**
 * 验证Hook配置
 * @param hook Hook配置
 * @param nodeId 节点ID（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateHook(hook: NodeHook, nodeId: string): ValidationResult {
  const result = hookSchema.safeParse(hook);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return {
        valid: false,
        errors: [new ValidationError('Invalid hook configuration', `node.${nodeId}.hooks`)],
        warnings: []
      };
    }
    return {
      valid: false,
      errors: [new ValidationError(error.message, `node.${nodeId}.hooks.${error.path.join('.')}`)],
      warnings: []
    };
  }
  return {
    valid: true,
    errors: [],
    warnings: []
  };
}

/**
 * 验证Hook数组
 * @param hooks Hook数组
 * @param nodeId 节点ID（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateHooks(hooks: NodeHook[], nodeId: string): ValidationResult {
  if (!hooks || !Array.isArray(hooks)) {
    return {
      valid: false,
      errors: [new ValidationError('Hooks must be an array', `node.${nodeId}.hooks`)],
      warnings: []
    };
  }

  const errors: ValidationError[] = [];
  for (let i = 0; i < hooks.length; i++) {
    const hook = hooks[i];
    if (!hook) continue;

    // 验证Hook配置
    const result = validateHook(hook, nodeId);
    if (!result.valid) {
      errors.push(...result.errors);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: []
  };
}
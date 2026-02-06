/**
 * Hook验证函数
 * 提供Hook配置的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { NodeHook } from '../../types/node';
import { HookType } from '../../types/node';
import { ValidationError } from '../../types/errors';
import { ok, err } from '../../utils/result-utils';
import type { Result } from '../../types/result';

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
export function validateHook(hook: NodeHook, nodeId: string): Result<NodeHook, ValidationError[]> {
  const result = hookSchema.safeParse(hook);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      return err([new ValidationError('Invalid hook configuration', `node.${nodeId}.hooks`)]);
    }
    return err([new ValidationError(error.message, `node.${nodeId}.hooks.${error.path.join('.')}`)]);
  }
  return ok(hook);
}

/**
 * 验证Hook数组
 * @param hooks Hook数组
 * @param nodeId 节点ID（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateHooks(hooks: NodeHook[], nodeId: string): Result<NodeHook[], ValidationError[]> {
  if (!hooks || !Array.isArray(hooks)) {
    return err([new ValidationError('Hooks must be an array', `node.${nodeId}.hooks`)]);
  }

  const errors: ValidationError[] = [];
  for (let i = 0; i < hooks.length; i++) {
    const hook = hooks[i];
    if (!hook) continue;

    // 验证Hook配置
    const result = validateHook(hook, nodeId);
    if (result.isErr()) {
      errors.push(...result.error);
    }
  }
  
  if (errors.length === 0) {
    return ok(hooks);
  }
  return err(errors);
}
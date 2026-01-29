/**
 * Hook验证函数
 * 提供Hook配置的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { NodeHook } from '../../../types/node';
import { HookType } from '../../../types/node';
import { ValidationError } from '../../../types/errors';

/**
 * Hook配置schema
 */
const hookSchema = z.object({
  hookName: z.string().min(1, 'Hook name is required'),
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
export function validateHook(hook: NodeHook, nodeId: string): void {
  const result = hookSchema.safeParse(hook);
  if (!result.success) {
    const error = result.error.issues[0];
    if (!error) {
      throw new ValidationError('Invalid hook configuration', `node.${nodeId}.hooks`);
    }
    throw new ValidationError(error.message, `node.${nodeId}.hooks.${error.path.join('.')}`);
  }
}

/**
 * 验证Hook数组
 * @param hooks Hook数组
 * @param nodeId 节点ID（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateHooks(hooks: NodeHook[], nodeId: string): void {
  if (!hooks || !Array.isArray(hooks)) {
    throw new ValidationError('Hooks must be an array', `node.${nodeId}.hooks`);
  }

  for (let i = 0; i < hooks.length; i++) {
    const hook = hooks[i];
    if (!hook) continue;

    // 验证Hook配置
    validateHook(hook, nodeId);
  }
}
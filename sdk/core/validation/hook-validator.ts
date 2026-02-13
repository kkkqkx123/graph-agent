/**
 * Hook验证函数
 * 提供Hook配置的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { NodeHook } from '@modular-agent/types/node';
import { HookType } from '@modular-agent/types/node';
import { ConfigurationValidationError } from '@modular-agent/types/errors';
import { ok, err } from '@modular-agent/common-utils';
import type { Result } from '@modular-agent/types/result';

/**
 * Hook配置schema
 */
const hookSchema = z.object({
  hookType: z.custom<HookType>((val): val is HookType =>
    Object.values(HookType).includes(val as HookType)
  ),
  enabled: z.boolean().optional(),
  weight: z.number().optional(),
  condition: z.object({
    expression: z.string().min(1, 'Condition expression is required'),
    metadata: z.any().optional()
  }).optional(),
  eventName: z.string().min(1, 'Event name is required'),
  eventPayload: z.record(z.string(), z.any()).optional()
});

/**
 * 验证Hook配置
 * @param hook Hook配置
 * @param nodeId 节点ID（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateHook(hook: NodeHook, nodeId: string): Result<NodeHook, ConfigurationValidationError[]> {
  const result = hookSchema.safeParse(hook);
  if (!result.success) {
    const errors = result.error.issues;
    if (errors.length === 0) {
      return err([new ConfigurationValidationError('Invalid hook configuration', {
        configType: 'node',
        configPath: `node.${nodeId}.hooks`
      })]);
    }
    return err(errors.map(error =>
      new ConfigurationValidationError(error.message, {
        configType: 'node',
        configPath: `node.${nodeId}.hooks.${error.path.join('.')}`
      })
    ));
  }
  return ok(hook);
}

/**
 * 验证Hook数组
 * @param hooks Hook数组
 * @param nodeId 节点ID（用于错误路径）
 * @throws ValidationError 当配置无效时抛出
 */
export function validateHooks(hooks: NodeHook[], nodeId: string): Result<NodeHook[], ConfigurationValidationError[]> {
  if (!hooks || !Array.isArray(hooks)) {
    return err([new ConfigurationValidationError('Hooks must be an array', {
      configType: 'node',
      configPath: `node.${nodeId}.hooks`
    })]);
  }

  const errors: ConfigurationValidationError[] = [];
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
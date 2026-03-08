/**
 * Hook验证函数
 * 提供Hook配置的静态验证逻辑，使用zod进行验证
 */

import { z } from 'zod';
import type { NodeHook } from '@modular-agent/types';
import { HookType } from '@modular-agent/types';
import { ConfigurationValidationError } from '@modular-agent/types';
import { ok, err } from '@modular-agent/common-utils';
import type { Result } from '@modular-agent/types';
import { validateConfig } from './utils.js';
import { all } from '@modular-agent/common-utils';

/**
 * Hook配置schema
 */
const hookSchema = z.object({
  hookType: z.custom<HookType>((val): val is HookType =>
    ['BEFORE_EXECUTE', 'AFTER_EXECUTE'].includes(val as HookType)
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
  return validateConfig(
    hook,
    hookSchema,
    `node.${nodeId}.hooks`,
    'node'
  );
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

  const results = hooks.map(hook => {
    if (!hook) {
      return ok(hook);
    }
    return validateHook(hook, nodeId);
  });

  return all(results);
}

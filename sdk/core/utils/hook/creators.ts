/**
 * Hook创建器工具（通用部分）
 * 提供便捷的Hook配置创建函数
 *
 * 注意：SDK完全信任用户配置，不预设任何验证逻辑。
 * 应用层应根据实际需求实现自定义的验证逻辑。
 */

import type { NodeHook } from '@modular-agent/types';

/**
 * 创建自定义验证Hook
 *
 * 应用层可以传入自定义的验证函数来实现任何验证逻辑。
 * SDK不预设任何验证规则，完全信任应用层的实现。
 *
 * @param validator 自定义验证函数
 * @param eventName 事件名称（默认为 'validation.custom_check'）
 * @param weight Hook权重（默认为150）
 * @returns NodeHook配置
 *
 * @example
 * // 应用层自定义验证逻辑
 * const customHook = createCustomValidationHook(
 *   async (context) => {
 *     const config = context.node.config as ScriptNodeConfig;
 *     // 实现自定义验证逻辑
 *     if (config.scriptName.includes('..')) {
 *       throw new ExecutionError('Invalid script path', context.node.id);
 *     }
 *   },
 *   'security.path_check',
 *   150
 * );
 */
export function createCustomValidationHook(
  validator: (context: any) => Promise<void> | void,
  eventName: string = 'validation.custom_check',
  weight: number = 150
): NodeHook {
  return {
    hookType: 'BEFORE_EXECUTE',
    eventName,
    weight,
    eventPayload: {
      handler: validator
    }
  };
}
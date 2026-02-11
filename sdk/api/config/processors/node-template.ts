/**
 * NodeTemplate配置处理函数
 * 提供NodeTemplate配置的验证功能
 * 所有函数都是无状态的纯函数
 */

import type { ParsedConfig } from '@modular-agent/types';
import { ConfigType } from '@modular-agent/types';
import type { Result } from '@modular-agent/types/result';
import { ValidationError } from '@modular-agent/types/errors';
import { validateNodeTemplateConfig } from '../validators/node-template-validator';
import { ok } from '@modular-agent/common-utils/result-utils';

/**
 * 验证NodeTemplate配置
 * @param config 解析后的配置对象
 * @returns 验证结果
 */
export function validateNodeTemplate(config: ParsedConfig<ConfigType.NODE_TEMPLATE>): Result<ParsedConfig<ConfigType.NODE_TEMPLATE>, ValidationError[]> {
  const result = validateNodeTemplateConfig(config.config);
  
  // 使用 andThen 进行类型转换
  return result.andThen(() => ok(config)) as Result<ParsedConfig<ConfigType.NODE_TEMPLATE>, ValidationError[]>;
}
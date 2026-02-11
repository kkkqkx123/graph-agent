/**
 * Script配置处理函数
 * 提供Script配置的验证功能
 * 所有函数都是无状态的纯函数
 */

import type { ParsedConfig } from '../types';
import { ConfigType } from '../types';
import type { Result } from '@modular-agent/types/result';
import { ValidationError } from '@modular-agent/types/errors';
import { validateScriptConfig } from '../validators/script-validator';
import { ok } from '@modular-agent/common-utils/result-utils';

/**
 * 验证Script配置
 * @param config 解析后的配置对象
 * @returns 验证结果
 */
export function validateScript(config: ParsedConfig<ConfigType.SCRIPT>): Result<ParsedConfig<ConfigType.SCRIPT>, ValidationError[]> {
  const result = validateScriptConfig(config.config);
  
  // 使用 andThen 进行类型转换
  return result.andThen(() => ok(config)) as Result<ParsedConfig<ConfigType.SCRIPT>, ValidationError[]>;
}

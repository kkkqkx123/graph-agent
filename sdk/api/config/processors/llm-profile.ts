/**
 * LLM Profile配置处理函数
 * 提供LLM Profile配置的验证功能
 * 所有函数都是无状态的纯函数
 */

import type { ParsedConfig } from '@modular-agent/types';
import { ConfigType } from '@modular-agent/types';
import type { Result } from '@modular-agent/types/result';
import { ValidationError } from '@modular-agent/types/errors';
import { validateLLMProfileConfig } from '../validators/llm-profile-validator';
import { ok } from '@modular-agent/common-utils/result-utils';

/**
 * 验证LLM Profile配置
 * @param config 解析后的配置对象
 * @returns 验证结果
 */
export function validateLLMProfile(config: ParsedConfig<ConfigType.LLM_PROFILE>): Result<ParsedConfig<ConfigType.LLM_PROFILE>, ValidationError[]> {
  const result = validateLLMProfileConfig(config.config);
  
  // 使用 andThen 进行类型转换
  return result.andThen(() => ok(config)) as Result<ParsedConfig<ConfigType.LLM_PROFILE>, ValidationError[]>;
}
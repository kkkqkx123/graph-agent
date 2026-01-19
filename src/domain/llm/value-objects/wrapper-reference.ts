/**
 * Wrapper类型定义和验证函数
 *
 * 提供纯粹的类型定义和验证函数，避免重复导入和验证逻辑
 */

/**
 * Wrapper类型
 */
export type WrapperType = 'pool' | 'group' | 'direct';

/**
 * Wrapper配置接口
 */
export interface WrapperConfig {
  /** Wrapper类型 */
  type: WrapperType;
  /** Wrapper名称（pool或group的名称） */
  name?: string;
  /** 提供商名称（direct类型必需） */
  provider?: string;
  /** 模型名称（direct类型必需） */
  model?: string;
}

/**
 * Wrapper模型配置
 * 包含wrapper使用的模型信息和默认参数
 */
export interface WrapperModelConfig {
  /** Wrapper类型 */
  type: WrapperType;
  /** 提供商名称 */
  provider: string;
  /** 模型名称 */
  model: string;
  /** 模型默认参数 */
  defaultParameters: Record<string, any>;
  /** 模型能力 */
  capabilities?: {
    maxTokens?: number;
    supportsStreaming?: boolean;
    supportsTools?: boolean;
  };
}

/**
 * 验证wrapper配置
 * @param config wrapper配置
 * @returns 验证结果
 */
export function validateWrapperConfig(config: unknown): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    return { isValid: false, errors: ['wrapperConfig必须是对象'] };
  }

  const wrapperConfig = config as WrapperConfig;

  // 验证类型
  if (!wrapperConfig.type || !['pool', 'group', 'direct'].includes(wrapperConfig.type)) {
    errors.push('wrapperConfig.type必须是pool、group或direct');
  }

  // 验证必需字段
  switch (wrapperConfig.type) {
    case 'pool':
    case 'group':
      if (!wrapperConfig.name) {
        errors.push(`${wrapperConfig.type}类型需要name字段`);
      }
      break;
    case 'direct':
      if (!wrapperConfig.provider) {
        errors.push('direct类型需要provider字段');
      }
      if (!wrapperConfig.model) {
        errors.push('direct类型需要model字段');
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
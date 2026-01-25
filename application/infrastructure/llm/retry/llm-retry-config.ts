import { getConfig } from '../../config/config';

/**
 * LLM重试配置
 *
 * 简化的LLM重试配置，只包含必要的配置项
 */
export interface LLMRetryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 基础延迟（秒） */
  baseDelay: number;
  /** 最大延迟（秒） */
  maxDelay: number;
  /** 退避乘数 */
  backoffMultiplier: number;
  /** 是否启用LLM层重试 */
  enableLLMRetry: boolean;
  /** LLM层重试延迟（秒） */
  llmRetryDelay: number;
}

/**
 * 默认LLM重试配置
 */
export const DEFAULT_LLM_RETRY_CONFIG: LLMRetryConfig = {
  maxRetries: 3,
  baseDelay: 2,
  maxDelay: 60,
  backoffMultiplier: 2,
  enableLLMRetry: true,
  llmRetryDelay: 10,
};

/**
 * 从配置创建LLM重试配置
 */
export function createLLMRetryConfig(config?: Partial<LLMRetryConfig>): LLMRetryConfig {
  return {
    ...DEFAULT_LLM_RETRY_CONFIG,
    ...config,
  };
}

/**
 * 加载LLM客户端的重试配置
 * 配置优先级: Model > Provider > LLM全局 > HTTP全局
 */
export function loadLLMRetryConfig(
  provider: string,
  model?: string
): LLMRetryConfig {
  // 1. 获取HTTP全局配置（默认值）
  const httpConfig = getConfig().get('http.retry');

  // 2. 获取LLM全局配置
  // 注意：使用any类型绕过类型检查，后续需要更新配置类型定义
  const llmGlobalConfig = (getConfig() as any).get('llms.retry.retry_config');

  // 3. 获取Provider配置
  const providerConfig = (getConfig() as any).get(`llms.provider.${provider}.http_client`);

  // 4. 获取Model配置（可选）
  const modelConfig = model
    ? (getConfig() as any).get(`llms.provider.${provider}.${model}.http_client`)
    : undefined;

  // 5. 合并配置（优先级从低到高）
  const mergedConfig = {
    maxRetries: modelConfig?.max_retries
      ?? providerConfig?.max_retries
      ?? llmGlobalConfig?.max_retries
      ?? httpConfig.max_retries,
    baseDelay:
      (modelConfig?.retry_delay ??
        providerConfig?.retry_delay ??
        llmGlobalConfig?.base_delay ??
        httpConfig.base_delay / 1000), // 转换为秒
    maxDelay:
      (modelConfig?.max_retry_backoff ??
        providerConfig?.max_retry_backoff ??
        llmGlobalConfig?.max_delay ??
        httpConfig.max_delay / 1000), // 转换为秒
    backoffMultiplier:
      modelConfig?.backoff_factor ??
      providerConfig?.backoff_factor ??
      llmGlobalConfig?.backoff_multiplier ??
      httpConfig.backoff_multiplier,
    enableLLMRetry: llmGlobalConfig?.enable_llm_retry ?? true,
    llmRetryDelay: llmGlobalConfig?.llm_retry_delay ?? 10,
  };

  return createLLMRetryConfig(mergedConfig);
}

/**
 * 将LLM重试配置转换为HTTP重试配置
 */
export function toHttpRetryConfig(config: LLMRetryConfig): {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
} {
  return {
    maxRetries: config.maxRetries,
    baseDelay: config.baseDelay * 1000, // 转换为毫秒
    maxDelay: config.maxDelay * 1000, // 转换为毫秒
    backoffMultiplier: config.backoffMultiplier,
  };
}
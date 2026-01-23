/**
 * LLM重试配置Schema定义
 * 统一管理LLM重试策略配置的验证规则
 */

import { z } from 'zod';

/**
 * 重试错误类型配置Schema
 */
const RetryErrorsSchema = z.object({
  types: z.array(z.enum(['timeout', 'rate_limit', 'service_unavailable'])).optional(),
});

/**
 * 重试配置Schema
 */
const RetryConfigSchema = z.object({
  base_delay: z.number().min(0).optional(),
  max_delay: z.number().min(0).optional(),
  jitter: z.boolean().optional(),
  exponential_base: z.number().min(1).optional(),
  retry_on_status_codes: z.array(z.number()).optional(),
  retry_errors: RetryErrorsSchema.optional(),
});

/**
 * LLM重试配置Schema
 */
export const LLMRetrySchema = z.object({
  retry_config: RetryConfigSchema.optional(),
});

/**
 * 导出类型供其他模块使用
 */
export type LLMRetryConfig = z.infer<typeof LLMRetrySchema>;
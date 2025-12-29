/**
 * LLM模块Schema定义
 * 基于现有的llm-rule.ts和llm-loader.ts实现
 */

import { z } from 'zod';

/**
 * LLM提供商配置Schema
 */
const ProviderConfigSchema = z.object({
  provider: z.string(),
  base_url: z.string(),
  api_key: z.string().optional(),
  models: z.array(z.string()).optional()
});

/**
 * LLM模块Schema
 */
export const LLMSchema = z.object({
  providers: z.record(z.string(), ProviderConfigSchema).optional(),
  groups: z.record(z.string(), z.object({})).optional(),
  _group: z.object({}).optional(),
  _registry: z.string().optional()
});
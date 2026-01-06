/**
 * 轮询池模块Schema定义
 * 基于现有的pool-rule.ts和pool-config-loader.ts实现
 */

import { z } from 'zod';

/**
 * 轮询策略Schema
 */
const RotationSchema = z.object({
  strategy: z.enum(['round_robin', 'least_recently_used', 'weighted']),
  currentIndex: z.number().optional(),
});

/**
 * 健康检查Schema
 */
const HealthCheckSchema = z.object({
  enabled: z.boolean().optional(),
  interval: z.number().optional(),
  failureThreshold: z.number().optional(),
});

/**
 * 并发控制Schema
 */
const ConcurrencyControlSchema = z.object({
  enabled: z.boolean().optional(),
  maxConcurrency: z.number().optional(),
});

/**
 * 限流配置Schema
 */
const RateLimitingSchema = z.object({
  enabled: z.boolean().optional(),
  requestsPerMinute: z.number().optional(),
});

/**
 * 降级配置Schema
 */
const FallbackConfigSchema = z.object({
  strategy: z.string().optional(),
  maxInstanceAttempts: z.number().optional(),
});

/**
 * 轮询池配置Schema
 */
const PoolConfigSchema = z.object({
  name: z.string(),
  taskGroups: z.array(z.string()),
  rotation: RotationSchema.optional(),
  healthCheck: HealthCheckSchema.optional(),
  concurrencyControl: ConcurrencyControlSchema.optional(),
  rateLimiting: RateLimitingSchema.optional(),
  fallbackConfig: FallbackConfigSchema.optional(),
});

/**
 * 轮询池模块Schema
 */
export const PoolSchema = z.object({
  pools: z.record(z.string(), PoolConfigSchema).optional(),
  _registry: z.string().optional(),
});

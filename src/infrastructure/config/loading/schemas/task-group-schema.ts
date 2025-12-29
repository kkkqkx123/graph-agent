/**
 * 任务组模块Schema定义
 * 基于现有的task-group-config-loader.ts实现
 */

import { z } from 'zod';

/**
 * 层级配置Schema
 */
const EchelonSchema = z.object({
  priority: z.number(),
  models: z.array(z.string())
});

/**
 * 降级配置Schema
 */
const FallbackConfigSchema = z.object({
  strategy: z.enum(['echelon_down', 'pool_fallback', 'global_fallback']).optional(),
  maxAttempts: z.number().optional(),
  retryDelay: z.number().optional()
});

/**
 * 熔断器配置Schema
 */
const CircuitBreakerSchema = z.object({
  failureThreshold: z.number().optional(),
  recoveryTime: z.number().optional(),
  halfOpenRequests: z.number().optional()
});

/**
 * 任务组配置Schema
 */
const TaskGroupConfigSchema = z.object({
  name: z.string(),
  fallbackStrategy: z.string().optional(),
  maxAttempts: z.number().optional(),
  retryDelay: z.number().optional(),
  circuitBreaker: CircuitBreakerSchema.optional()
}).and(
  z.object({
    echelon1: EchelonSchema.optional(),
    echelon2: EchelonSchema.optional(),
    echelon3: EchelonSchema.optional()
  })
);

/**
 * 任务组模块Schema
 */
export const TaskGroupSchema = z.object({
  taskGroups: z.record(z.string(), TaskGroupConfigSchema).optional(),
  _registry: z.string().optional()
});
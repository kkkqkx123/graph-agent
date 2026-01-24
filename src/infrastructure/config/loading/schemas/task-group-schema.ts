/**
 * 任务组模块Schema定义
 * 基于现有的task-group-config-loader.ts实现
 */

import { z } from 'zod';

/**
 * 层级配置Schema
 *
 * 注意：每个层级只配置一个模型，不再使用数组
 */
const EchelonSchema = z.object({
  priority: z.number(),
  model: z.string(),           // 单个模型名称
  provider: z.string(),        // 模型提供商
});

/**
 * 降级配置Schema
 */
const FallbackConfigSchema = z.object({
  strategy: z.enum(['echelon_down', 'pool_fallback', 'global_fallback']).optional(),
  maxAttempts: z.number().optional(),
  retryDelay: z.number().optional(),
});

/**
 * 熔断器配置Schema
 */
const CircuitBreakerSchema = z.object({
  failureThreshold: z.number().optional(),
  recoveryTime: z.number().optional(),
  halfOpenRequests: z.number().optional(),
});

/**
 * 任务组配置Schema
 */
const TaskGroupConfigSchema = z
  .object({
    name: z.string(),
    fallbackStrategy: z.string().optional(),
    maxAttempts: z.number().optional(),
    retryDelay: z.number().optional(),
    circuitBreaker: CircuitBreakerSchema.optional(),
  })
  .and(
    z.object({
      echelon1: EchelonSchema.optional(),
      echelon2: EchelonSchema.optional(),
      echelon3: EchelonSchema.optional(),
    })
  );

/**
 * 任务组模块Schema
 *
 * 注意：配置文件拆分后，每个任务组配置文件直接使用TaskGroupConfigSchema
 * 配置加载模块会自动将多个任务组配置文件合并为taskGroups对象
 */
export const TaskGroupSchema = z.object({
  taskGroups: z.record(z.string(), TaskGroupConfigSchema).optional(),
  _registry: z.string().optional(),
});

/**
 * 单个任务组配置Schema（用于拆分后的配置文件）
 */
export const SingleTaskGroupSchema = TaskGroupConfigSchema;

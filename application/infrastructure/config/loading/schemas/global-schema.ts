/**
 * 全局配置Schema定义
 * 统一管理全局配置的验证规则
 */

import { z } from 'zod';

/**
 * 日志输出配置Schema
 */
const LogOutputSchema = z.object({
  type: z.enum(['console', 'file']),
  level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']),
  format: z.enum(['text', 'json']),
  path: z.string().optional(),
  rotation: z.enum(['daily', 'weekly', 'monthly']).optional(),
  max_size: z.string().optional(),
});

/**
 * 全局配置Schema
 */
export const GlobalSchema = z.object({
  // 基础设置
  log_level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']).optional(),
  env: z.enum(['development', 'test', 'production']).optional(),
  debug: z.boolean().optional(),
  env_prefix: z.string().optional(),

  // 热重载配置
  hot_reload: z.boolean().optional(),
  watch_interval: z.number().min(1).max(3600).optional(),

  // 日志输出配置
  log_outputs: z.array(LogOutputSchema).optional(),

  // 秘密模式配置
  secret_patterns: z.array(z.string()).optional(),
});

/**
 * 导出类型供其他模块使用
 */
export type GlobalConfig = z.infer<typeof GlobalSchema>;
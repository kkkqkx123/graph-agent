/**
 * 数据库模块Schema定义
 * 统一管理数据库配置的验证规则
 */

import { z } from 'zod';

/**
 * 数据库配置Schema
 * 所有字段都是可选的，使用默认值
 */
export const DatabaseSchema = z.object({
  type: z.enum(['postgres', 'sqlite']).optional(),
  host: z.string().optional(),
  port: z.number().min(1).max(65535).optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  database: z.string().optional(),
  synchronize: z.boolean().optional(),
  logging: z.boolean().optional(),
});

/**
 * 导出类型供其他模块使用
 */
export type DatabaseConfig = z.infer<typeof DatabaseSchema>;
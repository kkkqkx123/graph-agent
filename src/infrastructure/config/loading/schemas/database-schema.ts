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
  // 连接池配置
  pool_size: z.number().min(1).max(100).optional(),
  max_connections: z.number().min(1).max(100).optional(),
  min_connections: z.number().min(0).max(50).optional(),
  idle_timeout: z.number().min(1000).max(300000).optional(),
  connection_timeout: z.number().min(1000).max(60000).optional(),
  acquire_timeout: z.number().min(1000).max(60000).optional(),
});

/**
 * 导出类型供其他模块使用
 */
export type DatabaseConfig = z.infer<typeof DatabaseSchema>;
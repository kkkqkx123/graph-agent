/**
 * 应用层请求DTO
 * 仅保留应用层需要的请求验证DTO
 */

import { z } from 'zod';
import { BaseDto } from '../../common/dto';

/**
 * 会话配置Schema
 */
export const SessionConfigSchema = z.object({
  value: z.record(z.string(), z.unknown()).optional().describe('配置值'),
  timeoutMinutes: z.string().optional().describe('超时时间（分钟）'),
  maxDuration: z.string().optional().describe('最大持续时间'),
  maxMessages: z.string().optional().describe('最大消息数')
});

/**
 * 会话配置DTO类型
 */
export type SessionConfigDto = z.infer<typeof SessionConfigSchema>;

/**
 * 创建会话请求Schema
 */
export const CreateSessionRequestSchema = z.object({
  userId: z.string().uuid().optional().describe('用户ID'),
  title: z.string().max(200).optional().describe('会话标题'),
  config: SessionConfigSchema.optional().describe('会话配置')
});

/**
 * 创建会话请求DTO类型
 */
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

/**
 * 创建会话请求DTO类
 */
export class CreateSessionRequestDto extends BaseDto<typeof CreateSessionRequestSchema> {
  constructor() {
    super(CreateSessionRequestSchema, '1.0.0');
  }

  /**
   * 验证并创建会话配置
   */
  validateConfig(config: unknown): SessionConfigDto | undefined {
    if (!config) return undefined;
    return SessionConfigSchema.parse(config);
  }
}
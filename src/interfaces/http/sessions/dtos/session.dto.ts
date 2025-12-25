/**
 * 会话模块DTO定义
 * 使用Zod进行运行时验证和类型推断
 */

import { z } from 'zod';
import { BaseDto, VersionedBaseDto } from '../../../../application/common/dto';

// 基础Schema定义

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
 * 会话状态枚举
 */
export const SessionStatusEnum = z.enum(['active', 'suspended', 'terminated']);

/**
 * 会话状态类型
 */
export type SessionStatus = z.infer<typeof SessionStatusEnum>;

/**
 * 会话信息Schema
 */
export const SessionInfoSchema = z.object({
  sessionId: z.string().uuid().describe('会话ID'),
  userId: z.string().uuid().optional().describe('用户ID'),
  title: z.string().max(200).optional().describe('会话标题'),
  status: SessionStatusEnum.describe('会话状态'),
  messageCount: z.number().int().min(0).describe('消息数量'),
  createdAt: z.string().datetime().describe('创建时间'),
  lastActivityAt: z.string().datetime().describe('最后活动时间')
});

/**
 * 会话信息DTO类型
 */
export type SessionInfo = z.infer<typeof SessionInfoSchema>;

/**
 * 会话统计Schema
 */
export const SessionStatisticsSchema = z.object({
  total: z.number().int().min(0).describe('总会话数'),
  active: z.number().int().min(0).describe('活跃会话数'),
  suspended: z.number().int().min(0).describe('暂停会话数'),
  terminated: z.number().int().min(0).describe('终止会话数')
});

/**
 * 会话统计DTO类型
 */
export type SessionStatistics = z.infer<typeof SessionStatisticsSchema>;

// ==================== DTO类定义 ====================

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

/**
 * 会话信息DTO类
 */
export class SessionInfoDto extends BaseDto<typeof SessionInfoSchema> {
  constructor() {
    super(SessionInfoSchema, '1.0.0');
  }

  /**
   * 检查会话是否活跃
   */
  isActive(sessionInfo: SessionInfo): boolean {
    return sessionInfo.status === 'active';
  }

  /**
   * 检查会话是否暂停
   */
  isSuspended(sessionInfo: SessionInfo): boolean {
    return sessionInfo.status === 'suspended';
  }

  /**
   * 检查会话是否终止
   */
  isTerminated(sessionInfo: SessionInfo): boolean {
    return sessionInfo.status === 'terminated';
  }
}

/**
 * 会话统计DTO类
 */
export class SessionStatisticsDto extends BaseDto<typeof SessionStatisticsSchema> {
  constructor() {
    super(SessionStatisticsSchema, '1.0.0');
  }

  /**
   * 计算活跃率
   */
  getActiveRate(stats: SessionStatistics): number {
    return stats.total > 0 ? (stats.active / stats.total) * 100 : 0;
  }

  /**
   * 计算终止率
   */
  getTerminatedRate(stats: SessionStatistics): number {
    return stats.total > 0 ? (stats.terminated / stats.total) * 100 : 0;
  }
}

// ==================== 版本化DTO ====================

/**
 * 版本化会话信息DTO
 * 支持多版本会话信息管理
 */
export class VersionedSessionInfoDto extends VersionedBaseDto<typeof SessionInfoSchema> {
  constructor() {
    super(SessionInfoSchema, '1.0.0');

    // 注册历史版本（示例）
    this.registerVersion('0.9.0', z.object({
      sessionId: z.string(),
      userId: z.string().optional(),
      title: z.string().optional(),
      status: z.string(),
      messageCount: z.number(),
      createdAt: z.string(),
      lastActivityAt: z.string()
    }));
  }

  /**
   * 从0.9.0版本迁移到1.0.0版本
   */
  setupMigrations(): void {
    this.registerMigration({
      fromVersion: '0.9.0',
      toVersion: '1.0.0',
      description: '添加UUID验证和日期时间格式验证',
      migrate: (data: any) => ({
        ...data,
        sessionId: data.sessionId, // 假设已经是UUID格式
        userId: data.userId, // 假设已经是UUID格式
        createdAt: data.createdAt, // 假设已经是ISO格式
        lastActivityAt: data.lastActivityAt // 假设已经是ISO格式
      })
    });
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建会话信息DTO实例
 */
export function createSessionInfoDto(): SessionInfoDto {
  return new SessionInfoDto();
}

/**
 * 创建会话统计DTO实例
 */
export function createSessionStatisticsDto(): SessionStatisticsDto {
  return new SessionStatisticsDto();
}

/**
 * 创建创建会话请求DTO实例
 */
export function createCreateSessionRequestDto(): CreateSessionRequestDto {
  return new CreateSessionRequestDto();
}

/**
 * 创建版本化会话信息DTO实例
 */
export function createVersionedSessionInfoDto(): VersionedSessionInfoDto {
  const dto = new VersionedSessionInfoDto();
  dto.setupMigrations();
  return dto;
}

// ==================== 常量 ====================

/**
 * 会话状态常量
 */
export const SESSION_STATUS = {
  ACTIVE: 'active' as const,
  SUSPENDED: 'suspended' as const,
  TERMINATED: 'terminated' as const
} as const;

/**
 * 默认会话配置
 */
export const DEFAULT_SESSION_CONFIG: SessionConfigDto = {
  timeoutMinutes: '30',
  maxDuration: '24h',
  maxMessages: '100'
};
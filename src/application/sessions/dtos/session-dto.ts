/**
 * Session模块DTO定义
 * 基于Zod的类型安全DTO实现
 */

import { z } from 'zod';
import { BaseDto, DtoValidationError } from '../../common/dto/base-dto';
import { DtoConverter } from '../../common/dto/dto-converter';

// 重新导出 DtoValidationError
export { DtoValidationError };

// ==================== Schema定义 ====================

/**
 * 会话状态Schema
 */
export const SessionStatusSchema = z.object({
  value: z.string().describe('状态值'),
  isActive: z.boolean().describe('是否活跃'),
  isSuspended: z.boolean().describe('是否暂停'),
  isTerminated: z.boolean().describe('是否终止'),
  canOperate: z.boolean().describe('是否可操作')
});

/**
 * 会话活动Schema
 */
export const SessionActivitySchema = z.object({
  messageCount: z.number().int().min(0).describe('消息数量'),
  threadCount: z.number().int().min(0).describe('线程数量'),
  lastActivityAt: z.string().datetime().describe('最后活动时间'),
  createdAt: z.string().datetime().describe('创建时间')
});

/**
 * 会话配置Schema
 */
export const SessionConfigSchema = z.object({
  maxMessages: z.number().int().min(0).describe('最大消息数'),
  maxThreads: z.number().int().min(0).describe('最大线程数'),
  timeoutMinutes: z.number().int().min(0).describe('超时分钟数'),
  maxDuration: z.number().int().min(0).describe('最大持续时间（分钟）'),
  value: z.record(z.string(), z.unknown()).describe('配置值')
});

/**
 * 会话Schema
 */
export const SessionSchema = z.object({
  sessionId: z.string().describe('会话ID'),
  userId: z.string().optional().describe('用户ID'),
  title: z.string().optional().describe('会话标题'),
  status: SessionStatusSchema.describe('会话状态'),
  config: SessionConfigSchema.describe('会话配置'),
  activity: SessionActivitySchema.describe('会话活动'),
  metadata: z.record(z.string(), z.unknown()).describe('元数据'),
  createdAt: z.string().datetime().describe('创建时间'),
  updatedAt: z.string().datetime().describe('更新时间'),
  version: z.string().describe('版本号'),
  isDeleted: z.boolean().describe('是否已删除')
});

export type SessionDTO = z.infer<typeof SessionSchema>;

/**
 * 会话创建Schema
 */
export const SessionCreateSchema = z.object({
  userId: z.string().optional().describe('用户ID'),
  title: z.string().optional().describe('会话标题'),
  config: z.record(z.string(), z.unknown()).optional().describe('会话配置'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('元数据')
});

export type SessionCreateDTO = z.infer<typeof SessionCreateSchema>;

/**
 * 会话更新Schema
 */
export const SessionUpdateSchema = z.object({
  title: z.string().optional().describe('会话标题'),
  config: z.record(z.string(), z.unknown()).optional().describe('会话配置'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('元数据')
});

export type SessionUpdateDTO = z.infer<typeof SessionUpdateSchema>;

/**
 * 会话状态变更Schema
 */
export const SessionStatusChangeSchema = z.object({
  newStatus: z.string().describe('新状态'),
  userId: z.string().optional().describe('用户ID'),
  reason: z.string().optional().describe('变更原因')
});

export type SessionStatusChangeDTO = z.infer<typeof SessionStatusChangeSchema>;

/**
 * 会话统计Schema
 */
export const SessionStatisticsSchema = z.object({
  total: z.number().int().min(0).describe('总会话数'),
  active: z.number().int().min(0).describe('活跃会话数'),
  suspended: z.number().int().min(0).describe('暂停会话数'),
  terminated: z.number().int().min(0).describe('终止会话数')
});

export type SessionStatisticsDTO = z.infer<typeof SessionStatisticsSchema>;

/**
 * 资源分配Schema
 */
export const ResourceAllocationSchema = z.object({
  id: z.string().describe('分配ID'),
  sessionId: z.string().describe('会话ID'),
  resources: z.array(z.object({
    type: z.string().describe('资源类型'),
    amount: z.number().describe('资源数量')
  })).describe('资源列表'),
  allocatedAt: z.string().datetime().describe('分配时间'),
  expiresAt: z.string().datetime().describe('过期时间')
});

export type ResourceAllocationDTO = z.infer<typeof ResourceAllocationSchema>;

/**
 * 资源限制Schema
 */
export const ResourceLimitsSchema = z.object({
  maxMemory: z.number().int().min(0).describe('最大内存（MB）'),
  maxThreads: z.number().int().min(0).describe('最大线程数'),
  maxExecutionTime: z.number().int().min(0).describe('最大执行时间（毫秒）'),
  maxStorage: z.number().int().min(0).describe('最大存储（MB）')
});

export type ResourceLimitsDTO = z.infer<typeof ResourceLimitsSchema>;

/**
 * 会话配额Schema
 */
export const SessionQuotaSchema = z.object({
  remainingThreads: z.number().int().min(0).describe('剩余线程数'),
  remainingExecutionTime: z.number().int().min(0).describe('剩余执行时间（毫秒）'),
  remainingMemory: z.number().int().min(0).describe('剩余内存（MB）'),
  remainingStorage: z.number().int().min(0).describe('剩余存储（MB）')
});

export type SessionQuotaDTO = z.infer<typeof SessionQuotaSchema>;

/**
 * 配额使用Schema
 */
export const QuotaUsageSchema = z.object({
  threadsUsed: z.number().int().min(0).describe('已使用线程数'),
  executionTimeUsed: z.number().int().min(0).describe('已使用执行时间（毫秒）'),
  memoryUsed: z.number().int().min(0).describe('已使用内存（MB）'),
  storageUsed: z.number().int().min(0).describe('已使用存储（MB）')
});

export type QuotaUsageDTO = z.infer<typeof QuotaUsageSchema>;

// ==================== DTO类定义 ====================

/**
 * 会话DTO类
 */
export class SessionDto extends BaseDto<typeof SessionSchema> {
  constructor() {
    super(SessionSchema, '1.0.0');
  }
}

/**
 * 会话创建DTO类
 */
export class SessionCreateDto extends BaseDto<typeof SessionCreateSchema> {
  constructor() {
    super(SessionCreateSchema, '1.0.0');
  }
}

/**
 * 会话更新DTO类
 */
export class SessionUpdateDto extends BaseDto<typeof SessionUpdateSchema> {
  constructor() {
    super(SessionUpdateSchema, '1.0.0');
  }
}

/**
 * 会话状态变更DTO类
 */
export class SessionStatusChangeDto extends BaseDto<typeof SessionStatusChangeSchema> {
  constructor() {
    super(SessionStatusChangeSchema, '1.0.0');
  }
}

/**
 * 会话统计DTO类
 */
export class SessionStatisticsDto extends BaseDto<typeof SessionStatisticsSchema> {
  constructor() {
    super(SessionStatisticsSchema, '1.0.0');
  }
}

/**
 * 资源分配DTO类
 */
export class ResourceAllocationDto extends BaseDto<typeof ResourceAllocationSchema> {
  constructor() {
    super(ResourceAllocationSchema, '1.0.0');
  }
}

/**
 * 资源限制DTO类
 */
export class ResourceLimitsDto extends BaseDto<typeof ResourceLimitsSchema> {
  constructor() {
    super(ResourceLimitsSchema, '1.0.0');
  }
}

/**
 * 会话配额DTO类
 */
export class SessionQuotaDto extends BaseDto<typeof SessionQuotaSchema> {
  constructor() {
    super(SessionQuotaSchema, '1.0.0');
  }
}

/**
 * 配额使用DTO类
 */
export class QuotaUsageDto extends BaseDto<typeof QuotaUsageSchema> {
  constructor() {
    super(QuotaUsageSchema, '1.0.0');
  }
}

// ==================== 转换器定义 ====================

/**
 * 会话转换器
 */
export class SessionConverter extends DtoConverter<any, SessionDTO> {
  toDto(entity: any, options?: any): SessionDTO {
    return {
      sessionId: entity.sessionId?.toString() || entity.id?.toString() || '',
      userId: entity.userId?.toString(),
      title: entity.title,
      status: {
        value: entity.status?.getValue() || entity.status?.value || '',
        isActive: entity.status?.isActive?.() || entity.status?.isActive || false,
        isSuspended: entity.status?.isSuspended?.() || entity.status?.isSuspended || false,
        isTerminated: entity.status?.isTerminated?.() || entity.status?.isTerminated || false,
        canOperate: entity.status?.canOperate?.() || entity.status?.canOperate || false
      },
      config: {
        maxMessages: entity.config?.getMaxMessages?.() || entity.config?.maxMessages || 0,
        maxThreads: entity.config?.getMaxThreads?.() || entity.config?.maxThreads || 0,
        timeoutMinutes: entity.config?.getTimeoutMinutes?.() || entity.config?.timeoutMinutes || 0,
        maxDuration: entity.config?.getMaxDuration?.() || entity.config?.maxDuration || 0,
        value: entity.config?.value || entity.config || {}
      },
      activity: {
        messageCount: entity.messageCount || entity.activity?.messageCount || 0,
        threadCount: entity.threadCount || entity.activity?.threadCount || 0,
        lastActivityAt: entity.lastActivityAt?.toISOString() || entity.activity?.lastActivityAt?.toISOString() || new Date().toISOString(),
        createdAt: entity.activity?.createdAt?.toISOString() || new Date().toISOString()
      },
      metadata: entity.metadata || {},
      createdAt: entity.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: entity.updatedAt?.toISOString() || new Date().toISOString(),
      version: entity.version?.toString() || '1.0.0',
      isDeleted: entity.isDeleted?.() || entity.isDeleted || false
    };
  }

  toEntity(dto: SessionDTO, options?: any): any {
    // 注意：从DTO到领域对象的转换需要业务上下文
    throw new Error('DTO到Entity的转换需要业务上下文，请使用工厂方法');
  }

  override toDtoList(entities: any[], options?: any): SessionDTO[] {
    return entities.map(entity => this.toDto(entity, options));
  }

  override toEntityList(dtos: SessionDTO[], options?: any): any[] {
    return dtos.map(dto => this.toEntity(dto, options));
  }
}

/**
 * 资源分配转换器
 */
export class ResourceAllocationConverter extends DtoConverter<any, ResourceAllocationDTO> {
  toDto(entity: any, options?: any): ResourceAllocationDTO {
    return {
      id: entity.id?.toString() || '',
      sessionId: entity.sessionId?.toString() || '',
      resources: entity.resources || [],
      allocatedAt: entity.allocatedAt?.toISOString() || new Date().toISOString(),
      expiresAt: entity.expiresAt?.toISOString() || new Date().toISOString()
    };
  }

  toEntity(dto: ResourceAllocationDTO, options?: any): any {
    throw new Error('DTO到Entity的转换需要业务上下文，请使用工厂方法');
  }

  override toDtoList(entities: any[], options?: any): ResourceAllocationDTO[] {
    return entities.map(entity => this.toDto(entity, options));
  }

  override toEntityList(dtos: ResourceAllocationDTO[], options?: any): any[] {
    return dtos.map(dto => this.toEntity(dto, options));
  }
}
/**
 * LLM模块DTO定义
 * 基于Zod的类型安全DTO实现
 */

import { z } from 'zod';
import { BaseDto, DtoValidationError } from '../../common/dto/base-dto';
import { DtoConverter } from '../../common/dto/dto-converter';

// 重新导出 DtoValidationError
export { DtoValidationError };

// 基础Schema定义

/**
 * 并发状态Schema
 */
export const ConcurrencyStatusSchema = z.object({
  enabled: z.boolean().describe('是否启用'),
  currentLoad: z.number().int().min(0).describe('当前负载'),
  maxLoad: z.number().int().min(0).describe('最大负载'),
  loadPercentage: z.number().min(0).max(100).describe('负载百分比')
});

/**
 * 轮询池状态Schema
 */
export const PoolStatusSchema = z.object({
  totalInstances: z.number().int().min(0).describe('总实例数'),
  healthyInstances: z.number().int().min(0).describe('健康实例数'),
  degradedInstances: z.number().int().min(0).describe('降级实例数'),
  failedInstances: z.number().int().min(0).describe('失败实例数'),
  availabilityRate: z.number().min(0).max(1).describe('可用率'),
  concurrencyStatus: ConcurrencyStatusSchema.describe('并发状态'),
  lastChecked: z.string().datetime().describe('最后检查时间')
});

/**
 * 轮询池统计Schema
 */
export const PoolStatisticsSchema = z.object({
  totalRequests: z.number().int().min(0).describe('总请求数'),
  successfulRequests: z.number().int().min(0).describe('成功请求数'),
  failedRequests: z.number().int().min(0).describe('失败请求数'),
  avgResponseTime: z.number().min(0).describe('平均响应时间'),
  successRate: z.number().min(0).max(1).describe('成功率'),
  currentLoad: z.number().int().min(0).describe('当前负载'),
  maxConcurrency: z.number().int().min(0).describe('最大并发数')
});

/**
 * 轮询池Schema
 */
export const PoolSchema = z.object({
  name: z.string().min(1).max(100).describe('轮询池名称'),
  config: z.record(z.string(), z.unknown()).describe('轮询池配置'),
  status: PoolStatusSchema.describe('轮询池状态'),
  statistics: PoolStatisticsSchema.describe('轮询池统计')
});

export type PoolDTO = z.infer<typeof PoolSchema>;

/**
 * 实例Schema
 */
export const InstanceSchema = z.object({
  instanceId: z.string().uuid().describe('实例ID'),
  modelName: z.string().min(1).max(100).describe('模型名称'),
  groupName: z.string().min(1).max(100).describe('组名称'),
  echelon: z.string().min(1).max(50).describe('层级'),
  status: z.enum(['healthy', 'degraded', 'failed', 'unknown']).describe('实例状态'),
  currentLoad: z.number().int().min(0).describe('当前负载'),
  maxConcurrency: z.number().int().min(0).describe('最大并发数'),
  avgResponseTime: z.number().min(0).describe('平均响应时间'),
  successCount: z.number().int().min(0).describe('成功次数'),
  failureCount: z.number().int().min(0).describe('失败次数'),
  successRate: z.number().min(0).max(1).describe('成功率'),
  healthScore: z.number().min(0).max(1).describe('健康评分'),
  available: z.boolean().describe('是否可用'),
  canAcceptRequest: z.boolean().describe('是否可接受请求'),
  lastUsed: z.string().datetime().nullable().describe('最后使用时间'),
  lastHealthCheck: z.string().datetime().describe('最后健康检查时间')
});

export type InstanceDTO = z.infer<typeof InstanceSchema>;

/**
 * 轮询池创建Schema
 */
export const PoolCreateSchema = z.object({
  name: z.string().min(1).max(100).describe('轮询池名称'),
  config: z.record(z.string(), z.unknown()).describe('轮询池配置'),
  taskGroups: z.array(z.string().min(1)).describe('任务组列表')
});

export type PoolCreateDTO = z.infer<typeof PoolCreateSchema>;

/**
 * 轮询池更新Schema
 */
export const PoolUpdateSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional().describe('轮询池配置'),
  taskGroups: z.array(z.string().min(1)).optional().describe('任务组列表')
});

export type PoolUpdateDTO = z.infer<typeof PoolUpdateSchema>;

/**
 * 轮询池健康报告Schema
 */
export const PoolHealthReportSchema = z.object({
  poolName: z.string().min(1).max(100).describe('轮询池名称'),
  status: z.enum(['healthy', 'degraded', 'unhealthy']).describe('健康状态'),
  issues: z.array(z.string()).describe('问题列表'),
  recommendations: z.array(z.string()).describe('建议列表'),
  statistics: PoolStatisticsSchema.describe('轮询池统计'),
  lastChecked: z.string().datetime().describe('最后检查时间')
});

export type PoolHealthReportDTO = z.infer<typeof PoolHealthReportSchema>;

/**
 * 系统级轮询池报告Schema
 */
export const SystemPoolReportSchema = z.object({
  totalPools: z.number().int().min(0).describe('总轮询池数'),
  totalInstances: z.number().int().min(0).describe('总实例数'),
  healthyInstances: z.number().int().min(0).describe('健康实例数'),
  overallAvailability: z.number().min(0).max(1).describe('整体可用率'),
  pools: z.record(z.string(), PoolStatisticsSchema).describe('轮询池统计'),
  timestamp: z.string().datetime().describe('报告时间')
});

export type SystemPoolReportDTO = z.infer<typeof SystemPoolReportSchema>;

// ==================== 任务组Schema定义 ====================

/**
 * 层级状态Schema
 */
export const EchelonStatusSchema = z.object({
  name: z.string().min(1).max(50).describe('层级名称'),
  priority: z.number().int().min(1).max(10).describe('优先级'),
  modelCount: z.number().int().min(0).describe('模型数量'),
  available: z.boolean().describe('是否可用'),
  models: z.array(z.string()).describe('模型列表')
});

/**
 * 层级分布Schema
 */
export const EchelonDistributionSchema = z.object({
  priority: z.number().int().min(1).max(10).describe('优先级'),
  modelCount: z.number().int().min(0).describe('模型数量'),
  availability: z.boolean().describe('是否可用')
});

/**
 * 任务组状态Schema
 */
export const TaskGroupStatusSchema = z.object({
  totalEchelons: z.number().int().min(0).describe('总层级数'),
  totalModels: z.number().int().min(0).describe('总模型数'),
  available: z.boolean().describe('是否可用'),
  echelons: z.array(EchelonStatusSchema).describe('层级状态列表'),
  lastChecked: z.string().datetime().describe('最后检查时间')
});

/**
 * 任务组统计Schema
 */
export const TaskGroupStatisticsSchema = z.object({
  name: z.string().min(1).max(100).describe('任务组名称'),
  totalEchelons: z.number().int().min(0).describe('总层级数'),
  totalModels: z.number().int().min(0).describe('总模型数'),
  availabilityRate: z.number().min(0).max(1).describe('可用率'),
  echelonDistribution: z.record(z.string(), EchelonDistributionSchema).describe('层级分布')
});

/**
 * 任务组Schema
 */
export const TaskGroupSchema = z.object({
  name: z.string().min(1).max(100).describe('任务组名称'),
  config: z.record(z.string(), z.unknown()).describe('任务组配置'),
  status: TaskGroupStatusSchema.describe('任务组状态'),
  statistics: TaskGroupStatisticsSchema.describe('任务组统计')
});

export type TaskGroupDTO = z.infer<typeof TaskGroupSchema>;

/**
 * 组引用解析Schema
 */
export const GroupReferenceParseSchema = z.object({
  groupName: z.string().min(1).max(100).describe('组名称'),
  echelonOrTask: z.string().nullable().describe('层级或任务'),
  isValid: z.boolean().describe('是否有效'),
  fullReference: z.string().describe('完整引用')
});

export type GroupReferenceParseDTO = z.infer<typeof GroupReferenceParseSchema>;

/**
 * 熔断器Schema
 */
export const CircuitBreakerSchema = z.object({
  failureThreshold: z.number().int().min(1).describe('失败阈值'),
  recoveryTime: z.number().int().min(1).describe('恢复时间'),
  halfOpenRequests: z.number().int().min(1).describe('半开请求数')
});

/**
 * 降级配置Schema
 */
export const FallbackConfigSchema = z.object({
  strategy: z.string().min(1).max(50).describe('降级策略'),
  fallbackGroups: z.array(z.string().min(1)).describe('降级组列表'),
  maxAttempts: z.number().int().min(1).describe('最大尝试次数'),
  retryDelay: z.number().int().min(0).describe('重试延迟'),
  circuitBreaker: CircuitBreakerSchema.optional().describe('熔断器配置')
});

export type FallbackConfigDTO = z.infer<typeof FallbackConfigSchema>;

/**
 * 层级配置Schema
 */
export const EchelonConfigSchema = z.object({
  priority: z.number().int().min(1).max(10).describe('优先级'),
  models: z.array(z.string().min(1)).describe('模型列表'),
  fallbackStrategy: z.string().max(50).optional().describe('降级策略'),
  maxAttempts: z.number().int().min(1).optional().describe('最大尝试次数'),
  retryDelay: z.number().int().min(0).optional().describe('重试延迟')
});

/**
 * 任务组创建Schema
 */
export const TaskGroupCreateSchema = z.object({
  name: z.string().min(1).max(100).describe('任务组名称'),
  config: z.record(z.string(), z.unknown()).describe('任务组配置'),
  echelons: z.record(z.string(), EchelonConfigSchema).describe('层级配置')
});

export type TaskGroupCreateDTO = z.infer<typeof TaskGroupCreateSchema>;

/**
 * 任务组更新Schema
 */
export const TaskGroupUpdateSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional().describe('任务组配置'),
  echelons: z.record(z.string(), EchelonConfigSchema).optional().describe('层级配置')
});

export type TaskGroupUpdateDTO = z.infer<typeof TaskGroupUpdateSchema>;

/**
 * 任务组健康报告Schema
 */
export const TaskGroupHealthReportSchema = z.object({
  groupName: z.string().min(1).max(100).describe('任务组名称'),
  status: z.enum(['healthy', 'degraded', 'unhealthy']).describe('健康状态'),
  issues: z.array(z.string()).describe('问题列表'),
  recommendations: z.array(z.string()).describe('建议列表'),
  statistics: TaskGroupStatisticsSchema.describe('任务组统计'),
  lastChecked: z.string().datetime().describe('最后检查时间')
});

export type TaskGroupHealthReportDTO = z.infer<typeof TaskGroupHealthReportSchema>;

/**
 * 系统级任务组报告Schema
 */
export const SystemTaskGroupReportSchema = z.object({
  totalGroups: z.number().int().min(0).describe('总任务组数'),
  totalModels: z.number().int().min(0).describe('总模型数'),
  groups: z.record(z.string(), TaskGroupStatisticsSchema).describe('任务组统计'),
  timestamp: z.string().datetime().describe('报告时间')
});

export type SystemTaskGroupReportDTO = z.infer<typeof SystemTaskGroupReportSchema>;

/**
 * 最优任务组选择Schema
 */
export const OptimalTaskGroupSelectionSchema = z.object({
  selectedGroup: z.string().nullable().describe('选中的任务组'),
  alternatives: z.array(z.string()).describe('备选任务组'),
  selectionCriteria: z.record(z.string(), z.unknown()).describe('选择标准'),
  confidence: z.number().min(0).max(1).describe('置信度')
});

export type OptimalTaskGroupSelectionDTO = z.infer<typeof OptimalTaskGroupSelectionSchema>;

/**
 * 模型列表Schema
 */
export const ModelListSchema = z.object({
  models: z.array(z.string()).describe('模型列表'),
  totalCount: z.number().int().min(0).describe('总数量'),
  availableCount: z.number().int().min(0).describe('可用数量'),
  unavailableCount: z.number().int().min(0).describe('不可用数量')
});

export type ModelListDTO = z.infer<typeof ModelListSchema>;

/**
 * 层级优先级Schema
 */
export const EchelonPrioritySchema = z.object({
  echelonName: z.string().min(1).max(50).describe('层级名称'),
  priority: z.number().int().min(1).max(10).describe('优先级'),
  models: z.array(z.string()).describe('模型列表')
});

export type EchelonPriorityDTO = z.infer<typeof EchelonPrioritySchema>;

// ==================== DTO类定义 ====================

/**
 * 轮询池DTO类
 */
export class PoolDto extends BaseDto<typeof PoolSchema> {
  constructor() {
    super(PoolSchema, '1.0.0');
  }
}

/**
 * 实例DTO类
 */
export class InstanceDto extends BaseDto<typeof InstanceSchema> {
  constructor() {
    super(InstanceSchema, '1.0.0');
  }
}

/**
 * 轮询池创建DTO类
 */
export class PoolCreateDto extends BaseDto<typeof PoolCreateSchema> {
  constructor() {
    super(PoolCreateSchema, '1.0.0');
  }
}

/**
 * 轮询池更新DTO类
 */
export class PoolUpdateDto extends BaseDto<typeof PoolUpdateSchema> {
  constructor() {
    super(PoolUpdateSchema, '1.0.0');
  }
}

/**
 * 轮询池健康报告DTO类
 */
export class PoolHealthReportDto extends BaseDto<typeof PoolHealthReportSchema> {
  constructor() {
    super(PoolHealthReportSchema, '1.0.0');
  }
}

/**
 * 系统轮询池报告DTO类
 */
export class SystemPoolReportDto extends BaseDto<typeof SystemPoolReportSchema> {
  constructor() {
    super(SystemPoolReportSchema, '1.0.0');
  }
}

/**
 * 任务组DTO类
 */
export class TaskGroupDto extends BaseDto<typeof TaskGroupSchema> {
  constructor() {
    super(TaskGroupSchema, '1.0.0');
  }
}

/**
 * 任务组创建DTO类
 */
export class TaskGroupCreateDto extends BaseDto<typeof TaskGroupCreateSchema> {
  constructor() {
    super(TaskGroupCreateSchema, '1.0.0');
  }
}

/**
 * 任务组更新DTO类
 */
export class TaskGroupUpdateDto extends BaseDto<typeof TaskGroupUpdateSchema> {
  constructor() {
    super(TaskGroupUpdateSchema, '1.0.0');
  }
}

/**
 * 任务组健康报告DTO类
 */
export class TaskGroupHealthReportDto extends BaseDto<typeof TaskGroupHealthReportSchema> {
  constructor() {
    super(TaskGroupHealthReportSchema, '1.0.0');
  }
}

/**
 * 系统任务组报告DTO类
 */
export class SystemTaskGroupReportDto extends BaseDto<typeof SystemTaskGroupReportSchema> {
  constructor() {
    super(SystemTaskGroupReportSchema, '1.0.0');
  }
}

/**
 * 最优任务组选择DTO类
 */
export class OptimalTaskGroupSelectionDto extends BaseDto<typeof OptimalTaskGroupSelectionSchema> {
  constructor() {
    super(OptimalTaskGroupSelectionSchema, '1.0.0');
  }
}

/**
 * 模型列表DTO类
 */
export class ModelListDto extends BaseDto<typeof ModelListSchema> {
  constructor() {
    super(ModelListSchema, '1.0.0');
  }
}

/**
 * 层级优先级DTO类
 */
export class EchelonPriorityDto extends BaseDto<typeof EchelonPrioritySchema> {
  constructor() {
    super(EchelonPrioritySchema, '1.0.0');
  }
}

// ==================== 转换器定义 ====================

/**
 * 轮询池转换器
 */
export class PoolConverter extends DtoConverter<any, PoolDTO> {
  toDto(entity: any, options?: any): PoolDTO {
    return {
      name: entity.name || '',
      config: entity.config || {},
      status: {
        totalInstances: entity.status?.totalInstances || 0,
        healthyInstances: entity.status?.healthyInstances || 0,
        degradedInstances: entity.status?.degradedInstances || 0,
        failedInstances: entity.status?.failedInstances || 0,
        availabilityRate: entity.status?.availabilityRate || 0,
        concurrencyStatus: {
          enabled: entity.status?.concurrencyStatus?.enabled || false,
          currentLoad: entity.status?.concurrencyStatus?.currentLoad || 0,
          maxLoad: entity.status?.concurrencyStatus?.maxLoad || 0,
          loadPercentage: entity.status?.concurrencyStatus?.loadPercentage || 0
        },
        lastChecked: entity.status?.lastChecked?.toISOString() || new Date().toISOString()
      },
      statistics: {
        totalRequests: entity.statistics?.totalRequests || 0,
        successfulRequests: entity.statistics?.successfulRequests || 0,
        failedRequests: entity.statistics?.failedRequests || 0,
        avgResponseTime: entity.statistics?.avgResponseTime || 0,
        successRate: entity.statistics?.successRate || 0,
        currentLoad: entity.statistics?.currentLoad || 0,
        maxConcurrency: entity.statistics?.maxConcurrency || 0
      }
    };
  }

  toEntity(dto: PoolDTO, options?: any): any {
    // 注意：从DTO到领域对象的转换需要业务上下文
    throw new Error('DTO到Entity的转换需要业务上下文，请使用工厂方法');
  }

  override toDtoList(entities: any[], options?: any): PoolDTO[] {
    return entities.map(entity => this.toDto(entity, options));
  }

  override toEntityList(dtos: PoolDTO[], options?: any): any[] {
    return dtos.map(dto => this.toEntity(dto, options));
  }
}

/**
 * 任务组转换器
 */
export class TaskGroupConverter extends DtoConverter<any, TaskGroupDTO> {
  toDto(entity: any, options?: any): TaskGroupDTO {
    return {
      name: entity.name || '',
      config: entity.config || {},
      status: {
        totalEchelons: entity.status?.totalEchelons || 0,
        totalModels: entity.status?.totalModels || 0,
        available: entity.status?.available || false,
        echelons: entity.status?.echelons || [],
        lastChecked: entity.status?.lastChecked?.toISOString() || new Date().toISOString()
      },
      statistics: {
        name: entity.statistics?.name || entity.name || '',
        totalEchelons: entity.statistics?.totalEchelons || 0,
        totalModels: entity.statistics?.totalModels || 0,
        availabilityRate: entity.statistics?.availabilityRate || 0,
        echelonDistribution: entity.statistics?.echelonDistribution || {}
      }
    };
  }

  toEntity(dto: TaskGroupDTO, options?: any): any {
    // 注意：从DTO到领域对象的转换需要业务上下文
    throw new Error('DTO到Entity的转换需要业务上下文，请使用工厂方法');
  }

  override toDtoList(entities: any[], options?: any): TaskGroupDTO[] {
    return entities.map(entity => this.toDto(entity, options));
  }

  override toEntityList(dtos: TaskGroupDTO[], options?: any): any[] {
    return dtos.map(dto => this.toEntity(dto, options));
  }
}

/**
 * 实例转换器
 */
export class InstanceConverter extends DtoConverter<any, InstanceDTO> {
  toDto(entity: any, options?: any): InstanceDTO {
    return {
      instanceId: entity.instanceId?.toString() || entity.id?.toString() || '',
      modelName: entity.modelName || '',
      groupName: entity.groupName || '',
      echelon: entity.echelon || '',
      status: entity.status || 'unknown',
      currentLoad: entity.currentLoad || 0,
      maxConcurrency: entity.maxConcurrency || 0,
      avgResponseTime: entity.avgResponseTime || 0,
      successCount: entity.successCount || 0,
      failureCount: entity.failureCount || 0,
      successRate: entity.successRate || 0,
      healthScore: entity.healthScore || 0,
      available: Boolean(entity.available),
      canAcceptRequest: Boolean(entity.canAcceptRequest),
      lastUsed: entity.lastUsed?.toISOString() || null,
      lastHealthCheck: entity.lastHealthCheck?.toISOString() || new Date().toISOString()
    };
  }

  toEntity(dto: InstanceDTO, options?: any): any {
    // 注意：从DTO到领域对象的转换需要业务上下文
    throw new Error('DTO到Entity的转换需要业务上下文，请使用工厂方法');
  }

  override toDtoList(entities: any[], options?: any): InstanceDTO[] {
    return entities.map(entity => this.toDto(entity, options));
  }

  override toEntityList(dtos: InstanceDTO[], options?: any): any[] {
    return dtos.map(dto => this.toEntity(dto, options));
  }
}
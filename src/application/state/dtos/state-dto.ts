/**
 * State模块DTO定义
 * 基于Zod的类型安全DTO实现
 */

import { z } from 'zod';
import { BaseDto, DtoValidationError } from '../../common/dto/base-dto';
import { DtoConverter } from '../../common/dto/dto-converter';

// 重新导出 DtoValidationError
export { DtoValidationError };

// ==================== Schema定义 ====================

/**
 * 工作流状态Schema
 */
export const WorkflowStateSchema = z.object({
  workflowId: z.string().describe('工作流ID'),
  threadId: z.string().describe('线程ID'),
  data: z.record(z.string(), z.unknown()).describe('状态数据'),
  metadata: z.record(z.string(), z.unknown()).describe('元数据'),
  version: z.string().describe('版本号'),
  timestamp: z.string().datetime().describe('时间戳')
});

export type WorkflowStateDTO = z.infer<typeof WorkflowStateSchema>;

/**
 * 状态历史条目Schema
 */
export const StateHistoryEntrySchema = z.object({
  nodeId: z.string().describe('节点ID'),
  status: z.string().describe('状态'),
  timestamp: z.string().datetime().describe('时间戳'),
  result: z.record(z.string(), z.unknown()).optional().describe('结果'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('元数据')
});

export type StateHistoryEntryDTO = z.infer<typeof StateHistoryEntrySchema>;

/**
 * 检查点Schema
 */
export const CheckpointSchema = z.object({
  id: z.string().describe('检查点ID'),
  threadId: z.string().describe('线程ID'),
  workflowId: z.string().describe('工作流ID'),
  currentNodeId: z.string().describe('当前节点ID'),
  stateSnapshot: z.record(z.string(), z.unknown()).describe('状态快照'),
  timestamp: z.number().int().describe('时间戳'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('元数据')
});

export type CheckpointDTO = z.infer<typeof CheckpointSchema>;

/**
 * 检查点创建Schema
 */
export const CheckpointCreateSchema = z.object({
  threadId: z.string().describe('线程ID'),
  workflowId: z.string().describe('工作流ID'),
  currentNodeId: z.string().describe('当前节点ID'),
  state: z.record(z.string(), z.unknown()).describe('状态'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('元数据')
});

export type CheckpointCreateDTO = z.infer<typeof CheckpointCreateSchema>;

/**
 * 快照Schema
 */
export const SnapshotSchema = z.object({
  id: z.string().describe('快照ID'),
  scope: z.string().describe('范围'),
  targetId: z.string().optional().describe('目标ID'),
  type: z.string().describe('类型'),
  stateData: z.record(z.string(), z.unknown()).describe('状态数据'),
  createdAt: z.string().datetime().describe('创建时间'),
  restoreCount: z.number().int().min(0).describe('恢复次数'),
  canRestore: z.boolean().describe('是否可恢复')
});

export type SnapshotDTO = z.infer<typeof SnapshotSchema>;

/**
 * 快照创建Schema
 */
export const SnapshotCreateSchema = z.object({
  scope: z.string().describe('范围'),
  targetId: z.string().optional().describe('目标ID'),
  type: z.string().describe('类型'),
  stateData: z.record(z.string(), z.unknown()).describe('状态数据'),
  title: z.string().optional().describe('标题'),
  description: z.string().optional().describe('描述')
});

export type SnapshotCreateDTO = z.infer<typeof SnapshotCreateSchema>;

/**
 * 状态恢复Schema
 */
export const StateRecoverySchema = z.object({
  threadId: z.string().describe('线程ID'),
  checkpointId: z.string().optional().describe('检查点ID'),
  snapshotId: z.string().optional().describe('快照ID'),
  restoredAt: z.string().datetime().describe('恢复时间'),
  success: z.boolean().describe('是否成功'),
  error: z.string().optional().describe('错误信息')
});

export type StateRecoveryDTO = z.infer<typeof StateRecoverySchema>;

/**
 * 状态统计Schema
 */
export const StateStatisticsSchema = z.object({
  totalCheckpoints: z.number().int().min(0).describe('总检查点数'),
  totalSnapshots: z.number().int().min(0).describe('总快照数'),
  totalHistoryEntries: z.number().int().min(0).describe('总历史记录数'),
  activeCheckpoints: z.number().int().min(0).describe('活跃检查点数'),
  restorableSnapshots: z.number().int().min(0).describe('可恢复快照数')
});

export type StateStatisticsDTO = z.infer<typeof StateStatisticsSchema>;

/**
 * 状态变更Schema
 */
export const StateChangeSchema = z.object({
  threadId: z.string().describe('线程ID'),
  changeType: z.string().describe('变更类型'),
  previousState: z.record(z.string(), z.unknown()).optional().describe('前一状态'),
  newState: z.record(z.string(), z.unknown()).describe('新状态'),
  timestamp: z.string().datetime().describe('时间戳'),
  details: z.record(z.string(), z.unknown()).optional().describe('详细信息')
});

export type StateChangeDTO = z.infer<typeof StateChangeSchema>;

// ==================== DTO类定义 ====================

/**
 * 工作流状态DTO类
 */
export class WorkflowStateDto extends BaseDto<typeof WorkflowStateSchema> {
  constructor() {
    super(WorkflowStateSchema, '1.0.0');
  }
}

/**
 * 状态历史条目DTO类
 */
export class StateHistoryEntryDto extends BaseDto<typeof StateHistoryEntrySchema> {
  constructor() {
    super(StateHistoryEntrySchema, '1.0.0');
  }
}

/**
 * 检查点DTO类
 */
export class CheckpointDto extends BaseDto<typeof CheckpointSchema> {
  constructor() {
    super(CheckpointSchema, '1.0.0');
  }
}

/**
 * 检查点创建DTO类
 */
export class CheckpointCreateDto extends BaseDto<typeof CheckpointCreateSchema> {
  constructor() {
    super(CheckpointCreateSchema, '1.0.0');
  }
}

/**
 * 快照DTO类
 */
export class SnapshotDto extends BaseDto<typeof SnapshotSchema> {
  constructor() {
    super(SnapshotSchema, '1.0.0');
  }
}

/**
 * 快照创建DTO类
 */
export class SnapshotCreateDto extends BaseDto<typeof SnapshotCreateSchema> {
  constructor() {
    super(SnapshotCreateSchema, '1.0.0');
  }
}

/**
 * 状态恢复DTO类
 */
export class StateRecoveryDto extends BaseDto<typeof StateRecoverySchema> {
  constructor() {
    super(StateRecoverySchema, '1.0.0');
  }
}

/**
 * 状态统计DTO类
 */
export class StateStatisticsDto extends BaseDto<typeof StateStatisticsSchema> {
  constructor() {
    super(StateStatisticsSchema, '1.0.0');
  }
}

/**
 * 状态变更DTO类
 */
export class StateChangeDto extends BaseDto<typeof StateChangeSchema> {
  constructor() {
    super(StateChangeSchema, '1.0.0');
  }
}

// ==================== 转换器定义 ====================

/**
 * 工作流状态转换器
 */
export class WorkflowStateConverter extends DtoConverter<any, WorkflowStateDTO> {
  toDto(entity: any, options?: any): WorkflowStateDTO {
    return {
      workflowId: entity.workflowId?.toString() || '',
      threadId: entity.threadId || '',
      data: entity.data || {},
      metadata: entity.metadata || {},
      version: entity.version?.toString() || '1.0.0',
      timestamp: entity.timestamp?.toISOString() || new Date().toISOString()
    };
  }

  toEntity(dto: WorkflowStateDTO, options?: any): any {
    throw new Error('DTO到Entity的转换需要业务上下文，请使用工厂方法');
  }

  override toDtoList(entities: any[], options?: any): WorkflowStateDTO[] {
    return entities.map(entity => this.toDto(entity, options));
  }

  override toEntityList(dtos: WorkflowStateDTO[], options?: any): any[] {
    return dtos.map(dto => this.toEntity(dto, options));
  }
}

/**
 * 检查点转换器
 */
export class CheckpointConverter extends DtoConverter<any, CheckpointDTO> {
  toDto(entity: any, options?: any): CheckpointDTO {
    return {
      id: entity.id?.toString() || '',
      threadId: entity.threadId || '',
      workflowId: entity.workflowId?.toString() || '',
      currentNodeId: entity.currentNodeId?.toString() || '',
      stateSnapshot: entity.stateSnapshot || {},
      timestamp: entity.timestamp || Date.now(),
      metadata: entity.metadata || {}
    };
  }

  toEntity(dto: CheckpointDTO, options?: any): any {
    throw new Error('DTO到Entity的转换需要业务上下文，请使用工厂方法');
  }

  override toDtoList(entities: any[], options?: any): CheckpointDTO[] {
    return entities.map(entity => this.toDto(entity, options));
  }

  override toEntityList(dtos: CheckpointDTO[], options?: any): any[] {
    return dtos.map(dto => this.toEntity(dto, options));
  }
}

/**
 * 快照转换器
 */
export class SnapshotConverter extends DtoConverter<any, SnapshotDTO> {
  toDto(entity: any, options?: any): SnapshotDTO {
    return {
      id: entity.id?.toString() || '',
      scope: entity.scope?.getValue() || entity.scope || '',
      targetId: entity.targetId?.toString(),
      type: entity.type?.value || entity.type || '',
      stateData: entity.stateData || {},
      createdAt: entity.createdAt?.toISOString() || new Date().toISOString(),
      restoreCount: entity.restoreCount || 0,
      canRestore: entity.canRestore?.() || entity.canRestore || false
    };
  }

  toEntity(dto: SnapshotDTO, options?: any): any {
    throw new Error('DTO到Entity的转换需要业务上下文，请使用工厂方法');
  }

  override toDtoList(entities: any[], options?: any): SnapshotDTO[] {
    return entities.map(entity => this.toDto(entity, options));
  }

  override toEntityList(dtos: SnapshotDTO[], options?: any): any[] {
    return dtos.map(dto => this.toEntity(dto, options));
  }
}

/**
 * 状态历史条目转换器
 */
export class StateHistoryEntryConverter extends DtoConverter<any, StateHistoryEntryDTO> {
  toDto(entity: any, options?: any): StateHistoryEntryDTO {
    return {
      nodeId: entity.nodeId?.toString() || '',
      status: entity.status?.value || entity.status || '',
      timestamp: entity.timestamp?.toISOString() || new Date().toISOString(),
      result: entity.result,
      metadata: entity.metadata
    };
  }

  toEntity(dto: StateHistoryEntryDTO, options?: any): any {
    throw new Error('DTO到Entity的转换需要业务上下文，请使用工厂方法');
  }

  override toDtoList(entities: any[], options?: any): StateHistoryEntryDTO[] {
    return entities.map(entity => this.toDto(entity, options));
  }

  override toEntityList(dtos: StateHistoryEntryDTO[], options?: any): any[] {
    return dtos.map(dto => this.toEntity(dto, options));
  }
}
import { ID } from '../../domain/common/value-objects/id';
import { Checkpoint } from '../../domain/threads/checkpoints/entities/checkpoint';
import { ICheckpointRepository } from '../../domain/threads/checkpoints/repositories/checkpoint-repository';
import { ILogger } from '../../domain/common/types/logger-types';

/**
 * 验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * 损坏检测结果
 */
export interface CorruptionDetectionResult {
  isCorrupted: boolean;
  corruptionType: 'none' | 'data' | 'state' | 'metadata' | 'multiple';
  details: string[];
  canRepair: boolean;
}

/**
 * 修复结果
 */
export interface RepairResult {
  success: boolean;
  repairedFields: string[];
  unrepairedFields: string[];
  message: string;
}

/**
 * 检查点验证服务
 *
 * 负责检查点数据完整性验证和损坏检测
 */
export class CheckpointValidation {
  constructor(
    private readonly repository: ICheckpointRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * 验证检查点数据完整性
   */
  async validateCheckpoint(checkpointId: ID): Promise<ValidationResult> {
    const checkpoint = await this.repository.findById(checkpointId);
    if (!checkpoint) {
      return {
        isValid: false,
        errors: [{ field: 'checkpoint', message: '检查点不存在', severity: 'error' }],
        warnings: [],
      };
    }

    const errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // 验证必需字段
    this.validateRequiredFields(checkpoint, errors);

    // 验证数据类型
    this.validateDataTypes(checkpoint, errors);

    // 验证数据格式
    this.validateDataFormats(checkpoint, errors, warnings);

    // 验证业务规则
    this.validateBusinessRules(checkpoint, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 批量验证检查点
   */
  async validateCheckpoints(checkpointIds: ID[]): Promise<Map<ID, ValidationResult>> {
    const results = new Map<ID, ValidationResult>();
    
    for (const checkpointId of checkpointIds) {
      const result = await this.validateCheckpoint(checkpointId);
      results.set(checkpointId, result);
    }

    return results;
  }

  /**
   * 检测检查点是否损坏
   */
  async detectCorruption(checkpointId: ID): Promise<CorruptionDetectionResult> {
    const checkpoint = await this.repository.findById(checkpointId);
    if (!checkpoint) {
      return {
        isCorrupted: true,
        corruptionType: 'data',
        details: ['检查点不存在'],
        canRepair: false,
      };
    }

    const details: string[] = [];
    let corruptionType: 'none' | 'data' | 'state' | 'metadata' | 'multiple' = 'none';

    // 检测数据损坏
    if (!this.isDataValid(checkpoint.stateData)) {
      details.push('状态数据损坏或格式不正确');
      corruptionType = corruptionType === 'none' ? 'data' : 'multiple';
    }

    // 检测 State 数据完整性
    if (!this.isStateDataValid(checkpoint.stateData)) {
      details.push('State 数据不完整');
      corruptionType = corruptionType === 'none' ? 'state' : 'multiple';
    }

    // 检测元数据有效性
    if (!this.isMetadataValid(checkpoint.metadata)) {
      details.push('元数据无效');
      corruptionType = corruptionType === 'none' ? 'metadata' : 'multiple';
    }

    return {
      isCorrupted: corruptionType !== 'none',
      corruptionType,
      details,
      canRepair: this.canRepair(corruptionType),
    };
  }

  /**
   * 尝试修复损坏的检查点
   * 注意：由于 Checkpoint 实体的属性是只读的，此方法只返回修复建议
   * 实际修复需要删除损坏的检查点并创建新的
   */
  async repairCheckpoint(checkpointId: ID): Promise<RepairResult> {
    const corruptionResult = await this.detectCorruption(checkpointId);
    
    if (!corruptionResult.isCorrupted) {
      return {
        success: true,
        repairedFields: [],
        unrepairedFields: [],
        message: '检查点未损坏，无需修复',
      };
    }

    if (!corruptionResult.canRepair) {
      return {
        success: false,
        repairedFields: [],
        unrepairedFields: corruptionResult.details,
        message: '无法自动修复，需要手动处理',
      };
    }

    const checkpoint = await this.repository.findById(checkpointId);
    if (!checkpoint) {
      return {
        success: false,
        repairedFields: [],
        unrepairedFields: [],
        message: '检查点不存在',
      };
    }

    const repairedFields: string[] = [];
    const unrepairedFields: string[] = [];

    // 尝试修复 State 数据
    if (corruptionResult.corruptionType === 'state' || corruptionResult.corruptionType === 'multiple') {
      const repairResult = this.repairStateData(checkpoint.stateData);
      if (repairResult.success) {
        repairedFields.push('stateData');
      } else {
        unrepairedFields.push('stateData');
      }
    }

    // 尝试修复元数据
    if (corruptionResult.corruptionType === 'metadata' || corruptionResult.corruptionType === 'multiple') {
      const repairResult = this.repairMetadata(checkpoint.metadata);
      if (repairResult.success) {
        repairedFields.push('metadata');
      } else {
        unrepairedFields.push('metadata');
      }
    }

    this.logger.info('检查点修复分析完成', {
      checkpointId: checkpointId.value,
      repairedFields,
      unrepairedFields,
    });

    return {
      success: unrepairedFields.length === 0,
      repairedFields,
      unrepairedFields,
      message: unrepairedFields.length === 0
        ? '修复建议已生成，请手动删除损坏的检查点并使用修复后的数据创建新检查点'
        : `部分修复建议已生成，无法修复的字段: ${unrepairedFields.join(', ')}`,
    };
  }

  /**
   * 验证必需字段
   */
  private validateRequiredFields(
    checkpoint: Checkpoint,
    errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }>
  ): void {
    const requiredFields = [
      'checkpointId',
      'threadId',
      'type',
      'stateData',
      'createdAt',
    ];

    for (const field of requiredFields) {
      if (!(field in checkpoint) || checkpoint[field as keyof Checkpoint] === undefined) {
        errors.push({
          field,
          message: `必需字段 ${field} 缺失`,
          severity: 'error',
        });
      }
    }
  }

  /**
   * 验证数据类型
   */
  private validateDataTypes(
    checkpoint: Checkpoint,
    errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }>
  ): void {
    // 验证 stateData 是对象
    if (typeof checkpoint.stateData !== 'object' || checkpoint.stateData === null) {
      errors.push({
        field: 'stateData',
        message: 'stateData 必须是对象',
        severity: 'error',
      });
    }

    // 验证 sizeBytes 是数字
    if (typeof checkpoint.sizeBytes !== 'number' || checkpoint.sizeBytes < 0) {
      errors.push({
        field: 'sizeBytes',
        message: 'sizeBytes 必须是非负数',
        severity: 'error',
      });
    }

    // 验证 restoreCount 是数字
    if (typeof checkpoint.restoreCount !== 'number' || checkpoint.restoreCount < 0) {
      errors.push({
        field: 'restoreCount',
        message: 'restoreCount 必须是非负数',
        severity: 'error',
      });
    }
  }

  /**
   * 验证数据格式
   */
  private validateDataFormats(
    checkpoint: Checkpoint,
    errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }>,
    warnings: Array<{ field: string; message: string }>
  ): void {
    // 验证 stateData 中的必需字段
    if (typeof checkpoint.stateData === 'object' && checkpoint.stateData !== null) {
      const stateData = checkpoint.stateData as Record<string, unknown>;
      const requiredStateFields = ['threadId', 'sessionId', 'workflowId'];
      
      for (const field of requiredStateFields) {
        if (!(field in stateData) || stateData[field] === undefined) {
          errors.push({
            field: `stateData.${field}`,
            message: `stateData 中缺少必需字段 ${field}`,
            severity: 'error',
          });
        }
      }
    }

    // 验证 tags 是数组
    if (!Array.isArray(checkpoint.tags)) {
      errors.push({
        field: 'tags',
        message: 'tags 必须是数组',
        severity: 'error',
      });
    }

    // 验证 metadata 是对象
    if (typeof checkpoint.metadata !== 'object' || checkpoint.metadata === null) {
      errors.push({
        field: 'metadata',
        message: 'metadata 必须是对象',
        severity: 'error',
      });
    }
  }

  /**
   * 验证业务规则
   */
  private validateBusinessRules(
    checkpoint: Checkpoint,
    errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }>,
    warnings: Array<{ field: string; message: string }>
  ): void {
    // 检查检查点是否过期
    if (checkpoint.isExpired()) {
      warnings.push({
        field: 'expiration',
        message: '检查点已过期',
      });
    }

    // 检查检查点大小是否过大
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (checkpoint.sizeBytes > maxSize) {
      warnings.push({
        field: 'sizeBytes',
        message: `检查点大小过大 (${this.formatBytes(checkpoint.sizeBytes)})，建议启用压缩`,
      });
    }

    // 检查恢复次数是否异常高
    if (checkpoint.restoreCount > 100) {
      warnings.push({
        field: 'restoreCount',
        message: `恢复次数异常高 (${checkpoint.restoreCount})，可能存在频繁恢复问题`,
      });
    }
  }

  /**
   * 检查数据是否有效
   */
  private isDataValid(data: Record<string, unknown>): boolean {
    try {
      // 尝试序列化和反序列化
      const serialized = JSON.stringify(data);
      JSON.parse(serialized);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查 State 数据是否完整
   */
  private isStateDataValid(stateData: Record<string, unknown>): boolean {
    if (typeof stateData !== 'object' || stateData === null) {
      return false;
    }

    const requiredFields = ['threadId', 'sessionId', 'workflowId', 'state'];
    for (const field of requiredFields) {
      if (!(field in stateData)) {
        return false;
      }
    }

    // 检查 state 字段是否有效
    const state = stateData['state'] as Record<string, unknown>;
    if (typeof state !== 'object' || state === null) {
      return false;
    }

    const requiredStateFields = ['data', 'metadata', 'version'];
    for (const field of requiredStateFields) {
      if (!(field in state)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查元数据是否有效
   */
  private isMetadataValid(metadata: Record<string, unknown>): boolean {
    if (typeof metadata !== 'object' || metadata === null) {
      return false;
    }

    try {
      // 尝试序列化和反序列化
      const serialized = JSON.stringify(metadata);
      JSON.parse(serialized);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 判断是否可以修复
   */
  private canRepair(corruptionType: 'none' | 'data' | 'state' | 'metadata' | 'multiple'): boolean {
    // 只有 state 和 metadata 类型的损坏可以尝试修复
    return corruptionType === 'state' || corruptionType === 'metadata' || corruptionType === 'multiple';
  }

  /**
   * 修复 State 数据
   */
  private repairStateData(stateData: Record<string, unknown>): {
    success: boolean;
    data: Record<string, unknown>;
  } {
    try {
      // 尝试清理和重建 State 数据
      const cleanedData: Record<string, unknown> = {};

      // 保留基本字段
      const basicFields = ['threadId', 'sessionId', 'workflowId', 'status', 'execution'];
      for (const field of basicFields) {
        if (field in stateData && stateData[field] !== undefined) {
          cleanedData[field] = stateData[field];
        }
      }

      // 修复 state 字段
      if ('state' in stateData && typeof stateData['state'] === 'object') {
        const state = stateData['state'] as Record<string, unknown>;
        cleanedData['state'] = {
          data: state['data'] || {},
          metadata: state['metadata'] || {},
          version: state['version'] || '1.0.0',
          createdAt: state['createdAt'] || new Date().toISOString(),
          updatedAt: state['updatedAt'] || new Date().toISOString(),
        };
      }

      return {
        success: true,
        data: cleanedData,
      };
    } catch (error) {
      return {
        success: false,
        data: stateData,
      };
    }
  }

  /**
   * 修复元数据
   */
  private repairMetadata(metadata: Record<string, unknown>): {
    success: boolean;
    data: Record<string, unknown>;
  } {
    try {
      // 尝试清理元数据
      const cleanedMetadata: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(metadata)) {
        // 只保留有效的键值对
        if (key && value !== undefined) {
          try {
            // 验证值是否可以序列化
            JSON.stringify(value);
            cleanedMetadata[key] = value;
          } catch (error) {
            // 跳过无法序列化的值
            continue;
          }
        }
      }

      return {
        success: true,
        data: cleanedMetadata,
      };
    } catch (error) {
      return {
        success: false,
        data: metadata,
      };
    }
  }

  /**
   * 格式化字节数为可读字符串
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
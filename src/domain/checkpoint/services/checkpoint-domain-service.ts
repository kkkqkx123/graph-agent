import { ID } from '../../common/value-objects/id';
import { Checkpoint } from '../entities/checkpoint';
import { CheckpointType, CheckpointTypeValue } from '../value-objects/checkpoint-type';

/**
 * 检查点领域服务接口
 * 
 * 定义检查点相关的业务逻辑
 */
export interface CheckpointDomainService {
  /**
   * 创建自动检查点
   * @param threadId 线程ID
   * @param stateData 状态数据
   * @param metadata 元数据
   * @returns 检查点实例
   */
  createAutoCheckpoint(
    threadId: ID,
    stateData: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<Checkpoint>;

  /**
   * 创建手动检查点
   * @param threadId 线程ID
   * @param stateData 状态数据
   * @param title 标题
   * @param description 描述
   * @param tags 标签
   * @param metadata 元数据
   * @returns 检查点实例
   */
  createManualCheckpoint(
    threadId: ID,
    stateData: Record<string, unknown>,
    title?: string,
    description?: string,
    tags?: string[],
    metadata?: Record<string, unknown>
  ): Promise<Checkpoint>;

  /**
   * 创建错误检查点
   * @param threadId 线程ID
   * @param stateData 状态数据
   * @param errorMessage 错误消息
   * @param errorType 错误类型
   * @param metadata 元数据
   * @returns 检查点实例
   */
  createErrorCheckpoint(
    threadId: ID,
    stateData: Record<string, unknown>,
    errorMessage: string,
    errorType?: string,
    metadata?: Record<string, unknown>
  ): Promise<Checkpoint>;

  /**
   * 创建里程碑检查点
   * @param threadId 线程ID
   * @param stateData 状态数据
   * @param milestoneName 里程碑名称
   * @param description 描述
   * @param metadata 元数据
   * @returns 检查点实例
   */
  createMilestoneCheckpoint(
    threadId: ID,
    stateData: Record<string, unknown>,
    milestoneName: string,
    description?: string,
    metadata?: Record<string, unknown>
  ): Promise<Checkpoint>;

  /**
   * 从检查点恢复状态
   * @param checkpointId 检查点ID
   * @returns 状态数据
   */
  restoreFromCheckpoint(checkpointId: ID): Promise<Record<string, unknown> | null>;

  /**
   * 获取线程的检查点历史
   * @param threadId 线程ID
   * @param limit 数量限制
   * @returns 检查点列表
   */
  getThreadCheckpointHistory(
    threadId: ID,
    limit?: number
  ): Promise<Checkpoint[]>;

  /**
   * 获取检查点统计信息
   * @param threadId 线程ID
   * @returns 统计信息
   */
  getCheckpointStatistics(threadId: ID): Promise<{
    total: number;
    byType: Record<CheckpointTypeValue, number>;
    latestAt?: Date;
    oldestAt?: Date;
    averageInterval?: number;
  }>;

  /**
   * 清理过期检查点
   * @param threadId 线程ID
   * @param ttl 生存时间（小时）
   * @returns 清理的检查点数量
   */
  cleanupExpiredCheckpoints(threadId: ID, ttl: number): Promise<number>;

  /**
   * 清理多余的检查点
   * @param threadId 线程ID
   * @param maxCount 最大数量
   * @returns 清理的检查点数量
   */
  cleanupExcessCheckpoints(threadId: ID, maxCount: number): Promise<number>;

  /**
   * 验证检查点策略
   * @param threadId 线程ID
   * @param stateData 状态数据
   * @param context 上下文信息
   * @returns 是否应该创建检查点
   */
  shouldCreateCheckpoint(
    threadId: ID,
    stateData: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<boolean>;

  /**
   * 获取检查点建议
   * @param threadId 线程ID
   * @param stateData 状态数据
   * @param context 上下文信息
   * @returns 检查点建议
   */
  getCheckpointRecommendation(
    threadId: ID,
    stateData: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<{
    shouldCreate: boolean;
    recommendedType: CheckpointType;
    reason: string;
    suggestedTitle?: string;
    suggestedDescription?: string;
    suggestedTags?: string[];
  }>;

  /**
   * 合并检查点
   * @param checkpointIds 检查点ID列表
   * @param title 合并后的标题
   * @param description 合并后的描述
   * @returns 合并后的检查点
   */
  mergeCheckpoints(
    checkpointIds: ID[],
    title?: string,
    description?: string
  ): Promise<Checkpoint>;

  /**
   * 导出检查点
   * @param checkpointId 检查点ID
   * @param format 导出格式
   * @returns 导出数据
   */
  exportCheckpoint(checkpointId: ID, format: 'json' | 'yaml' | 'xml'): Promise<string>;

  /**
   * 导入检查点
   * @param threadId 线程ID
   * @param data 导入数据
   * @param format 数据格式
   * @returns 导入的检查点
   */
  importCheckpoint(
    threadId: ID,
    data: string,
    format: 'json' | 'yaml' | 'xml'
  ): Promise<Checkpoint>;
}
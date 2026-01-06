import { ID } from '../../../common/value-objects/id';
import { ThreadCheckpoint } from '../entities/thread-checkpoint';
import { CheckpointType } from '../../../checkpoint/value-objects/checkpoint-type';
import { CheckpointStatus } from '../value-objects/checkpoint-status';
import { CheckpointStatistics } from '../value-objects/checkpoint-statistics';
import { IThreadCheckpointRepository } from '../repositories/thread-checkpoint-repository';

/**
 * Thread检查点领域服务接口
 *
 * 定义Thread检查点相关的业务逻辑
 */
export interface ThreadCheckpointDomainService {
  /**
   * 创建自动检查点
   * @param threadId 线程ID
   * @param stateData 状态数据
   * @param metadata 元数据
   * @param expirationHours 过期小时数
   * @returns 检查点实例
   */
  createAutoCheckpoint(
    threadId: ID,
    stateData: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    expirationHours?: number
  ): Promise<ThreadCheckpoint>;

  /**
   * 创建手动检查点
   * @param threadId 线程ID
   * @param stateData 状态数据
   * @param title 标题
   * @param description 描述
   * @param tags 标签
   * @param metadata 元数据
   * @param expirationHours 过期小时数
   * @returns 检查点实例
   */
  createManualCheckpoint(
    threadId: ID,
    stateData: Record<string, unknown>,
    title?: string,
    description?: string,
    tags?: string[],
    metadata?: Record<string, unknown>,
    expirationHours?: number
  ): Promise<ThreadCheckpoint>;

  /**
   * 创建错误检查点
   * @param threadId 线程ID
   * @param stateData 状态数据
   * @param errorMessage 错误消息
   * @param errorType 错误类型
   * @param metadata 元数据
   * @param expirationHours 过期小时数
   * @returns 检查点实例
   */
  createErrorCheckpoint(
    threadId: ID,
    stateData: Record<string, unknown>,
    errorMessage: string,
    errorType?: string,
    metadata?: Record<string, unknown>,
    expirationHours?: number
  ): Promise<ThreadCheckpoint>;

  /**
   * 创建里程碑检查点
   * @param threadId 线程ID
   * @param stateData 状态数据
   * @param milestoneName 里程碑名称
   * @param description 描述
   * @param metadata 元数据
   * @param expirationHours 过期小时数
   * @returns 检查点实例
   */
  createMilestoneCheckpoint(
    threadId: ID,
    stateData: Record<string, unknown>,
    milestoneName: string,
    description?: string,
    metadata?: Record<string, unknown>,
    expirationHours?: number
  ): Promise<ThreadCheckpoint>;

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
  getThreadCheckpointHistory(threadId: ID, limit?: number): Promise<ThreadCheckpoint[]>;

  /**
   * 获取检查点统计信息
   * @param threadId 线程ID
   * @returns 统计信息
   */
  getCheckpointStatistics(threadId?: ID): Promise<CheckpointStatistics>;

  /**
   * 清理过期检查点
   * @param threadId 线程ID
   * @returns 清理的检查点数量
   */
  cleanupExpiredCheckpoints(threadId?: ID): Promise<number>;

  /**
   * 清理多余的检查点
   * @param threadId 线程ID
   * @param maxCount 最大数量
   * @returns 清理的检查点数量
   */
  cleanupExcessCheckpoints(threadId: ID, maxCount: number): Promise<number>;

  /**
   * 归档旧检查点
   * @param threadId 线程ID
   * @param days 归档天数阈值
   * @returns 归档的检查点数量
   */
  archiveOldCheckpoints(threadId: ID, days: number): Promise<number>;

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
  ): Promise<ThreadCheckpoint>;

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
  ): Promise<ThreadCheckpoint>;

  /**
   * 创建检查点备份
   * @param checkpointId 检查点ID
   * @returns 备份检查点
   */
  createBackup(checkpointId: ID): Promise<ThreadCheckpoint>;

  /**
   * 从备份恢复
   * @param backupId 备份ID
   * @returns 恢复的状态数据
   */
  restoreFromBackup(backupId: ID): Promise<Record<string, unknown> | null>;

  /**
   * 获取备份链
   * @param checkpointId 检查点ID
   * @returns 备份链
   */
  getBackupChain(checkpointId: ID): Promise<ThreadCheckpoint[]>;

  /**
   * 延长检查点过期时间
   * @param checkpointId 检查点ID
   * @param hours 延长的小时数
   * @returns 是否成功
   */
  extendCheckpointExpiration(checkpointId: ID, hours: number): Promise<boolean>;

  /**
   * 分析检查点创建频率
   * @param threadId 线程ID
   * @returns 频率分析结果
   */
  analyzeCheckpointFrequency(threadId: ID): Promise<{
    totalCheckpoints: number;
    averageIntervalHours: number;
    frequencyByHour: Record<number, number>;
    frequencyByDay: Record<string, number>;
    peakHours: number[];
    trends: 'increasing' | 'decreasing' | 'stable';
  }>;

  /**
   * 分析检查点大小分布
   * @param threadId 线程ID
   * @returns 大小分布分析结果
   */
  analyzeCheckpointSizeDistribution(threadId: ID): Promise<{
    totalSize: number;
    averageSize: number;
    medianSize: number;
    sizeRanges: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
    largestCheckpoints: Array<{
      id: string;
      size: number;
      createdAt: string;
    }>;
    growthTrend: 'increasing' | 'decreasing' | 'stable';
  }>;

  /**
   * 分析检查点类型分布
   * @param threadId 线程ID
   * @returns 类型分布分析结果
   */
  analyzeCheckpointTypeDistribution(threadId: ID): Promise<{
    distribution: Record<string, number>;
    percentages: Record<string, number>;
    mostCommonType: string;
    typeTrends: Record<string, 'increasing' | 'decreasing' | 'stable'>;
    recommendations: string[];
  }>;

  /**
   * 建议优化策略
   * @param threadId 线程ID
   * @returns 优化建议
   */
  suggestOptimizationStrategy(threadId: ID): Promise<{
    cleanupRecommendations: Array<{
      type: 'expired' | 'excess' | 'archived';
      action: string;
      impact: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    backupRecommendations: Array<{
      checkpointId: string;
      reason: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    configurationSuggestions: Array<{
      setting: string;
      currentValue: unknown;
      suggestedValue: unknown;
      reason: string;
    }>;
    overallHealthScore: number;
    estimatedSpaceSavings: number;
  }>;

  /**
   * 健康检查
   * @param threadId 线程ID
   * @returns 健康状态信息
   */
  healthCheck(threadId?: ID): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    issues: Array<{
      type: string;
      severity: 'high' | 'medium' | 'low';
      description: string;
      recommendation: string;
    }>;
    metrics: {
      totalCheckpoints: number;
      expiredCheckpoints: number;
      corruptedCheckpoints: number;
      totalSizeMB: number;
      averageRestoreCount: number;
    };
    timestamp: string;
  }>;
}

/**
 * Thread检查点领域服务实现
 */
export class ThreadCheckpointDomainServiceImpl implements ThreadCheckpointDomainService {
  constructor(private readonly repository: IThreadCheckpointRepository) {}

  async createAutoCheckpoint(
    threadId: ID,
    stateData: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    expirationHours?: number
  ): Promise<ThreadCheckpoint> {
    const checkpoint = ThreadCheckpoint.create(
      threadId,
      CheckpointType.auto(),
      stateData,
      undefined,
      undefined,
      undefined,
      metadata,
      expirationHours
    );

    await this.repository.save(checkpoint);
    return checkpoint;
  }

  async createManualCheckpoint(
    threadId: ID,
    stateData: Record<string, unknown>,
    title?: string,
    description?: string,
    tags?: string[],
    metadata?: Record<string, unknown>,
    expirationHours?: number
  ): Promise<ThreadCheckpoint> {
    const checkpoint = ThreadCheckpoint.create(
      threadId,
      CheckpointType.manual(),
      stateData,
      title,
      description,
      tags,
      metadata,
      expirationHours
    );

    await this.repository.save(checkpoint);
    return checkpoint;
  }

  async createErrorCheckpoint(
    threadId: ID,
    stateData: Record<string, unknown>,
    errorMessage: string,
    errorType?: string,
    metadata?: Record<string, unknown>,
    expirationHours?: number
  ): Promise<ThreadCheckpoint> {
    const errorMetadata = {
      ...metadata,
      errorMessage,
      errorType,
      createdAt: new Date().toISOString(),
    };

    const checkpoint = ThreadCheckpoint.create(
      threadId,
      CheckpointType.error(),
      stateData,
      undefined,
      errorMessage,
      ['error'],
      errorMetadata,
      expirationHours
    );

    await this.repository.save(checkpoint);
    return checkpoint;
  }

  async createMilestoneCheckpoint(
    threadId: ID,
    stateData: Record<string, unknown>,
    milestoneName: string,
    description?: string,
    metadata?: Record<string, unknown>,
    expirationHours?: number
  ): Promise<ThreadCheckpoint> {
    const milestoneMetadata = {
      ...metadata,
      milestoneName,
      createdAt: new Date().toISOString(),
    };

    const checkpoint = ThreadCheckpoint.create(
      threadId,
      CheckpointType.milestone(),
      stateData,
      milestoneName,
      description,
      ['milestone'],
      milestoneMetadata,
      expirationHours
    );

    await this.repository.save(checkpoint);
    return checkpoint;
  }

  async restoreFromCheckpoint(checkpointId: ID): Promise<Record<string, unknown> | null> {
    const checkpoint = await this.repository.findById(checkpointId);
    if (!checkpoint || !checkpoint.canRestore()) {
      return null;
    }

    checkpoint.markRestored();
    await this.repository.save(checkpoint);

    return checkpoint.stateData;
  }

  async getThreadCheckpointHistory(threadId: ID, limit?: number): Promise<ThreadCheckpoint[]> {
    return await this.repository.getThreadHistory(threadId, limit);
  }

  async getCheckpointStatistics(threadId?: ID): Promise<CheckpointStatistics> {
    // 简化实现：使用基本方法构建统计信息
    const checkpoints = threadId
      ? await this.repository.findByThreadId(threadId)
      : await this.repository.findAll();

    return CheckpointStatistics.fromCheckpoints(checkpoints);
  }

  async cleanupExpiredCheckpoints(threadId?: ID): Promise<number> {
    // 简化实现：使用基本方法清理过期检查点
    const checkpoints = threadId
      ? await this.repository.findByThreadId(threadId)
      : await this.repository.findAll();

    const expiredCheckpoints = checkpoints.filter(cp => cp.isExpired());
    let cleanedCount = 0;

    for (const checkpoint of expiredCheckpoints) {
      checkpoint.markExpired();
      await this.repository.save(checkpoint);
      cleanedCount++;
    }

    return cleanedCount;
  }

  async cleanupExcessCheckpoints(threadId: ID, maxCount: number): Promise<number> {
    const checkpoints = await this.repository.findByThreadId(threadId);
    if (checkpoints.length <= maxCount) {
      return 0;
    }

    // 按创建时间排序，保留最新的maxCount个
    checkpoints.sort((a, b) => b.createdAt.toISOString().localeCompare(a.createdAt.toISOString()));
    const toDelete = checkpoints.slice(maxCount);

    let deletedCount = 0;
    for (const checkpoint of toDelete) {
      await this.repository.delete(checkpoint);
      deletedCount++;
    }

    return deletedCount;
  }

  async archiveOldCheckpoints(threadId: ID, days: number): Promise<number> {
    // 简化实现：使用基本方法归档旧检查点
    const checkpoints = await this.repository.findByThreadId(threadId);
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - days);

    const oldCheckpoints = checkpoints.filter(cp => cp.createdAt.getDate() < cutoffTime);

    let archivedCount = 0;

    for (const checkpoint of oldCheckpoints) {
      checkpoint.markArchived();
      await this.repository.save(checkpoint);
      archivedCount++;
    }

    return archivedCount;
  }

  async shouldCreateCheckpoint(
    threadId: ID,
    stateData: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<boolean> {
    // 简化实现，实际可以根据更复杂的策略
    const recentCheckpoints = await this.repository.findByThreadId(threadId);
    const activeCheckpoints = recentCheckpoints.filter(cp => cp.status.isActive());

    // 如果活跃检查点太多，不创建新的
    if (activeCheckpoints.length >= 50) {
      return false;
    }

    // 如果距离上次检查点创建时间太短，不创建新的
    const latest = await this.repository.getLatest(threadId);
    if (latest && latest.getAgeInSeconds() < 300) {
      // 5分钟
      return false;
    }

    return true;
  }

  async getCheckpointRecommendation(
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
  }> {
    const shouldCreate = await this.shouldCreateCheckpoint(threadId, stateData, context);

    if (!shouldCreate) {
      return {
        shouldCreate: false,
        recommendedType: CheckpointType.auto(),
        reason: '检查点创建条件不满足',
      };
    }

    // 简化的推荐逻辑
    return {
      shouldCreate: true,
      recommendedType: CheckpointType.auto(),
      reason: '满足自动检查点创建条件',
      suggestedTags: ['auto'],
    };
  }

  async mergeCheckpoints(
    checkpointIds: ID[],
    title?: string,
    description?: string
  ): Promise<ThreadCheckpoint> {
    const checkpoints = await Promise.all(checkpointIds.map(id => this.repository.findById(id)));

    const validCheckpoints = checkpoints.filter(cp => cp !== null) as ThreadCheckpoint[];
    if (validCheckpoints.length === 0) {
      throw new Error('没有找到有效的检查点');
    }

    // 使用最新的检查点作为基础
    const latest = validCheckpoints.reduce((prev, current) =>
      prev.createdAt.toISOString() > current.createdAt.toISOString() ? prev : current
    );

    const mergedStateData = { ...latest.stateData };
    const mergedMetadata = {
      ...latest.metadata,
      mergedFrom: checkpointIds.map(id => id.toString()),
      mergedAt: new Date().toISOString(),
    };

    const merged = ThreadCheckpoint.create(
      latest.threadId,
      CheckpointType.manual(),
      mergedStateData,
      title || `合并检查点 (${checkpointIds.length}个)`,
      description,
      ['merged'],
      mergedMetadata
    );

    await this.repository.save(merged);
    return merged;
  }

  async exportCheckpoint(checkpointId: ID, format: 'json' | 'yaml' | 'xml'): Promise<string> {
    const checkpoint = await this.repository.findById(checkpointId);
    if (!checkpoint) {
      throw new Error('检查点不存在');
    }

    const data = checkpoint.toDict();

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'yaml':
        // 简化实现，实际需要yaml库
        return `# YAML export\n${JSON.stringify(data, null, 2)}`;
      case 'xml':
        // 简化实现，实际需要xml库
        return `<?xml version="1.0"?>\n<checkpoint>${JSON.stringify(data)}</checkpoint>`;
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  async importCheckpoint(
    threadId: ID,
    data: string,
    format: 'json' | 'yaml' | 'xml'
  ): Promise<ThreadCheckpoint> {
    let parsedData: Record<string, unknown>;

    try {
      switch (format) {
        case 'json':
          parsedData = JSON.parse(data);
          break;
        case 'yaml':
        case 'xml':
          // 简化实现
          parsedData = JSON.parse(data);
          break;
        default:
          throw new Error(`不支持的导入格式: ${format}`);
      }
    } catch (error) {
      throw new Error(`数据解析失败: ${error}`);
    }

    const checkpoint = ThreadCheckpoint.fromDict(parsedData);
    await this.repository.save(checkpoint);
    return checkpoint;
  }

  async createBackup(checkpointId: ID): Promise<ThreadCheckpoint> {
    const original = await this.repository.findById(checkpointId);
    if (!original) {
      throw new Error('原始检查点不存在');
    }

    const backupMetadata = {
      ...original.metadata,
      backupOf: checkpointId.toString(),
      backupTimestamp: new Date().toISOString(),
    };

    const backup = ThreadCheckpoint.create(
      original.threadId,
      CheckpointType.manual(),
      original.stateData,
      `${original.title || '检查点'} - 备份`,
      original.description,
      [...original.tags, 'backup'],
      backupMetadata
    );

    await this.repository.save(backup);
    return backup;
  }

  async restoreFromBackup(backupId: ID): Promise<Record<string, unknown> | null> {
    return await this.restoreFromCheckpoint(backupId);
  }

  async getBackupChain(checkpointId: ID): Promise<ThreadCheckpoint[]> {
    // 简化实现：使用基本方法查找备份链
    const checkpoint = await this.repository.findById(checkpointId);
    if (!checkpoint) {
      return [];
    }

    // 查找所有带有backup标签的检查点
    const allCheckpoints = await this.repository.findByThreadId(checkpoint.threadId);
    const backupCheckpoints = allCheckpoints.filter(
      cp => cp.tags.includes('backup') && cp.metadata?.['backupOf'] === checkpointId.toString()
    );

    return backupCheckpoints;
  }

  async extendCheckpointExpiration(checkpointId: ID, hours: number): Promise<boolean> {
    const checkpoint = await this.repository.findById(checkpointId);
    if (!checkpoint) {
      return false;
    }

    checkpoint.extendExpiration(hours);
    await this.repository.save(checkpoint);
    return true;
  }

  async analyzeCheckpointFrequency(threadId: ID): Promise<{
    totalCheckpoints: number;
    averageIntervalHours: number;
    frequencyByHour: Record<number, number>;
    frequencyByDay: Record<string, number>;
    peakHours: number[];
    trends: 'increasing' | 'decreasing' | 'stable';
  }> {
    const checkpoints = await this.repository.findByThreadId(threadId);

    // 简化实现
    return {
      totalCheckpoints: checkpoints.length,
      averageIntervalHours: 0,
      frequencyByHour: {},
      frequencyByDay: {},
      peakHours: [],
      trends: 'stable',
    };
  }

  async analyzeCheckpointSizeDistribution(threadId: ID): Promise<{
    totalSize: number;
    averageSize: number;
    medianSize: number;
    sizeRanges: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
    largestCheckpoints: Array<{
      id: string;
      size: number;
      createdAt: string;
    }>;
    growthTrend: 'increasing' | 'decreasing' | 'stable';
  }> {
    const checkpoints = await this.repository.findByThreadId(threadId);

    // 简化实现
    return {
      totalSize: checkpoints.reduce((sum, cp) => sum + cp.sizeBytes, 0),
      averageSize:
        checkpoints.length > 0
          ? checkpoints.reduce((sum, cp) => sum + cp.sizeBytes, 0) / checkpoints.length
          : 0,
      medianSize: 0,
      sizeRanges: [],
      largestCheckpoints: [],
      growthTrend: 'stable',
    };
  }

  async analyzeCheckpointTypeDistribution(threadId: ID): Promise<{
    distribution: Record<string, number>;
    percentages: Record<string, number>;
    mostCommonType: string;
    typeTrends: Record<string, 'increasing' | 'decreasing' | 'stable'>;
    recommendations: string[];
  }> {
    const checkpoints = await this.repository.findByThreadId(threadId);

    // 简化实现
    return {
      distribution: {},
      percentages: {},
      mostCommonType: '',
      typeTrends: {},
      recommendations: [],
    };
  }

  async suggestOptimizationStrategy(threadId: ID): Promise<{
    cleanupRecommendations: Array<{
      type: 'expired' | 'excess' | 'archived';
      action: string;
      impact: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    backupRecommendations: Array<{
      checkpointId: string;
      reason: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    configurationSuggestions: Array<{
      setting: string;
      currentValue: unknown;
      suggestedValue: unknown;
      reason: string;
    }>;
    overallHealthScore: number;
    estimatedSpaceSavings: number;
  }> {
    // 简化实现
    return {
      cleanupRecommendations: [],
      backupRecommendations: [],
      configurationSuggestions: [],
      overallHealthScore: 100,
      estimatedSpaceSavings: 0,
    };
  }

  async healthCheck(threadId?: ID): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    issues: Array<{
      type: string;
      severity: 'high' | 'medium' | 'low';
      description: string;
      recommendation: string;
    }>;
    metrics: {
      totalCheckpoints: number;
      expiredCheckpoints: number;
      corruptedCheckpoints: number;
      totalSizeMB: number;
      averageRestoreCount: number;
    };
    timestamp: string;
  }> {
    const stats = await this.getCheckpointStatistics(threadId);

    return {
      status: 'healthy',
      score: stats.getHealthScore(),
      issues: [],
      metrics: {
        totalCheckpoints: stats.totalCheckpoints,
        expiredCheckpoints: stats.expiredCheckpoints,
        corruptedCheckpoints: stats.corruptedCheckpoints,
        totalSizeMB: stats.totalSizeMB,
        averageRestoreCount: stats.averageRestores,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

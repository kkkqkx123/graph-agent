import { ID } from '../../domain/common/value-objects/id';
import { Checkpoint } from '../../domain/threads/checkpoints/entities/checkpoint';
import { CheckpointStatistics } from '../../domain/threads/checkpoints/value-objects/checkpoint-statistics';
import { ICheckpointRepository } from '../../domain/threads/checkpoints/repositories/checkpoint-repository';
import { ILogger } from '../../domain/common/types/logger-types';

/**
 * 检查点分析服务
 *
 * 负责检查点的分析和健康检查
 */
export class CheckpointAnalysis {
  constructor(
    private readonly repository: ICheckpointRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * 分析检查点创建频率
   */
  async analyzeCheckpointFrequency(threadId: ID): Promise<{
    totalCheckpoints: number;
    averageIntervalHours: number;
    frequencyByHour: Record<number, number>;
    frequencyByDay: Record<string, number>;
    peakHours: number[];
    trends: 'increasing' | 'decreasing' | 'stable';
  }> {
    const checkpoints = await this.repository.findByThreadId(threadId);
    
    if (checkpoints.length === 0) {
      return {
        totalCheckpoints: 0,
        averageIntervalHours: 0,
        frequencyByHour: {},
        frequencyByDay: {},
        peakHours: [],
        trends: 'stable',
      };
    }

    // 按创建时间排序
    const sortedCheckpoints = [...checkpoints].sort((a, b) =>
      a.createdAt.toISOString().localeCompare(b.createdAt.toISOString())
    );

    // 计算平均间隔时间
    let totalIntervalHours = 0;
    for (let i = 1; i < sortedCheckpoints.length; i++) {
      const current = sortedCheckpoints[i];
      const previous = sortedCheckpoints[i - 1];
      if (current && previous) {
        const currentTimestamp = current.createdAt.toISOString();
        const previousTimestamp = previous.createdAt.toISOString();
        const interval = new Date(currentTimestamp).getTime() - new Date(previousTimestamp).getTime();
        totalIntervalHours += interval / (1000 * 60 * 60); // 转换为小时
      }
    }
    const averageIntervalHours = sortedCheckpoints.length > 1
      ? totalIntervalHours / (sortedCheckpoints.length - 1)
      : 0;

    // 按小时统计
    const frequencyByHour: Record<number, number> = {};
    for (const cp of checkpoints) {
      const hour = cp.createdAt.toISOString().split('T')[1]?.split(':')[0] || '0';
      frequencyByHour[parseInt(hour)] = (frequencyByHour[parseInt(hour)] || 0) + 1;
    }

    // 按天统计
    const frequencyByDay: Record<string, number> = {};
    for (const cp of checkpoints) {
      const day = cp.createdAt.toISOString().split('T')[0] || '';
      frequencyByDay[day] = (frequencyByDay[day] || 0) + 1;
    }

    // 识别高峰时段（前3个最频繁的小时）
    const peakHours = Object.entries(frequencyByHour)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // 分析趋势（比较前半部分和后半部分的创建频率）
    const midPoint = Math.floor(checkpoints.length / 2);
    const firstHalf = checkpoints.slice(0, midPoint);
    const secondHalf = checkpoints.slice(midPoint);
    
    const firstHalfAvg = firstHalf.length / (midPoint || 1);
    const secondHalfAvg = secondHalf.length / (checkpoints.length - midPoint || 1);
    
    let trends: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (secondHalfAvg > firstHalfAvg * 1.2) {
      trends = 'increasing';
    } else if (secondHalfAvg < firstHalfAvg * 0.8) {
      trends = 'decreasing';
    }

    return {
      totalCheckpoints: checkpoints.length,
      averageIntervalHours,
      frequencyByHour,
      frequencyByDay,
      peakHours,
      trends,
    };
  }

  /**
   * 分析检查点大小分布
   */
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

    if (checkpoints.length === 0) {
      return {
        totalSize: 0,
        averageSize: 0,
        medianSize: 0,
        sizeRanges: [],
        largestCheckpoints: [],
        growthTrend: 'stable',
      };
    }

    const sizes = checkpoints.map(cp => cp.sizeBytes).sort((a, b) => a - b);
    const totalSize = sizes.reduce((sum, size) => sum + size, 0);
    const averageSize = totalSize / checkpoints.length;
    
    // 计算中位数
    let medianSize = 0;
    if (sizes.length > 0) {
      if (sizes.length % 2 === 0) {
        const mid1 = sizes[sizes.length / 2 - 1];
        const mid2 = sizes[sizes.length / 2];
        medianSize = mid1 !== undefined && mid2 !== undefined ? (mid1 + mid2) / 2 : 0;
      } else {
        medianSize = sizes[Math.floor(sizes.length / 2)] || 0;
      }
    }

    // 计算大小范围分布
    const sizeRanges = [
      { range: '< 1MB', min: 0, max: 1024 * 1024 },
      { range: '1-10MB', min: 1024 * 1024, max: 10 * 1024 * 1024 },
      { range: '10-100MB', min: 10 * 1024 * 1024, max: 100 * 1024 * 1024 },
      { range: '> 100MB', min: 100 * 1024 * 1024, max: Infinity },
    ].map(({ range, min, max }) => {
      const count = checkpoints.filter(cp => cp.sizeBytes >= min && cp.sizeBytes < max).length;
      return {
        range,
        count,
        percentage: checkpoints.length > 0 ? (count / checkpoints.length) * 100 : 0,
      };
    });

    // 识别最大的5个检查点
    const largestCheckpoints = [...checkpoints]
      .sort((a, b) => b.sizeBytes - a.sizeBytes)
      .slice(0, 5)
      .map(cp => ({
        id: cp.checkpointId.value,
        size: cp.sizeBytes,
        createdAt: cp.createdAt.toISOString(),
      }));

    // 分析大小增长趋势
    const midPoint = Math.floor(checkpoints.length / 2);
    const firstHalfAvg = checkpoints.slice(0, midPoint).reduce((sum, cp) => sum + cp.sizeBytes, 0) / (midPoint || 1);
    const secondHalfAvg = checkpoints.slice(midPoint).reduce((sum, cp) => sum + cp.sizeBytes, 0) / (checkpoints.length - midPoint || 1);
    
    let growthTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (secondHalfAvg > firstHalfAvg * 1.2) {
      growthTrend = 'increasing';
    } else if (secondHalfAvg < firstHalfAvg * 0.8) {
      growthTrend = 'decreasing';
    }

    return {
      totalSize,
      averageSize,
      medianSize,
      sizeRanges,
      largestCheckpoints,
      growthTrend,
    };
  }

  /**
   * 分析检查点类型分布
   */
  async analyzeCheckpointTypeDistribution(threadId: ID): Promise<{
    distribution: Record<string, number>;
    percentages: Record<string, number>;
    mostCommonType: string;
    typeTrends: Record<string, 'increasing' | 'decreasing' | 'stable'>;
    recommendations: string[];
  }> {
    const checkpoints = await this.repository.findByThreadId(threadId);

    if (checkpoints.length === 0) {
      return {
        distribution: {},
        percentages: {},
        mostCommonType: '',
        typeTrends: {},
        recommendations: [],
      };
    }

    // 统计各类型数量
    const distribution: Record<string, number> = {};
    for (const cp of checkpoints) {
      const type = cp.type.toString();
      distribution[type] = (distribution[type] || 0) + 1;
    }

    // 计算百分比
    const percentages: Record<string, number> = {};
    for (const [type, count] of Object.entries(distribution)) {
      percentages[type] = (count / checkpoints.length) * 100;
    }

    // 识别最常见的类型
    const mostCommonType = Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    // 分析各类型的变化趋势
    const typeTrends: Record<string, 'increasing' | 'decreasing' | 'stable'> = {};
    const midPoint = Math.floor(checkpoints.length / 2);
    const firstHalf = checkpoints.slice(0, midPoint);
    const secondHalf = checkpoints.slice(midPoint);

    for (const type of Object.keys(distribution)) {
      const firstHalfCount = firstHalf.filter(cp => cp.type.toString() === type).length;
      const secondHalfCount = secondHalf.filter(cp => cp.type.toString() === type).length;
      
      const firstHalfAvg = firstHalfCount / (midPoint || 1);
      const secondHalfAvg = secondHalfCount / (checkpoints.length - midPoint || 1);
      
      if (secondHalfAvg > firstHalfAvg * 1.2) {
        typeTrends[type] = 'increasing';
      } else if (secondHalfAvg < firstHalfAvg * 0.8) {
        typeTrends[type] = 'decreasing';
      } else {
        typeTrends[type] = 'stable';
      }
    }

    // 生成建议
    const recommendations: string[] = [];
    const errorPercentage = percentages['error'] ?? 0;
    const autoPercentage = percentages['auto'] ?? 0;
    const milestonePercentage = percentages['milestone'] ?? 0;
    
    if (errorPercentage > 20) {
      recommendations.push('错误检查点占比较高，建议检查工作流稳定性');
    }
    if (autoPercentage > 80) {
      recommendations.push('自动检查点占比较高，考虑增加手动检查点以保留重要状态');
    }
    if (milestonePercentage < 10) {
      recommendations.push('里程碑检查点较少，建议在关键节点创建里程碑检查点');
    }

    return {
      distribution,
      percentages,
      mostCommonType,
      typeTrends,
      recommendations,
    };
  }

  /**
   * 建议优化策略
   */
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
    const checkpoints = await this.repository.findByThreadId(threadId);
    const cleanupRecommendations: Array<{
      type: 'expired' | 'excess' | 'archived';
      action: string;
      impact: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];
    const backupRecommendations: Array<{
      checkpointId: string;
      reason: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];
    const configurationSuggestions: Array<{
      setting: string;
      currentValue: unknown;
      suggestedValue: unknown;
      reason: string;
    }> = [];
    let estimatedSpaceSavings = 0;

    // 分析过期检查点
    const expiredCheckpoints = checkpoints.filter(cp => cp.isExpired());
    if (expiredCheckpoints.length > 0) {
      const expiredSize = expiredCheckpoints.reduce((sum, cp) => sum + cp.sizeBytes, 0);
      cleanupRecommendations.push({
        type: 'expired',
        action: `清理 ${expiredCheckpoints.length} 个过期检查点`,
        impact: `可释放 ${this.formatBytes(expiredSize)} 存储空间`,
        priority: 'high',
      });
      estimatedSpaceSavings += expiredSize;
    }

    // 分析多余检查点
    if (checkpoints.length > 10) {
      const excessCount = checkpoints.length - 10;
      const excessCheckpoints = [...checkpoints]
        .sort((a, b) => a.createdAt.toISOString().localeCompare(b.createdAt.toISOString()))
        .slice(0, excessCount);
      const excessSize = excessCheckpoints.reduce((sum, cp) => sum + cp.sizeBytes, 0);
      cleanupRecommendations.push({
        type: 'excess',
        action: `清理 ${excessCount} 个最旧的检查点`,
        impact: `可释放 ${this.formatBytes(excessSize)} 存储空间`,
        priority: 'medium',
      });
      estimatedSpaceSavings += excessSize;
    }

    // 分析旧检查点（超过30天）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const oldCheckpoints = checkpoints.filter(cp =>
      cp.createdAt.toISOString() < thirtyDaysAgo.toISOString()
    );
    if (oldCheckpoints.length > 0) {
      const oldSize = oldCheckpoints.reduce((sum, cp) => sum + cp.sizeBytes, 0);
      cleanupRecommendations.push({
        type: 'archived',
        action: `归档 ${oldCheckpoints.length} 个超过30天的检查点`,
        impact: `可释放 ${this.formatBytes(oldSize)} 存储空间`,
        priority: 'low',
      });
      estimatedSpaceSavings += oldSize;
    }

    // 识别需要备份的重要检查点
    const importantCheckpoints = checkpoints.filter(cp =>
      cp.tags.includes('milestone') || cp.restoreCount > 5
    );
    for (const cp of importantCheckpoints) {
      if (!cp.tags.includes('backup')) {
        backupRecommendations.push({
          checkpointId: cp.checkpointId.value,
          reason: cp.tags.includes('milestone') ? '里程碑检查点' : '高频恢复检查点',
          priority: 'high',
        });
      }
    }

    // 配置建议
    if (checkpoints.length > 20) {
      configurationSuggestions.push({
        setting: 'maxCheckpointsPerThread',
        currentValue: 'unlimited',
        suggestedValue: 20,
        reason: '当前检查点数量较多，建议设置最大限制以控制存储使用',
      });
    }

    const avgSize = checkpoints.length > 0
      ? checkpoints.reduce((sum, cp) => sum + cp.sizeBytes, 0) / checkpoints.length
      : 0;
    if (avgSize > 10 * 1024 * 1024) {
      configurationSuggestions.push({
        setting: 'enableCompression',
        currentValue: false,
        suggestedValue: true,
        reason: '平均检查点大小超过10MB，建议启用压缩以减少存储占用',
      });
    }

    // 计算健康评分
    const healthCheck = await this.healthCheck(threadId);
    const overallHealthScore = healthCheck.score;

    return {
      cleanupRecommendations,
      backupRecommendations,
      configurationSuggestions,
      overallHealthScore,
      estimatedSpaceSavings,
    };
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

  /**
   * 健康检查
   */
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
    const checkpoints = threadId
      ? await this.repository.findByThreadId(threadId)
      : await this.repository.findAll();

    const stats = CheckpointStatistics.fromCheckpoints(checkpoints);

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
import { ValueObject } from '../../../common/value-objects';
import { CheckpointStatus } from './checkpoint-status';
import { CheckpointType } from './checkpoint-type';
import { ValidationError } from '../../../../common/exceptions';

/**
 * 检查点统计信息接口
 */
export interface CheckpointStatisticsProps {
  totalCheckpoints: number;
  activeCheckpoints: number;
  expiredCheckpoints: number;
  corruptedCheckpoints: number;
  archivedCheckpoints: number;
  totalSizeBytes: number;
  averageSizeBytes: number;
  largestCheckpointBytes: number;
  smallestCheckpointBytes: number;
  totalRestores: number;
  averageRestores: number;
  oldestCheckpointAgeHours: number;
  newestCheckpointAgeHours: number;
  averageAgeHours: number;
  typeDistribution: Record<string, number>;
  restoreFrequency: Record<number, number>;
}

/**
 * 检查点统计信息值对象
 *
 * 表示线程检查点的统计信息
 */
export class CheckpointStatistics extends ValueObject<CheckpointStatisticsProps> {
  protected override readonly props: CheckpointStatisticsProps;

  /**
   * 构造函数
   * @param props 统计属性
   */
  private constructor(props: CheckpointStatisticsProps) {
    super(props);
    this.props = Object.freeze({ ...props });
  }

  /**
   * 创建空统计信息
   */
  public static empty(): CheckpointStatistics {
    return new CheckpointStatistics({
      totalCheckpoints: 0,
      activeCheckpoints: 0,
      expiredCheckpoints: 0,
      corruptedCheckpoints: 0,
      archivedCheckpoints: 0,
      totalSizeBytes: 0,
      averageSizeBytes: 0,
      largestCheckpointBytes: 0,
      smallestCheckpointBytes: 0,
      totalRestores: 0,
      averageRestores: 0,
      oldestCheckpointAgeHours: 0,
      newestCheckpointAgeHours: 0,
      averageAgeHours: 0,
      typeDistribution: {},
      restoreFrequency: {},
    });
  }

  /**
   * 从属性创建统计信息
   */
  public static fromProps(props: CheckpointStatisticsProps): CheckpointStatistics {
    return new CheckpointStatistics(props);
  }

  /**
   * 从检查点列表计算统计信息
   */
  public static fromCheckpoints(
    checkpoints: Array<{
      status: CheckpointStatus;
      type: CheckpointType;
      sizeBytes: number;
      restoreCount: number;
      getAgeInHours: () => number;
    }>
  ): CheckpointStatistics {
    if (checkpoints.length === 0) {
      return CheckpointStatistics.empty();
    }

    // 基本统计
    const totalCheckpoints = checkpoints.length;
    const activeCheckpoints = checkpoints.filter(cp => cp.status.isActive()).length;
    const expiredCheckpoints = checkpoints.filter(cp => cp.status.isExpired()).length;
    const corruptedCheckpoints = checkpoints.filter(cp => cp.status.isCorrupted()).length;
    const archivedCheckpoints = checkpoints.filter(cp => cp.status.isArchived()).length;

    // 大小统计
    const totalSizeBytes = checkpoints.reduce((sum, cp) => sum + cp.sizeBytes, 0);
    const averageSizeBytes = totalSizeBytes / totalCheckpoints;
    const largestCheckpointBytes = Math.max(...checkpoints.map(cp => cp.sizeBytes));
    const smallestCheckpointBytes = Math.min(...checkpoints.map(cp => cp.sizeBytes));

    // 恢复统计
    const totalRestores = checkpoints.reduce((sum, cp) => sum + cp.restoreCount, 0);
    const averageRestores = totalRestores / totalCheckpoints;

    // 年龄统计
    const ages = checkpoints.map(cp => cp.getAgeInHours());
    const oldestCheckpointAgeHours = Math.max(...ages);
    const newestCheckpointAgeHours = Math.min(...ages);
    const averageAgeHours = ages.reduce((sum, age) => sum + age, 0) / totalCheckpoints;

    // 类型分布
    const typeDistribution: Record<string, number> = {};
    checkpoints.forEach(cp => {
      const typeKey = cp.type.getValue();
      typeDistribution[typeKey] = (typeDistribution[typeKey] || 0) + 1;
    });

    // 恢复频率分布
    const restoreFrequency: Record<number, number> = {};
    checkpoints.forEach(cp => {
      if (cp.restoreCount > 0) {
        restoreFrequency[cp.restoreCount] = (restoreFrequency[cp.restoreCount] || 0) + 1;
      }
    });

    return new CheckpointStatistics({
      totalCheckpoints,
      activeCheckpoints,
      expiredCheckpoints,
      corruptedCheckpoints,
      archivedCheckpoints,
      totalSizeBytes,
      averageSizeBytes,
      largestCheckpointBytes,
      smallestCheckpointBytes,
      totalRestores,
      averageRestores,
      oldestCheckpointAgeHours,
      newestCheckpointAgeHours,
      averageAgeHours,
      typeDistribution,
      restoreFrequency,
    });
  }

  /**
   * 获取总检查点数
   */
  public get totalCheckpoints(): number {
    return this.props.totalCheckpoints;
  }

  /**
   * 获取活跃检查点数
   */
  public get activeCheckpoints(): number {
    return this.props.activeCheckpoints;
  }

  /**
   * 获取过期检查点数
   */
  public get expiredCheckpoints(): number {
    return this.props.expiredCheckpoints;
  }

  /**
   * 获取损坏检查点数
   */
  public get corruptedCheckpoints(): number {
    return this.props.corruptedCheckpoints;
  }

  /**
   * 获取归档检查点数
   */
  public get archivedCheckpoints(): number {
    return this.props.archivedCheckpoints;
  }

  /**
   * 获取总大小（字节）
   */
  public get totalSizeBytes(): number {
    return this.props.totalSizeBytes;
  }

  /**
   * 获取平均大小（字节）
   */
  public get averageSizeBytes(): number {
    return this.props.averageSizeBytes;
  }

  /**
   * 获取最大检查点大小（字节）
   */
  public get largestCheckpointBytes(): number {
    return this.props.largestCheckpointBytes;
  }

  /**
   * 获取最小检查点大小（字节）
   */
  public get smallestCheckpointBytes(): number {
    return this.props.smallestCheckpointBytes;
  }

  /**
   * 获取总恢复次数
   */
  public get totalRestores(): number {
    return this.props.totalRestores;
  }

  /**
   * 获取平均恢复次数
   */
  public get averageRestores(): number {
    return this.props.averageRestores;
  }

  /**
   * 获取最旧检查点年龄（小时）
   */
  public get oldestCheckpointAgeHours(): number {
    return this.props.oldestCheckpointAgeHours;
  }

  /**
   * 获取最新检查点年龄（小时）
   */
  public get newestCheckpointAgeHours(): number {
    return this.props.newestCheckpointAgeHours;
  }

  /**
   * 获取平均年龄（小时）
   */
  public get averageAgeHours(): number {
    return this.props.averageAgeHours;
  }

  /**
   * 获取类型分布
   */
  public get typeDistribution(): Record<string, number> {
    return { ...this.props.typeDistribution };
  }

  /**
   * 获取恢复频率分布
   */
  public get restoreFrequency(): Record<number, number> {
    return { ...this.props.restoreFrequency };
  }

  /**
   * 获取活跃检查点比例
   */
  public get activeRatio(): number {
    return this.props.totalCheckpoints > 0
      ? this.props.activeCheckpoints / this.props.totalCheckpoints
      : 0;
  }

  /**
   * 获取过期检查点比例
   */
  public get expiredRatio(): number {
    return this.props.totalCheckpoints > 0
      ? this.props.expiredCheckpoints / this.props.totalCheckpoints
      : 0;
  }

  /**
   * 获取损坏检查点比例
   */
  public get corruptedRatio(): number {
    return this.props.totalCheckpoints > 0
      ? this.props.corruptedCheckpoints / this.props.totalCheckpoints
      : 0;
  }

  /**
   * 获取归档检查点比例
   */
  public get archivedRatio(): number {
    return this.props.totalCheckpoints > 0
      ? this.props.archivedCheckpoints / this.props.totalCheckpoints
      : 0;
  }

  /**
   * 获取总大小（MB）
   */
  public get totalSizeMB(): number {
    return this.props.totalSizeBytes / (1024 * 1024);
  }

  /**
   * 获取平均大小（MB）
   */
  public get averageSizeMB(): number {
    return this.props.averageSizeBytes / (1024 * 1024);
  }

  /**
   * 获取最大检查点大小（MB）
   */
  public get largestCheckpointMB(): number {
    return this.props.largestCheckpointBytes / (1024 * 1024);
  }

  /**
   * 获取最小检查点大小（MB）
   */
  public get smallestCheckpointMB(): number {
    return this.props.smallestCheckpointBytes / (1024 * 1024);
  }

  /**
   * 获取最常见类型
   */
  public get mostCommonType(): string | null {
    const entries = Object.entries(this.props.typeDistribution);
    if (entries.length === 0) return null;

    return entries.reduce((a, b) => (a[1] > b[1] ? a : b))[0];
  }

  /**
   * 获取最常见恢复次数
   */
  public get mostCommonRestoreCount(): number | null {
    const entries = Object.entries(this.props.restoreFrequency);
    if (entries.length === 0) return null;

    return parseInt(entries.reduce((a, b) => (a[1] > b[1] ? a : b))[0]);
  }

  /**
   * 检查是否需要清理
   */
  public needsCleanup(thresholds: {
    expiredRatio?: number;
    corruptedRatio?: number;
    maxSizeMB?: number;
    maxCount?: number;
  }): boolean {
    const {
      expiredRatio = 0.3,
      corruptedRatio = 0.1,
      maxSizeMB = 100,
      maxCount = 100,
    } = thresholds;

    return (
      this.expiredRatio > expiredRatio ||
      this.corruptedRatio > corruptedRatio ||
      this.totalSizeMB > maxSizeMB ||
      this.totalCheckpoints > maxCount
    );
  }

  /**
   * 获取健康分数（0-100）
   */
  public getHealthScore(): number {
    let score = 100;

    // 过期检查点影响分数
    score -= this.expiredRatio * 30;

    // 损坏检查点影响分数
    score -= this.corruptedRatio * 50;

    // 大小过大影响分数
    if (this.totalSizeMB > 100) {
      score -= Math.min(20, (this.totalSizeMB - 100) / 10);
    }

    // 数量过多影响分数
    if (this.totalCheckpoints > 100) {
      score -= Math.min(10, (this.totalCheckpoints - 100) / 20);
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * 获取健康状态
   */
  public getHealthStatus(): 'healthy' | 'warning' | 'critical' {
    const score = this.getHealthScore();

    if (score >= 80) return 'healthy';
    if (score >= 60) return 'warning';
    return 'critical';
  }

  /**
   * 转换为字典表示
   */
  public toDict(): Record<string, unknown> {
    return {
      totalCheckpoints: this.props.totalCheckpoints,
      activeCheckpoints: this.props.activeCheckpoints,
      expiredCheckpoints: this.props.expiredCheckpoints,
      corruptedCheckpoints: this.props.corruptedCheckpoints,
      archivedCheckpoints: this.props.archivedCheckpoints,
      totalSizeBytes: this.props.totalSizeBytes,
      averageSizeBytes: this.props.averageSizeBytes,
      largestCheckpointBytes: this.props.largestCheckpointBytes,
      smallestCheckpointBytes: this.props.smallestCheckpointBytes,
      totalRestores: this.props.totalRestores,
      averageRestores: this.props.averageRestores,
      oldestCheckpointAgeHours: this.props.oldestCheckpointAgeHours,
      newestCheckpointAgeHours: this.props.newestCheckpointAgeHours,
      averageAgeHours: this.props.averageAgeHours,
      typeDistribution: this.props.typeDistribution,
      restoreFrequency: this.props.restoreFrequency,
      activeRatio: this.activeRatio,
      expiredRatio: this.expiredRatio,
      corruptedRatio: this.corruptedRatio,
      archivedRatio: this.archivedRatio,
      totalSizeMB: this.totalSizeMB,
      averageSizeMB: this.averageSizeMB,
      largestCheckpointMB: this.largestCheckpointMB,
      smallestCheckpointMB: this.smallestCheckpointMB,
      mostCommonType: this.mostCommonType,
      mostCommonRestoreCount: this.mostCommonRestoreCount,
      healthScore: this.getHealthScore(),
      healthStatus: this.getHealthStatus(),
    };
  }

  /**
   * 验证值对象
   */
  public validate(): void {
    if (this.props.totalCheckpoints < 0) {
      throw new ValidationError('总检查点数不能为负数');
    }

    if (this.props.activeCheckpoints < 0) {
      throw new ValidationError('活跃检查点数不能为负数');
    }

    if (this.props.expiredCheckpoints < 0) {
      throw new ValidationError('过期检查点数不能为负数');
    }

    if (this.props.corruptedCheckpoints < 0) {
      throw new ValidationError('损坏检查点数不能为负数');
    }

    if (this.props.archivedCheckpoints < 0) {
      throw new ValidationError('归档检查点数不能为负数');
    }

    if (this.props.totalSizeBytes < 0) {
      throw new ValidationError('总大小不能为负数');
    }

    if (this.props.averageSizeBytes < 0) {
      throw new ValidationError('平均大小不能为负数');
    }

    if (this.props.largestCheckpointBytes < 0) {
      throw new ValidationError('最大检查点大小不能为负数');
    }

    if (this.props.smallestCheckpointBytes < 0) {
      throw new ValidationError('最小检查点大小不能为负数');
    }

    if (this.props.totalRestores < 0) {
      throw new ValidationError('总恢复次数不能为负数');
    }

    if (this.props.averageRestores < 0) {
      throw new ValidationError('平均恢复次数不能为负数');
    }

    if (this.props.oldestCheckpointAgeHours < 0) {
      throw new ValidationError('最旧检查点年龄不能为负数');
    }

    if (this.props.newestCheckpointAgeHours < 0) {
      throw new ValidationError('最新检查点年龄不能为负数');
    }

    if (this.props.averageAgeHours < 0) {
      throw new ValidationError('平均年龄不能为负数');
    }

    // 验证数量一致性
    const statusSum =
      this.props.activeCheckpoints +
      this.props.expiredCheckpoints +
      this.props.corruptedCheckpoints +
      this.props.archivedCheckpoints;

    if (statusSum !== this.props.totalCheckpoints) {
      throw new ValidationError('状态检查点数量与总数不一致');
    }

    // 验证大小逻辑
    if (this.props.largestCheckpointBytes < this.props.smallestCheckpointBytes) {
      throw new ValidationError('最大检查点大小不能小于最小检查点大小');
    }

    // 验证年龄逻辑
    if (this.props.oldestCheckpointAgeHours < this.props.newestCheckpointAgeHours) {
      throw new ValidationError('最旧检查点年龄不能小于最新检查点年龄');
    }
  }

  /**
   * 相等性比较
   */
  public override equals(other: CheckpointStatistics): boolean {
    if (!(other instanceof CheckpointStatistics)) {
      return false;
    }

    return (
      this.props.totalCheckpoints === other.props.totalCheckpoints &&
      this.props.activeCheckpoints === other.props.activeCheckpoints &&
      this.props.expiredCheckpoints === other.props.expiredCheckpoints &&
      this.props.corruptedCheckpoints === other.props.corruptedCheckpoints &&
      this.props.archivedCheckpoints === other.props.archivedCheckpoints &&
      this.props.totalSizeBytes === other.props.totalSizeBytes &&
      this.props.averageSizeBytes === other.props.averageSizeBytes &&
      this.props.largestCheckpointBytes === other.props.largestCheckpointBytes &&
      this.props.smallestCheckpointBytes === other.props.smallestCheckpointBytes &&
      this.props.totalRestores === other.props.totalRestores &&
      this.props.averageRestores === other.props.averageRestores &&
      this.props.oldestCheckpointAgeHours === other.props.oldestCheckpointAgeHours &&
      this.props.newestCheckpointAgeHours === other.props.newestCheckpointAgeHours &&
      this.props.averageAgeHours === other.props.averageAgeHours
    );
  }
}

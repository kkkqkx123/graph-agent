import { ValueObject } from '../../common/value-objects/value-object';
import { InstanceStatus } from '../interfaces/pool-manager.interface';

/**
 * 池实例值对象
 */
export class PoolInstance extends ValueObject<{
  instanceId: string;
  modelName: string;
  groupName: string;
  echelon: string;
  status: InstanceStatus;
  currentLoad: number;
  maxConcurrency: number;
  avgResponseTime: number;
  successCount: number;
  failureCount: number;
}> {
  constructor(
    public readonly instanceId: string,
    public readonly modelName: string,
    public readonly groupName: string,
    public readonly echelon: string,
    public readonly status: InstanceStatus,
    public readonly currentLoad: number,
    public readonly maxConcurrency: number,
    public readonly avgResponseTime: number,
    public readonly successCount: number,
    public readonly failureCount: number
  ) {
    super({ instanceId, modelName, groupName, echelon, status, currentLoad, maxConcurrency, avgResponseTime, successCount, failureCount });
  }

  validate(): void {
    // 验证逻辑
  }

  /**
   * 检查实例是否可用
   */
  isAvailable(): boolean {
    return this.status === InstanceStatus.HEALTHY || this.status === InstanceStatus.DEGRADED;
  }

  /**
   * 检查实例是否能接受新请求
   */
  canAcceptRequest(): boolean {
    return this.isAvailable() && this.currentLoad < this.maxConcurrency;
  }

  /**
   * 计算成功率
   */
  getSuccessRate(): number {
    const totalRequests = this.successCount + this.failureCount;
    return totalRequests > 0 ? this.successCount / totalRequests : 0;
  }

  /**
   * 获取实例健康度评分
   */
  getHealthScore(): number {
    let score = 0;
    
    // 状态权重
    switch (this.status) {
      case InstanceStatus.HEALTHY:
        score += 100;
        break;
      case InstanceStatus.DEGRADED:
        score += 60;
        break;
      case InstanceStatus.RECOVERING:
        score += 40;
        break;
      case InstanceStatus.UNHEALTHY:
        score += 20;
        break;
      case InstanceStatus.FAILED:
        score += 0;
        break;
    }
    
    // 成功率权重
    score += this.getSuccessRate() * 30;
    
    // 负载权重
    const loadRatio = this.currentLoad / this.maxConcurrency;
    score += (1 - loadRatio) * 20;
    
    // 响应时间权重（响应时间越短越好）
    if (this.avgResponseTime > 0) {
      const responseTimeScore = Math.max(0, 50 - this.avgResponseTime / 100);
      score += responseTimeScore;
    }
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * 比较两个实例
   */
  override equals(other: PoolInstance): boolean {
    return this.instanceId === other.instanceId;
  }

  /**
   * 转换为JSON
   */
  toJSON(): Record<string, any> {
    return {
      instanceId: this.instanceId,
      modelName: this.modelName,
      groupName: this.groupName,
      echelon: this.echelon,
      status: this.status,
      currentLoad: this.currentLoad,
      maxConcurrency: this.maxConcurrency,
      avgResponseTime: this.avgResponseTime,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate: this.getSuccessRate(),
      healthScore: this.getHealthScore(),
      available: this.isAvailable(),
      canAcceptRequest: this.canAcceptRequest()
    };
  }
}
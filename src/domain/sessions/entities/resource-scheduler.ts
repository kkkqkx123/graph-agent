import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { SessionConfig } from '../value-objects/session-config';
import { IResourceRequirements } from './parallel-execution-plan';

/**
 * 资源调度器接口
 */
export interface IResourceScheduler {
  /**
   * 分配资源
   */
  allocate(requirements: IResourceRequirements): Promise<IResourceAllocation>;

  /**
   * 释放资源
   */
  release(allocation: IResourceAllocation): Promise<void>;

  /**
   * 获取资源使用情况
   */
  getResourceUsage(): IResourceUsage;

  /**
   * 清理
   */
  cleanup(): Promise<void>;

  /**
   * 验证
   */
  validate(): void;
}

/**
 * 资源使用情况接口
 */
export interface IResourceUsage {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkUsage: number;
}

/**
 * 资源分配接口
 */
export interface IResourceAllocation {
  allocationId: ID;
  resources: IResourceRequirements;
  allocatedAt: Timestamp;
  expiresAt?: Timestamp;
}

/**
 * 资源调度器实现类
 */
export class ResourceSchedulerImpl implements IResourceScheduler {
  private resourceUsage: IResourceUsage;
  private allocations: Map<string, IResourceAllocation> = new Map();

  private constructor(config: SessionConfig) {
    this.resourceUsage = {
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      networkUsage: 0
    };
  }

  /**
   * 创建资源调度器
   */
  public static create(config: SessionConfig): IResourceScheduler {
    return new ResourceSchedulerImpl(config);
  }

  public async allocate(requirements: IResourceRequirements): Promise<IResourceAllocation> {
    // 检查是否有足够资源
    if (!this.hasSufficientResources(requirements)) {
      throw new Error('Insufficient resources available');
    }

    const allocation: IResourceAllocation = {
      allocationId: ID.generate(),
      resources: requirements,
      allocatedAt: Timestamp.now()
    };

    this.allocations.set(allocation.allocationId.toString(), allocation);
    this.updateResourceUsage(requirements, 1); // 增加资源使用量

    return allocation;
  }

  public async release(allocation: IResourceAllocation): Promise<void> {
    this.allocations.delete(allocation.allocationId.toString());
    this.updateResourceUsage(allocation.resources, -1); // 减少资源使用量
  }

  public getResourceUsage(): IResourceUsage {
    return { ...this.resourceUsage };
  }

  public async cleanup(): Promise<void> {
    // 释放所有分配的资源
    for (const [id, allocation] of this.allocations) {
      await this.release(allocation);
    }
  }

  public validate(): void {
    if (this.resourceUsage.cpuUsage < 0 || this.resourceUsage.cpuUsage > 100) {
      throw new Error('CPU usage must be between 0 and 100');
    }
    // 其他验证...
  }

  private hasSufficientResources(requirements: IResourceRequirements): boolean {
    // 简单的资源检查逻辑
    return true; // 实际实现会更复杂
  }

  private updateResourceUsage(requirements: IResourceRequirements, multiplier: number): void {
    this.resourceUsage.cpuUsage += requirements.cpuCores * multiplier;
    this.resourceUsage.memoryUsage += requirements.memoryMB * multiplier;
    this.resourceUsage.diskUsage += requirements.diskSpaceMB * multiplier;
    this.resourceUsage.networkUsage += requirements.networkBandwidthMBps * multiplier;
  }
}
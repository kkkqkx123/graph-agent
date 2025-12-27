import { ValueObject } from '../../common/value-objects/value-object';

/**
 * 资源使用情况属性接口
 */
export interface ResourceUsageProps {
  readonly memoryUsage: number;
  readonly cpuUsage: number;
  readonly diskUsage: number;
  readonly networkUsage: number;
  readonly peakMemoryUsage: number;
  readonly peakCpuUsage: number;
}

/**
 * 资源使用情况值对象
 * 
 * 职责：表示资源使用情况统计
 */
export class ResourceUsage extends ValueObject<ResourceUsageProps> {
  /**
   * 创建资源使用情况
   * @returns 资源使用情况实例
   */
  public static create(): ResourceUsage {
    return new ResourceUsage({
      memoryUsage: 0,
      cpuUsage: 0,
      diskUsage: 0,
      networkUsage: 0,
      peakMemoryUsage: 0,
      peakCpuUsage: 0
    });
  }

  /**
   * 获取内存使用量
   * @returns 内存使用量（字节）
   */
  public get memoryUsage(): number {
    return this.props.memoryUsage;
  }

  /**
   * 获取CPU使用率
   * @returns CPU使用率（0-1）
   */
  public get cpuUsage(): number {
    return this.props.cpuUsage;
  }

  /**
   * 获取磁盘使用量
   * @returns 磁盘使用量（字节）
   */
  public get diskUsage(): number {
    return this.props.diskUsage;
  }

  /**
   * 获取网络使用量
   * @returns 网络使用量（字节）
   */
  public get networkUsage(): number {
    return this.props.networkUsage;
  }

  /**
   * 获取峰值内存使用量
   * @returns 峰值内存使用量（字节）
   */
  public get peakMemoryUsage(): number {
    return this.props.peakMemoryUsage;
  }

  /**
   * 获取峰值CPU使用率
   * @returns 峰值CPU使用率（0-1）
   */
  public get peakCpuUsage(): number {
    return this.props.peakCpuUsage;
  }

  /**
   * 更新内存使用量
   * @param memoryUsage 内存使用量（字节）
   * @returns 新的资源使用情况实例
   */
  public updateMemoryUsage(memoryUsage: number): ResourceUsage {
    const newPeakMemoryUsage = Math.max(this.props.peakMemoryUsage, memoryUsage);
    return new ResourceUsage({
      ...this.props,
      memoryUsage,
      peakMemoryUsage: newPeakMemoryUsage
    });
  }

  /**
   * 更新CPU使用率
   * @param cpuUsage CPU使用率（0-1）
   * @returns 新的资源使用情况实例
   */
  public updateCpuUsage(cpuUsage: number): ResourceUsage {
    const newPeakCpuUsage = Math.max(this.props.peakCpuUsage, cpuUsage);
    return new ResourceUsage({
      ...this.props,
      cpuUsage,
      peakCpuUsage: newPeakCpuUsage
    });
  }

  /**
   * 更新磁盘使用量
   * @param diskUsage 磁盘使用量（字节）
   * @returns 新的资源使用情况实例
   */
  public updateDiskUsage(diskUsage: number): ResourceUsage {
    return new ResourceUsage({
      ...this.props,
      diskUsage
    });
  }

  /**
   * 更新网络使用量
   * @param networkUsage 网络使用量（字节）
   * @returns 新的资源使用情况实例
   */
  public updateNetworkUsage(networkUsage: number): ResourceUsage {
    return new ResourceUsage({
      ...this.props,
      networkUsage
    });
  }

  /**
   * 验证资源使用情况的有效性
   */
  public validate(): void {
    if (this.props.memoryUsage < 0) {
      throw new Error('内存使用量不能为负数');
    }

    if (this.props.cpuUsage < 0 || this.props.cpuUsage > 1) {
      throw new Error('CPU使用率必须在0-1之间');
    }

    if (this.props.diskUsage < 0) {
      throw new Error('磁盘使用量不能为负数');
    }

    if (this.props.networkUsage < 0) {
      throw new Error('网络使用量不能为负数');
    }

    if (this.props.peakMemoryUsage < 0) {
      throw new Error('峰值内存使用量不能为负数');
    }

    if (this.props.peakCpuUsage < 0 || this.props.peakCpuUsage > 1) {
      throw new Error('峰值CPU使用率必须在0-1之间');
    }

    if (this.props.peakMemoryUsage < this.props.memoryUsage) {
      throw new Error('峰值内存使用量不能小于当前内存使用量');
    }

    if (this.props.peakCpuUsage < this.props.cpuUsage) {
      throw new Error('峰值CPU使用率不能小于当前CPU使用率');
    }
  }
}
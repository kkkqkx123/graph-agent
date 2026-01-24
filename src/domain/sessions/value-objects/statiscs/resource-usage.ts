import { ValueObject } from '../../../common/value-objects';
import { ValidationError } from '../../../common/exceptions';

/**
 * 资源使用统计属性接口
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
 * 资源使用统计值对象
 *
 * 职责：表示资源使用统计信息
 */
export class ResourceUsage extends ValueObject<ResourceUsageProps> {
  /**
   * 创建资源使用统计
   * @returns 资源使用统计实例
   */
  public static create(): ResourceUsage {
    return new ResourceUsage({
      memoryUsage: 0,
      cpuUsage: 0,
      diskUsage: 0,
      networkUsage: 0,
      peakMemoryUsage: 0,
      peakCpuUsage: 0,
    });
  }

  /**
   * 获取内存使用量
   * @returns 内存使用量（MB）
   */
  public get memoryUsage(): number {
    return this.props.memoryUsage;
  }

  /**
   * 获取CPU使用率
   * @returns CPU使用率（0-100）
   */
  public get cpuUsage(): number {
    return this.props.cpuUsage;
  }

  /**
   * 获取磁盘使用量
   * @returns 磁盘使用量（MB）
   */
  public get diskUsage(): number {
    return this.props.diskUsage;
  }

  /**
   * 获取网络使用量
   * @returns 网络使用量（MB）
   */
  public get networkUsage(): number {
    return this.props.networkUsage;
  }

  /**
   * 获取峰值内存使用量
   * @returns 峰值内存使用量（MB）
   */
  public get peakMemoryUsage(): number {
    return this.props.peakMemoryUsage;
  }

  /**
   * 获取峰值CPU使用率
   * @returns 峰值CPU使用率（0-100）
   */
  public get peakCpuUsage(): number {
    return this.props.peakCpuUsage;
  }

  /**
   * 更新资源使用情况
   * @param memoryUsage 内存使用量（MB）
   * @param cpuUsage CPU使用率（0-100）
   * @param diskUsage 磁盘使用量（MB）
   * @param networkUsage 网络使用量（MB）
   * @returns 新的资源使用统计实例
   */
  public updateUsage(
    memoryUsage: number,
    cpuUsage: number,
    diskUsage: number,
    networkUsage: number
  ): ResourceUsage {
    const newPeakMemoryUsage = Math.max(this.props.peakMemoryUsage, memoryUsage);
    const newPeakCpuUsage = Math.max(this.props.peakCpuUsage, cpuUsage);

    return new ResourceUsage({
      memoryUsage,
      cpuUsage,
      diskUsage,
      networkUsage,
      peakMemoryUsage: newPeakMemoryUsage,
      peakCpuUsage: newPeakCpuUsage,
    });
  }

  /**
   * 验证资源使用统计的有效性
   */
  public validate(): void {
    if (this.props.memoryUsage < 0) {
      throw new ValidationError('内存使用量不能为负数');
    }

    if (this.props.cpuUsage < 0 || this.props.cpuUsage > 100) {
      throw new ValidationError('CPU使用率必须在0-100之间');
    }

    if (this.props.diskUsage < 0) {
      throw new ValidationError('磁盘使用量不能为负数');
    }

    if (this.props.networkUsage < 0) {
      throw new ValidationError('网络使用量不能为负数');
    }

    if (this.props.peakMemoryUsage < 0) {
      throw new ValidationError('峰值内存使用量不能为负数');
    }

    if (this.props.peakCpuUsage < 0 || this.props.peakCpuUsage > 100) {
      throw new ValidationError('峰值CPU使用率必须在0-100之间');
    }

    // 峰值应该大于等于当前值
    if (this.props.peakMemoryUsage < this.props.memoryUsage) {
      throw new ValidationError('峰值内存使用量应该大于等于当前内存使用量');
    }

    if (this.props.peakCpuUsage < this.props.cpuUsage) {
      throw new ValidationError('峰值CPU使用率应该大于等于当前CPU使用率');
    }
  }
}

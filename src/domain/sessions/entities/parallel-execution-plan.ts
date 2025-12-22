import { ID } from '../../common/value-objects/id';

/**
 * 并行执行计划接口
 */
export interface IParallelExecutionPlan {
  /**
   * 获取线程计划
   */
  getThreadPlans(): IThreadPlan[];

  /**
   * 获取资源需求
   */
  getResourceRequirements(): IResourceRequirements;
}

/**
 * 线程计划接口
 */
export interface IThreadPlan {
  /**
   * 获取输入数据
   */
  getInputData(): unknown;

  /**
   * 获取元数据
   */
  getMetadata(): Record<string, unknown>;
}

/**
 * 资源需求接口
 */
export interface IResourceRequirements {
  cpuCores: number;
  memoryMB: number;
  diskSpaceMB: number;
  networkBandwidthMBps: number;
}
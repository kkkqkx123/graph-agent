import { ID } from '../../common/value-objects/id';

/**
 * 资源类型枚举
 */
export enum ResourceType {
  CPU = 'cpu',
  MEMORY = 'memory',
  DISK = 'disk',
  NETWORK = 'network',
  GPU = 'gpu',
  CUSTOM = 'custom'
}

/**
 * 资源状态枚举
 */
export enum ResourceStatus {
  AVAILABLE = 'available',
  ALLOCATED = 'allocated',
  BUSY = 'busy',
  UNAVAILABLE = 'unavailable',
  ERROR = 'error'
}

/**
 * 资源分配策略
 */
export enum AllocationStrategy {
  FIFO = 'fifo',
  PRIORITY = 'priority',
  BEST_FIT = 'best_fit',
  WORST_FIT = 'worst_fit',
  ROUND_ROBIN = 'round_robin',
  ADAPTIVE = 'adaptive'
}

/**
 * 资源需求
 */
export interface ResourceRequirement {
  resourceType: ResourceType;
  amount: number;
  priority: number;
  exclusive: boolean;
  timeout?: number;
  metadata?: Record<string, unknown>;
}

/**
 * 资源分配
 */
export interface ResourceAllocation {
  allocationId: string;
  resourceId: string;
  resourceType: ResourceType;
  amount: number;
  allocatedTo: string;
  allocatedAt: Date;
  expiresAt?: Date;
  status: ResourceStatus;
  metadata: Record<string, unknown>;
}

/**
 * 资源定义
 */
export interface ResourceDefinition {
  resourceId: string;
  name: string;
  description: string;
  resourceType: ResourceType;
  totalAmount: number;
  availableAmount: number;
  allocatedAmount: number;
  unit: string;
  location?: string;
  properties: Record<string, unknown>;
  status: ResourceStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 资源使用统计
 */
export interface ResourceUsageStats {
  resourceId: string;
  resourceType: ResourceType;
  totalUsage: number;
  averageUsage: number;
  peakUsage: number;
  currentUsage: number;
  utilizationRate: number;
  timeWindow: {
    start: Date;
    end: Date;
  };
}

/**
 * 资源管理器配置
 */
export interface ResourceManagerConfig {
  defaultAllocationStrategy: AllocationStrategy;
  enableMonitoring: boolean;
  monitoringInterval: number;
  enableAutoScaling: boolean;
  enableResourcePooling: boolean;
  maxAllocationTime: number;
  cleanupInterval: number;
  enableMetrics: boolean;
  metricsRetentionDays: number;
}

/**
 * 资源管理器统计信息
 */
export interface ResourceManagerStats {
  totalResources: number;
  availableResources: number;
  allocatedResources: number;
  totalAllocations: number;
  activeAllocations: number;
  expiredAllocations: number;
  averageAllocationTime: number;
  resourceUtilization: Map<ResourceType, number>;
  allocationsByResourceType: Map<ResourceType, number>;
}

/**
 * 资源管理器接口
 * 
 * 负责管理图执行过程中的资源分配、监控和优化
 */
export interface IResourceManager {
  /**
   * 注册资源
   * 
   * @param resourceDefinition 资源定义
   * @returns 是否成功注册
   */
  registerResource(resourceDefinition: ResourceDefinition): Promise<boolean>;

  /**
   * 注销资源
   * 
   * @param resourceId 资源ID
   * @returns 是否成功注销
   */
  unregisterResource(resourceId: string): Promise<boolean>;

  /**
   * 分配资源
   * 
   * @param requirements 资源需求列表
   * @param allocatedTo 分配目标
   * @param strategy 分配策略
   * @returns 资源分配列表
   */
  allocateResources(
    requirements: ResourceRequirement[],
    allocatedTo: string,
    strategy?: AllocationStrategy
  ): Promise<ResourceAllocation[]>;

  /**
   * 释放资源
   * 
   * @param allocationId 分配ID
   * @returns 是否成功释放
   */
  releaseResource(allocationId: string): Promise<boolean>;

  /**
   * 批量释放资源
   * 
   * @param allocationIds 分配ID列表
   * @returns 释放结果列表
   */
  releaseResources(allocationIds: string[]): Promise<boolean[]>;

  /**
   * 续期资源分配
   * 
   * @param allocationId 分配ID
   * @param extensionTime 延长时间
   * @returns 是否成功续期
   */
  extendAllocation(allocationId: string, extensionTime: number): Promise<boolean>;

  /**
   * 获取资源
   * 
   * @param resourceId 资源ID
   * @returns 资源定义
   */
  getResource(resourceId: string): ResourceDefinition | null;

  /**
   * 获取资源列表
   * 
   * @param resourceType 资源类型
   * @param status 资源状态
   * @returns 资源列表
   */
  getResources(resourceType?: ResourceType, status?: ResourceStatus): ResourceDefinition[];

  /**
   * 获取资源分配
   * 
   * @param allocationId 分配ID
   * @returns 资源分配
   */
  getAllocation(allocationId: string): ResourceAllocation | null;

  /**
   * 获取资源分配列表
   * 
   * @param allocatedTo 分配目标
   * @param resourceType 资源类型
   * @param status 资源状态
   * @returns 资源分配列表
   */
  getAllocations(
    allocatedTo?: string,
    resourceType?: ResourceType,
    status?: ResourceStatus
  ): ResourceAllocation[];

  /**
   * 检查资源可用性
   * 
   * @param requirements 资源需求列表
   * @returns 可用性检查结果
   */
  checkAvailability(requirements: ResourceRequirement[]): Promise<AvailabilityCheckResult>;

  /**
   * 预留资源
   * 
   * @param requirements 资源需求列表
   * @param reservedFor 预留目标
   * @param timeout 预留超时时间
   * @returns 预留ID
   */
  reserveResources(
    requirements: ResourceRequirement[],
    reservedFor: string,
    timeout?: number
  ): Promise<string>;

  /**
   * 取消资源预留
   * 
   * @param reservationId 预留ID
   * @returns 是否成功取消
   */
  cancelReservation(reservationId: string): Promise<boolean>;

  /**
   * 获取资源使用统计
   * 
   * @param resourceId 资源ID
   * @param timeWindow 时间窗口
   * @returns 使用统计
   */
  getResourceUsageStats(resourceId: string, timeWindow?: TimeWindow): Promise<ResourceUsageStats>;

  /**
   * 获取资源管理器统计信息
   * 
   * @returns 统计信息
   */
  getManagerStats(): ResourceManagerStats;

  /**
   * 监控资源使用
   * 
   * @param callback 监控回调
   * @returns 监控ID
   */
  monitorResources(callback: ResourceMonitorCallback): string;

  /**
   * 停止资源监控
   * 
   * @param monitorId 监控ID
   * @returns 是否成功停止
   */
  stopMonitoring(monitorId: string): boolean;

  /**
   * 设置资源管理器配置
   * 
   * @param config 管理器配置
   */
  setManagerConfig(config: ResourceManagerConfig): void;

  /**
   * 优化资源分配
   * 
   * @param strategy 优化策略
   * @returns 优化结果
   */
  optimizeAllocations(strategy?: OptimizationStrategy): Promise<OptimizationResult>;

  /**
   * 清理过期分配
   * 
   * @param olderThan 清理早于此时间的分配
   * @returns 清理的分配数量
   */
  cleanupExpiredAllocations(olderThan?: Date): Promise<number>;

  /**
   * 重置资源管理器
   */
  reset(): Promise<void>;

  /**
   * 销毁资源管理器，释放资源
   */
  destroy(): Promise<void>;
}

/**
 * 可用性检查结果
 */
export interface AvailabilityCheckResult {
  available: boolean;
  availableResources: ResourceAvailability[];
  missingResources: ResourceRequirement[];
  alternativeSuggestions: ResourceRequirement[];
}

/**
 * 资源可用性
 */
export interface ResourceAvailability {
  resourceType: ResourceType;
  availableAmount: number;
  requiredAmount: number;
  canFulfill: boolean;
}

/**
 * 时间窗口
 */
export interface TimeWindow {
  start: Date;
  end: Date;
}

/**
 * 资源监控回调
 */
export type ResourceMonitorCallback = (stats: ResourceUsageStats[]) => void;

/**
 * 优化策略
 */
export interface OptimizationStrategy {
  strategyType: 'consolidation' | 'balancing' | 'prioritization' | 'custom';
  parameters: Record<string, unknown>;
  targetUtilization: number;
  maxMigrationTime: number;
}

/**
 * 优化结果
 */
export interface OptimizationResult {
  success: boolean;
  optimizedAllocations: string[];
  migratedAllocations: string[];
  releasedAllocations: string[];
  improvementMetrics: {
    utilizationImprovement: number;
    resourceSavings: number;
    performanceImprovement: number;
  };
  executionTime: number;
  errors: string[];
}

/**
 * 资源池接口
 */
export interface IResourcePool {
  /**
   * 获取资源
   * 
   * @param amount 资源数量
   * @param timeout 超时时间
   * @returns 资源分配
   */
  acquire(amount: number, timeout?: number): Promise<ResourceAllocation>;

  /**
   * 释放资源
   * 
   * @param allocation 资源分配
   * @returns 是否成功释放
   */
  release(allocation: ResourceAllocation): Promise<boolean>;

  /**
   * 获取池状态
   * 
   * @returns 池状态
   */
  getPoolStatus(): ResourcePoolStatus;

  /**
   * 调整池大小
   * 
   * @param newSize 新大小
   * @returns 是否成功调整
   */
  resize(newSize: number): Promise<boolean>;
}

/**
 * 资源池状态
 */
export interface ResourcePoolStatus {
  totalSize: number;
  availableSize: number;
  allocatedSize: number;
  waitingRequests: number;
  utilizationRate: number;
}
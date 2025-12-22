/**
 * 资源相关类型定义
 */

/**
 * 资源需求
 */
export interface ResourceRequirement {
  readonly type: 'cpu' | 'memory' | 'storage' | 'network';
  readonly amount: number;
  readonly unit: string;
}

/**
 * 资源分配
 */
export interface ResourceAllocation {
  readonly id: string;
  readonly sessionId: string;
  readonly threadId?: string;
  readonly resources: ResourceRequirement[];
  readonly allocatedAt: Date;
  readonly expiresAt?: Date;
}

/**
 * 资源限制
 */
export interface ResourceLimits {
  readonly maxThreads: number;
  readonly maxExecutionTime: number;
  readonly maxMemory: number;
  readonly maxStorage: number;
}

/**
 * 会话配额
 */
export interface SessionQuota {
  readonly remainingThreads: number;
  readonly remainingExecutionTime: number;
  readonly remainingMemory: number;
  readonly remainingStorage: number;
}

/**
 * 配额使用情况
 */
export interface QuotaUsage {
  readonly threadsUsed: number;
  readonly executionTimeUsed: number;
  readonly memoryUsed: number;
  readonly storageUsed: number;
}
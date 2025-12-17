/**
 * 轮询池DTO
 */
export interface PoolDTO {
  name: string;
  config: Record<string, any>;
  status: PoolStatusDTO;
  statistics: PoolStatisticsDTO;
}

/**
 * 轮询池状态DTO
 */
export interface PoolStatusDTO {
  totalInstances: number;
  healthyInstances: number;
  degradedInstances: number;
  failedInstances: number;
  availabilityRate: number;
  concurrencyStatus: ConcurrencyStatusDTO;
  lastChecked: Date;
}

/**
 * 轮询池统计DTO
 */
export interface PoolStatisticsDTO {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  successRate: number;
  currentLoad: number;
  maxConcurrency: number;
}

/**
 * 并发状态DTO
 */
export interface ConcurrencyStatusDTO {
  enabled: boolean;
  currentLoad: number;
  maxLoad: number;
  loadPercentage: number;
}

/**
 * 实例DTO
 */
export interface InstanceDTO {
  instanceId: string;
  modelName: string;
  groupName: string;
  echelon: string;
  status: string;
  currentLoad: number;
  maxConcurrency: number;
  avgResponseTime: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  healthScore: number;
  available: boolean;
  canAcceptRequest: boolean;
  lastUsed: Date | null;
  lastHealthCheck: Date;
}

/**
 * 轮询池创建DTO
 */
export interface PoolCreateDTO {
  name: string;
  config: Record<string, any>;
  taskGroups: string[];
}

/**
 * 轮询池更新DTO
 */
export interface PoolUpdateDTO {
  config?: Record<string, any>;
  taskGroups?: string[];
}

/**
 * 轮询池健康报告DTO
 */
export interface PoolHealthReportDTO {
  poolName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
  recommendations: string[];
  statistics: PoolStatisticsDTO;
  lastChecked: Date;
}

/**
 * 系统级轮询池报告DTO
 */
export interface SystemPoolReportDTO {
  totalPools: number;
  totalInstances: number;
  healthyInstances: number;
  overallAvailability: number;
  pools: Record<string, PoolStatisticsDTO>;
  timestamp: Date;
}
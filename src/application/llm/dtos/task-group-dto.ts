/**
 * 任务组DTO
 */
export interface TaskGroupDTO {
  name: string;
  config: Record<string, any>;
  status: TaskGroupStatusDTO;
  statistics: TaskGroupStatisticsDTO;
}

/**
 * 任务组状态DTO
 */
export interface TaskGroupStatusDTO {
  totalEchelons: number;
  totalModels: number;
  available: boolean;
  echelons: EchelonStatusDTO[];
  lastChecked: Date;
}

/**
 * 任务组统计DTO
 */
export interface TaskGroupStatisticsDTO {
  name: string;
  totalEchelons: number;
  totalModels: number;
  availabilityRate: number;
  echelonDistribution: Record<string, EchelonDistributionDTO>;
}

/**
 * 层级状态DTO
 */
export interface EchelonStatusDTO {
  name: string;
  priority: number;
  modelCount: number;
  available: boolean;
  models: string[];
}

/**
 * 层级分布DTO
 */
export interface EchelonDistributionDTO {
  priority: number;
  modelCount: number;
  availability: boolean;
}

/**
 * 组引用解析DTO
 */
export interface GroupReferenceParseDTO {
  groupName: string;
  echelonOrTask: string | null;
  isValid: boolean;
  fullReference: string;
}

/**
 * 降级配置DTO
 */
export interface FallbackConfigDTO {
  strategy: string;
  fallbackGroups: string[];
  maxAttempts: number;
  retryDelay: number;
  circuitBreaker?: CircuitBreakerDTO;
}

/**
 * 熔断器DTO
 */
export interface CircuitBreakerDTO {
  failureThreshold: number;
  recoveryTime: number;
  halfOpenRequests: number;
}

/**
 * 任务组创建DTO
 */
export interface TaskGroupCreateDTO {
  name: string;
  config: Record<string, any>;
  echelons: Record<string, EchelonConfigDTO>;
}

/**
 * 层级配置DTO
 */
export interface EchelonConfigDTO {
  priority: number;
  models: string[];
  fallbackStrategy?: string;
  maxAttempts?: number;
  retryDelay?: number;
}

/**
 * 任务组更新DTO
 */
export interface TaskGroupUpdateDTO {
  config?: Record<string, any>;
  echelons?: Record<string, EchelonConfigDTO>;
}

/**
 * 任务组健康报告DTO
 */
export interface TaskGroupHealthReportDTO {
  groupName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
  recommendations: string[];
  statistics: TaskGroupStatisticsDTO;
  lastChecked: Date;
}

/**
 * 系统级任务组报告DTO
 */
export interface SystemTaskGroupReportDTO {
  totalGroups: number;
  totalModels: number;
  groups: Record<string, TaskGroupStatisticsDTO>;
  timestamp: Date;
}

/**
 * 最优任务组选择DTO
 */
export interface OptimalTaskGroupSelectionDTO {
  selectedGroup: string | null;
  alternatives: string[];
  selectionCriteria: Record<string, any>;
  confidence: number;
}

/**
 * 模型列表DTO
 */
export interface ModelListDTO {
  models: string[];
  totalCount: number;
  availableCount: number;
  unavailableCount: number;
}

/**
 * 层级优先级DTO
 */
export interface EchelonPriorityDTO {
  echelonName: string;
  priority: number;
  models: string[];
}
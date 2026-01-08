/**
 * LLM模块DTO定义
 * 简化后的DTO实现，使用简单接口和映射函数
 */

// ==================== DTO接口定义 ====================

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
 * 轮询池状态DTO
 */
export interface PoolStatusDTO {
    totalInstances: number;
    healthyInstances: number;
    degradedInstances: number;
    failedInstances: number;
    availabilityRate: number;
    concurrencyStatus: ConcurrencyStatusDTO;
    lastChecked: string;
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
 * 轮询池DTO
 */
export interface PoolDTO {
    name: string;
    config: Record<string, unknown>;
    status: PoolStatusDTO;
    statistics: PoolStatisticsDTO;
}

/**
 * 实例DTO
 */
export interface InstanceDTO {
    instanceId: string;
    modelName: string;
    groupName: string;
    echelon: string;
    status: 'healthy' | 'degraded' | 'failed' | 'unknown';
    currentLoad: number;
    maxConcurrency: number;
    avgResponseTime: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    healthScore: number;
    available: boolean;
    canAcceptRequest: boolean;
    lastUsed: string | null;
    lastHealthCheck: string;
}

/**
 * 轮询池创建DTO
 */
export interface PoolCreateDTO {
    name: string;
    config: Record<string, unknown>;
    taskGroups: string[];
}

/**
 * 轮询池更新DTO
 */
export interface PoolUpdateDTO {
    config?: Record<string, unknown>;
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
    lastChecked: string;
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
    timestamp: string;
}

// ==================== 任务组DTO定义 ====================

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
 * 任务组状态DTO
 */
export interface TaskGroupStatusDTO {
    totalEchelons: number;
    totalModels: number;
    available: boolean;
    echelons: EchelonStatusDTO[];
    lastChecked: string;
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
 * 任务组DTO
 */
export interface TaskGroupDTO {
    name: string;
    config: Record<string, unknown>;
    status: TaskGroupStatusDTO;
    statistics: TaskGroupStatisticsDTO;
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
 * 熔断器DTO
 */
export interface CircuitBreakerDTO {
    failureThreshold: number;
    recoveryTime: number;
    halfOpenRequests: number;
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
 * 任务组创建DTO
 */
export interface TaskGroupCreateDTO {
    name: string;
    config: Record<string, unknown>;
    echelons: Record<string, EchelonConfigDTO>;
}

/**
 * 任务组更新DTO
 */
export interface TaskGroupUpdateDTO {
    config?: Record<string, unknown>;
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
    lastChecked: string;
}

/**
 * 系统级任务组报告DTO
 */
export interface SystemTaskGroupReportDTO {
    totalGroups: number;
    totalModels: number;
    groups: Record<string, TaskGroupStatisticsDTO>;
    timestamp: string;
}

/**
 * 最优任务组选择DTO
 */
export interface OptimalTaskGroupSelectionDTO {
    selectedGroup: string | null;
    alternatives: string[];
    selectionCriteria: Record<string, unknown>;
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

// ==================== 映射函数 ====================

/**
 * 将轮询池领域对象转换为PoolDTO
 */
export const mapPoolToDTO = (pool: any): PoolDTO => {
    return {
        name: pool.name || '',
        config: pool.config || {},
        status: {
            totalInstances: pool.status?.totalInstances || 0,
            healthyInstances: pool.status?.healthyInstances || 0,
            degradedInstances: pool.status?.degradedInstances || 0,
            failedInstances: pool.status?.failedInstances || 0,
            availabilityRate: pool.status?.availabilityRate || 0,
            concurrencyStatus: {
                enabled: pool.status?.concurrencyStatus?.enabled || false,
                currentLoad: pool.status?.concurrencyStatus?.currentLoad || 0,
                maxLoad: pool.status?.concurrencyStatus?.maxLoad || 0,
                loadPercentage: pool.status?.concurrencyStatus?.loadPercentage || 0,
            },
            lastChecked: pool.status?.lastChecked?.toISOString() || new Date().toISOString(),
        },
        statistics: {
            totalRequests: pool.statistics?.totalRequests || 0,
            successfulRequests: pool.statistics?.successfulRequests || 0,
            failedRequests: pool.statistics?.failedRequests || 0,
            avgResponseTime: pool.statistics?.avgResponseTime || 0,
            successRate: pool.statistics?.successRate || 0,
            currentLoad: pool.statistics?.currentLoad || 0,
            maxConcurrency: pool.statistics?.maxConcurrency || 0,
        },
    };
};

/**
 * 批量将轮询池领域对象转换为PoolDTO
 */
export const mapPoolsToDTOs = (pools: any[]): PoolDTO[] => {
    return pools.map(mapPoolToDTO);
};

/**
 * 将任务组领域对象转换为TaskGroupDTO
 */
export const mapTaskGroupToDTO = (taskGroup: any): TaskGroupDTO => {
    return {
        name: taskGroup.name || '',
        config: taskGroup.config || {},
        status: {
            totalEchelons: taskGroup.status?.totalEchelons || 0,
            totalModels: taskGroup.status?.totalModels || 0,
            available: taskGroup.status?.available || false,
            echelons: taskGroup.status?.echelons || [],
            lastChecked: taskGroup.status?.lastChecked?.toISOString() || new Date().toISOString(),
        },
        statistics: {
            name: taskGroup.statistics?.name || taskGroup.name || '',
            totalEchelons: taskGroup.statistics?.totalEchelons || 0,
            totalModels: taskGroup.statistics?.totalModels || 0,
            availabilityRate: taskGroup.statistics?.availabilityRate || 0,
            echelonDistribution: taskGroup.statistics?.echelonDistribution || {},
        },
    };
};

/**
 * 批量将任务组领域对象转换为TaskGroupDTO
 */
export const mapTaskGroupsToDTOs = (taskGroups: any[]): TaskGroupDTO[] => {
    return taskGroups.map(mapTaskGroupToDTO);
};

/**
 * 将实例领域对象转换为InstanceDTO
 */
export const mapInstanceToDTO = (instance: any): InstanceDTO => {
    return {
        instanceId: instance.instanceId?.toString() || instance.id?.toString() || '',
        modelName: instance.modelName || '',
        groupName: instance.groupName || '',
        echelon: instance.echelon || '',
        status: instance.status || 'unknown',
        currentLoad: instance.currentLoad || 0,
        maxConcurrency: instance.maxConcurrency || 0,
        avgResponseTime: instance.avgResponseTime || 0,
        successCount: instance.successCount || 0,
        failureCount: instance.failureCount || 0,
        successRate: instance.successRate || 0,
        healthScore: instance.healthScore || 0,
        available: Boolean(instance.available),
        canAcceptRequest: Boolean(instance.canAcceptRequest),
        lastUsed: instance.lastUsed?.toISOString() || null,
        lastHealthCheck: instance.lastHealthCheck?.toISOString() || new Date().toISOString(),
    };
};

/**
 * 批量将实例领域对象转换为InstanceDTO
 */
export const mapInstancesToDTOs = (instances: any[]): InstanceDTO[] => {
    return instances.map(mapInstanceToDTO);
};

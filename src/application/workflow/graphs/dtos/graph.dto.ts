/**
 * 图DTO
 */
export interface GraphDto {
  /** 图ID */
  id: string;
  /** 图名称 */
  name: string;
  /** 图描述 */
  description?: string;
  /** 节点列表 */
  nodes: NodeDto[];
  /** 边列表 */
  edges: EdgeDto[];
  /** 图版本 */
  version: string;
  /** 元数据 */
  metadata: Record<string, unknown>;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 创建者ID */
  createdBy?: string;
  /** 更新者ID */
  updatedBy?: string;
}

/**
 * 节点DTO
 */
export interface NodeDto {
  /** 节点ID */
  id: string;
  /** 图ID */
  graphId: string;
  /** 节点类型 */
  type: string;
  /** 节点名称 */
  name?: string;
  /** 节点描述 */
  description?: string;
  /** 节点位置 */
  position?: {
    x: number;
    y: number;
  };
  /** 节点属性 */
  properties: Record<string, unknown>;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 边DTO
 */
export interface EdgeDto {
  /** 边ID */
  id: string;
  /** 图ID */
  graphId: string;
  /** 边类型 */
  type: string;
  /** 源节点ID */
  fromNodeId: string;
  /** 目标节点ID */
  toNodeId: string;
  /** 条件表达式 */
  condition?: string;
  /** 权重 */
  weight?: number;
  /** 边属性 */
  properties: Record<string, unknown>;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 图摘要DTO
 */
export interface GraphSummaryDto {
  /** 图ID */
  id: string;
  /** 图名称 */
  name: string;
  /** 节点数量 */
  nodeCount: number;
  /** 边数量 */
  edgeCount: number;
  /** 图类型 */
  type?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 执行计划DTO
 */
export interface ExecutionPlanDto {
  /** 执行计划ID */
  id: string;
  /** 图ID */
  graphId: string;
  /** 执行模式 */
  executionMode: 'sequential' | 'parallel' | 'conditional';
  /** 执行步骤 */
  steps: ExecutionStepDto[];
  /** 依赖关系 */
  dependencies: ExecutionDependencyDto[];
  /** 预估执行时间（毫秒） */
  estimatedDuration: number;
  /** 创建时间 */
  createdAt: string;
}

/**
 * 执行步骤DTO
 */
export interface ExecutionStepDto {
  /** 步骤ID */
  id: string;
  /** 节点ID */
  nodeId: string;
  /** 步骤名称 */
  name?: string;
  /** 步骤类型 */
  type: string;
  /** 执行顺序 */
  order: number;
  /** 并行组ID（可选） */
  parallelGroupId?: string;
  /** 前置条件 */
  prerequisites: string[];
  /** 输入映射 */
  inputMapping: Record<string, string>;
  /** 输出映射 */
  outputMapping: Record<string, string>;
  /** 超时时间（秒） */
  timeout?: number;
  /** 重试配置 */
  retryConfig?: {
    maxRetries: number;
    retryInterval: number;
    exponentialBackoff: boolean;
  };
}

/**
 * 执行依赖DTO
 */
export interface ExecutionDependencyDto {
  /** 源步骤ID */
  fromStepId: string;
  /** 目标步骤ID */
  toStepId: string;
  /** 依赖类型 */
  type: 'success' | 'failure' | 'completion' | 'conditional';
  /** 条件表达式 */
  condition?: string;
}

/**
 * 节点执行状态DTO
 */
export interface NodeExecutionStatusDto {
  /** 节点ID */
  nodeId: string;
  /** 执行状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';
  /** 开始时间 */
  startTime?: string;
  /** 结束时间 */
  endTime?: string;
  /** 执行持续时间（毫秒） */
  duration?: number;
  /** 执行结果 */
  result?: Record<string, unknown>;
  /** 执行错误 */
  error?: string;
  /** 重试次数 */
  retryCount: number;
  /** 执行日志 */
  logs: Array<{
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    timestamp: string;
  }>;
}

/**
 * 图执行状态DTO
 */
export interface GraphExecutionStatusDto {
  /** 图ID */
  graphId: string;
  /** 执行ID */
  executionId: string;
  /** 执行状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  /** 开始时间 */
  startTime: string;
  /** 结束时间 */
  endTime?: string;
  /** 执行持续时间（毫秒） */
  duration?: number;
  /** 当前节点ID */
  currentNodeId?: string;
  /** 已执行节点数 */
  executedNodes: number;
  /** 总节点数 */
  totalNodes: number;
  /** 已执行边数 */
  executedEdges: number;
  /** 总边数 */
  totalEdges: number;
  /** 执行路径 */
  executionPath: string[];
  /** 节点执行状态 */
  nodeStatuses: Record<string, NodeExecutionStatusDto>;
  /** 执行输出 */
  output: Record<string, unknown>;
  /** 执行错误 */
  error?: string;
  /** 执行统计信息 */
  statistics: {
    /** 平均节点执行时间（毫秒） */
    averageNodeExecutionTime: number;
    /** 最长节点执行时间（毫秒） */
    maxNodeExecutionTime: number;
    /** 最短节点执行时间（毫秒） */
    minNodeExecutionTime: number;
    /** 成功率 */
    successRate: number;
  };
}

/**
 * 图统计信息DTO
 */
export interface GraphStatisticsDto {
  /** 图ID */
  graphId: string;
  /** 节点统计 */
  nodeStatistics: {
    /** 总节点数 */
    total: number;
    /** 按类型分组的节点数 */
    byType: Record<string, number>;
    /** 按状态分组的节点数 */
    byStatus: Record<string, number>;
  };
  /** 边统计 */
  edgeStatistics: {
    /** 总边数 */
    total: number;
    /** 按类型分组的边数 */
    byType: Record<string, number>;
    /** 按条件分组的边数 */
    byCondition: Record<string, number>;
  };
  /** 执行统计 */
  executionStatistics: {
    /** 总执行次数 */
    totalExecutions: number;
    /** 成功执行次数 */
    successfulExecutions: number;
    /** 失败执行次数 */
    failedExecutions: number;
    /** 平均执行时间（毫秒） */
    averageExecutionTime: number;
    /** 最长执行时间（毫秒） */
    maxExecutionTime: number;
    /** 最短执行时间（毫秒） */
    minExecutionTime: number;
  };
  /** 路径统计 */
  pathStatistics: {
    /** 总路径数 */
    totalPaths: number;
    /** 最短路径长度 */
    shortestPathLength: number;
    /** 最长路径长度 */
    longestPathLength: number;
    /** 平均路径长度 */
    averagePathLength: number;
  };
  /** 复杂度指标 */
  complexityMetrics: {
    /** 循环复杂度 */
    cyclomaticComplexity: number;
    /** 节点连接度 */
    nodeConnectivity: number;
    /** 图密度 */
    graphDensity: number;
  };
}
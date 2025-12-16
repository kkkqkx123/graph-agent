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

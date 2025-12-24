/**
 * 执行工作流命令
 */
export interface ExecuteWorkflowCommand {
  /** 工作流ID */
  workflowId: string;
  /** 输入数据 */
  inputData: Record<string, unknown>;
  /** 执行参数 */
  parameters?: Record<string, unknown>;
  /** 执行模式 */
  executionMode?: 'sequential' | 'parallel' | 'conditional';
  /** 执行优先级 */
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  /** 超时时间（秒） */
  timeout?: number;
  /** 是否异步执行 */
  async?: boolean;
  /** 操作用户ID */
  userId?: string;
  /** 回调URL */
  callbackUrl?: string;
  /** 重试配置 */
  retryConfig?: {
    maxRetries: number;
    retryInterval: number;
    exponentialBackoff: boolean;
  };
}

/**
 * 验证工作流命令
 */
export interface ValidateWorkflowCommand {
  /** 工作流ID */
  workflowId: string;
  /** 验证级别 */
  validationLevel?: 'basic' | 'standard' | 'strict';
  /** 验证类型 */
  validationTypes?: Array<'structure' | 'semantics' | 'performance' | 'security'>;
}

/**
 * 创建执行计划命令
 */
export interface CreateExecutionPlanCommand {
  /** 工作流ID */
  workflowId: string;
  /** 执行模式 */
  executionMode?: 'sequential' | 'parallel' | 'conditional';
  /** 执行参数 */
  parameters?: Record<string, unknown>;
  /** 优化选项 */
  optimizationOptions?: {
    /** 是否优化执行顺序 */
    optimizeOrder: boolean;
    /** 是否并行化独立节点 */
    parallelizeIndependent: boolean;
    /** 是否预加载资源 */
    preloadResources: boolean;
  };
}
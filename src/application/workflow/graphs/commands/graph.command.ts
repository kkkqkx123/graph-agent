/**
 * 创建图命令
 */
export interface CreateGraphCommand {
  /** 图名称 */
  name: string;
  /** 图描述 */
  description?: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 创建者ID */
  createdBy?: string;
}

/**
 * 更新图命令
 */
export interface UpdateGraphCommand {
  /** 图ID */
  graphId: string;
  /** 新名称 */
  name?: string;
  /** 新描述 */
  description?: string;
  /** 新元数据 */
  metadata?: Record<string, unknown>;
  /** 操作用户ID */
  userId?: string;
}

/**
 * 删除图命令
 */
export interface DeleteGraphCommand {
  /** 图ID */
  graphId: string;
  /** 操作用户ID */
  userId?: string;
  /** 删除原因 */
  reason?: string;
}

/**
 * 添加节点命令
 */
export interface AddNodeCommand {
  /** 图ID */
  graphId: string;
  /** 节点类型 */
  nodeType: string;
  /** 节点名称 */
  nodeName?: string;
  /** 节点描述 */
  nodeDescription?: string;
  /** 节点位置 */
  position?: {
    x: number;
    y: number;
  };
  /** 节点属性 */
  properties?: Record<string, unknown>;
  /** 操作用户ID */
  userId?: string;
}

/**
 * 更新节点命令
 */
export interface UpdateNodeCommand {
  /** 图ID */
  graphId: string;
  /** 节点ID */
  nodeId: string;
  /** 新节点名称 */
  nodeName?: string;
  /** 新节点描述 */
  nodeDescription?: string;
  /** 新节点位置 */
  position?: {
    x: number;
    y: number;
  };
  /** 新节点属性 */
  properties?: Record<string, unknown>;
  /** 操作用户ID */
  userId?: string;
}

/**
 * 移除节点命令
 */
export interface RemoveNodeCommand {
  /** 图ID */
  graphId: string;
  /** 节点ID */
  nodeId: string;
  /** 操作用户ID */
  userId?: string;
}

/**
 * 添加边命令
 */
export interface AddEdgeCommand {
  /** 图ID */
  graphId: string;
  /** 边类型 */
  edgeType: string;
  /** 源节点ID */
  fromNodeId: string;
  /** 目标节点ID */
  toNodeId: string;
  /** 条件表达式 */
  condition?: string;
  /** 权重 */
  weight?: number;
  /** 边属性 */
  properties?: Record<string, unknown>;
  /** 操作用户ID */
  userId?: string;
}

/**
 * 更新边命令
 */
export interface UpdateEdgeCommand {
  /** 图ID */
  graphId: string;
  /** 边ID */
  edgeId: string;
  /** 新条件表达式 */
  condition?: string;
  /** 新权重 */
  weight?: number;
  /** 新边属性 */
  properties?: Record<string, unknown>;
  /** 操作用户ID */
  userId?: string;
}

/**
 * 移除边命令
 */
export interface RemoveEdgeCommand {
  /** 图ID */
  graphId: string;
  /** 边ID */
  edgeId: string;
  /** 操作用户ID */
  userId?: string;
}

/**
 * 执行图命令
 */
export interface ExecuteGraphCommand {
  /** 图ID */
  graphId: string;
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
 * 验证图命令
 */
export interface ValidateGraphCommand {
  /** 图ID */
  graphId: string;
  /** 验证级别 */
  validationLevel?: 'basic' | 'standard' | 'strict';
  /** 验证类型 */
  validationTypes?: Array<'structure' | 'semantics' | 'performance' | 'security'>;
}

/**
 * 创建执行计划命令
 */
export interface CreateExecutionPlanCommand {
  /** 图ID */
  graphId: string;
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

/**
 * 批量操作命令
 */
export interface BatchOperationCommand {
  /** 图ID */
  graphId: string;
  /** 操作类型 */
  operationType: 'add_nodes' | 'remove_nodes' | 'add_edges' | 'remove_edges';
  /** 操作数据 */
  operationData: any[];
  /** 操作用户ID */
  userId?: string;
}

/**
 * 导入图命令
 */
export interface ImportGraphCommand {
  /** 图数据 */
  graphData: {
    name: string;
    description?: string;
    nodes: any[];
    edges: any[];
    metadata?: Record<string, unknown>;
  };
  /** 导入选项 */
  importOptions?: {
    /** 是否覆盖现有图 */
    overwrite?: boolean;
    /** 是否验证图结构 */
    validate?: boolean;
    /** 是否保留ID */
    preserveIds?: boolean;
  };
  /** 操作用户ID */
  userId?: string;
}

/**
 * 导出图命令
 */
export interface ExportGraphCommand {
  /** 图ID */
  graphId: string;
  /** 导出格式 */
  format?: 'json' | 'yaml' | 'xml' | 'dot';
  /** 导出选项 */
  exportOptions?: {
    /** 是否包含元数据 */
    includeMetadata?: boolean;
    /** 是否包含执行统计 */
    includeStatistics?: boolean;
    /** 是否压缩输出 */
    compress?: boolean;
  };
}
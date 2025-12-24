/**
 * 添加节点命令
 */
export interface AddNodeCommand {
  /** 工作流ID */
  workflowId: string;
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
  /** 工作流ID */
  workflowId: string;
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
  /** 工作流ID */
  workflowId: string;
  /** 节点ID */
  nodeId: string;
  /** 操作用户ID */
  userId?: string;
}

/**
 * 添加边命令
 */
export interface AddEdgeCommand {
  /** 工作流ID */
  workflowId: string;
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
  /** 工作流ID */
  workflowId: string;
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
  /** 工作流ID */
  workflowId: string;
  /** 边ID */
  edgeId: string;
  /** 操作用户ID */
  userId?: string;
}
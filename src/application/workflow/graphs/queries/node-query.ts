/**
 * 获取节点查询
 */
export interface GetNodeQuery {
  /** 图ID */
  graphId: string;
  /** 节点ID */
  nodeId: string;
  /** 是否包含输入输出连接 */
  includeConnections?: boolean;
  /** 是否包含执行历史 */
  includeExecutionHistory?: boolean;
}

/**
 * 列出节点查询
 */
export interface ListNodesQuery {
  /** 图ID */
  graphId: string;
  /** 过滤条件 */
  filters?: {
    /** 节点类型过滤 */
    nodeType?: string;
    /** 节点名称过滤 */
    nodeName?: string;
    /** 创建时间范围过滤 */
    createdAfter?: string;
    createdBefore?: string;
    /** 是否包含已删除的节点 */
    includeDeleted?: boolean;
  };
  /** 排序条件 */
  sortBy?: 'name' | 'type' | 'createdAt' | 'updatedAt';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 分页参数 */
  pagination?: {
    /** 页码 */
    page: number;
    /** 每页大小 */
    size: number;
  };
}

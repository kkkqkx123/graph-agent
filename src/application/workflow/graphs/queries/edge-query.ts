/**
 * 获取边查询
 */
export interface GetEdgeQuery {
  /** 图ID */
  graphId: string;
  /** 边ID */
  edgeId: string;
  /** 是否包含源节点和目标节点信息 */
  includeSourceAndTarget?: boolean;
}

/**
 * 列出边查询
 */
export interface ListEdgesQuery {
  /** 图ID */
  graphId: string;
  /** 过滤条件 */
  filters?: {
    /** 边类型过滤 */
    edgeType?: string;
    /** 源节点ID过滤 */
    fromNodeId?: string;
    /** 目标节点ID过滤 */
    toNodeId?: string;
    /** 创建时间范围过滤 */
    createdAfter?: string;
    createdBefore?: string;
    /** 是否包含已删除的边 */
    includeDeleted?: boolean;
  };
  /** 排序条件 */
  sortBy?: 'type' | 'weight' | 'createdAt' | 'updatedAt';
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

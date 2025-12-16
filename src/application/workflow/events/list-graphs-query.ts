/**
 * 列出图查询
 */
export interface ListGraphsQuery {
  /** 过滤条件 */
  filters?: {
    /** 名称过滤 */
    name?: string;
    /** 创建者过滤 */
    createdBy?: string;
    /** 创建时间范围过滤 */
    createdAfter?: string;
    createdBefore?: string;
    /** 最小节点数量 */
    minNodeCount?: number;
    /** 最大节点数量 */
    maxNodeCount?: number;
    /** 最小边数量 */
    minEdgeCount?: number;
    /** 最大边数量 */
    maxEdgeCount?: number;
    /** 是否包含已删除的图 */
    includeDeleted?: boolean;
  };
  /** 排序条件 */
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'nodeCount' | 'edgeCount';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 分页参数 */
  pagination?: {
    /** 页码 */
    page: number;
    /** 每页大小 */
    size: number;
  };
  /** 是否包含摘要信息 */
  includeSummary?: boolean;
}

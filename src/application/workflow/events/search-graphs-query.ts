/**
 * 搜索图查询
 */
export interface SearchGraphsQuery {
  /** 搜索关键词 */
  keyword: string;
  /** 搜索范围 */
  searchIn?: 'name' | 'description' | 'metadata' | 'all';
  /** 过滤条件 */
  filters?: {
    /** 创建者过滤 */
    createdBy?: string;
    /** 节点数量范围 */
    nodeCountRange?: {
      min?: number;
      max?: number;
    };
    /** 边数量范围 */
    edgeCountRange?: {
      min?: number;
      max?: number;
    };
  };
  /** 排序条件 */
  sortBy?: 'relevance' | 'name' | 'createdAt' | 'updatedAt' | 'nodeCount' | 'edgeCount';
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

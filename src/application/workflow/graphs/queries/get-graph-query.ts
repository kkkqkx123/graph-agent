/**
 * 获取图查询
 */
export interface GetGraphQuery {
  /** 图ID */
  graphId: string;
  /** 是否包含节点和边 */
  includeNodesAndEdges?: boolean;
  /** 是否包含统计信息 */
  includeStatistics?: boolean;
  /** 是否包含执行历史 */
  includeExecutionHistory?: boolean;
}

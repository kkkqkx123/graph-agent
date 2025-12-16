/**
 * 获取图统计信息查询
 */
export interface GetGraphStatisticsQuery {
  /** 图ID */
  graphId: string;
  /** 统计类型 */
  statisticsType?: 'basic' | 'detailed' | 'execution' | 'performance' | 'all';
}

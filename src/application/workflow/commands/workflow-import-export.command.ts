/**
 * 导入工作流命令
 */
export interface ImportWorkflowCommand {
  /** 工作流数据 */
  workflowData: {
    name: string;
    description?: string;
    nodes: any[];
    edges: any[];
    metadata?: Record<string, unknown>;
  };
  /** 导入选项 */
  importOptions?: {
    /** 是否覆盖现有工作流 */
    overwrite?: boolean;
    /** 是否验证工作流结构 */
    validate?: boolean;
    /** 是否保留ID */
    preserveIds?: boolean;
  };
  /** 操作用户ID */
  userId?: string;
}

/**
 * 导出工作流命令
 */
export interface ExportWorkflowCommand {
  /** 工作流ID */
  workflowId: string;
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
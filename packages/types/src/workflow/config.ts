/**
 * 工作流配置类型定义
 */

/**
 * 工具审批配置
 * 定义工作流中工具调用的审批策略
 */
export interface ToolApprovalConfig {
  /**
   * 自动批准的工具列表（白名单）
   * 工具ID或名称数组，这些工具调用无需人工审批
   */
  autoApprovedTools: string[];
}

/**
 * 检查点配置类型
 * 定义检查点的创建策略和行为
 */
export interface CheckpointConfig {
  /** 是否启用检查点（全局开关） */
  enabled?: boolean;
  /** 是否在节点执行前创建检查点（全局默认行为） */
  checkpointBeforeNode?: boolean;
  /** 是否在节点执行后创建检查点（全局默认行为） */
  checkpointAfterNode?: boolean;
}

/**
 * 触发子工作流专用配置类型
 * 定义triggered子工作流的特殊行为选项
 */
export interface TriggeredSubworkflowConfig {
  /** 是否启用检查点（默认false） */
  enableCheckpoints?: boolean;
  /** 检查点配置（如果enableCheckpoints为true） */
  checkpointConfig?: CheckpointConfig;
  /** 执行超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
}

/**
 * 工作流配置类型
 * 定义工作流执行时的行为选项
 */
export interface WorkflowConfig {
  /** 执行超时时间（毫秒） */
  timeout?: number;
  /** 最大执行步数 */
  maxSteps?: number;
  /** 是否启用检查点（保留向后兼容） */
  enableCheckpoints?: boolean;
  /** 检查点配置（新增） */
  checkpointConfig?: CheckpointConfig;
  /** 重试策略配置 */
  retryPolicy?: {
    maxRetries?: number;
    retryDelay?: number;
    backoffMultiplier?: number;
  };
  /** 工具审批配置 */
  toolApproval?: ToolApprovalConfig;
}
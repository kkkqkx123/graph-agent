/**
 * 核心API类型定义
 * 定义核心执行相关的类型
 */

/**
 * 执行选项
 * 注意：此类型与ThreadOptions功能重叠，建议未来直接使用ThreadOptions
 */
export interface ExecuteOptions {
  /** 输入数据 */
  input?: Record<string, any>;
  /** 最大执行步数 */
  maxSteps?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否启用检查点 */
  enableCheckpoints?: boolean;
  /** 节点执行回调 */
  onNodeExecuted?: (result: any) => void | Promise<void>;
  /** 错误回调 */
  onError?: (error: any) => void | Promise<void>;
}

/**
 * SDK配置选项
 */
export interface SDKOptions {
  /** 是否启用版本管理 */
  enableVersioning?: boolean;
  /** 最大版本数 */
  maxVersions?: number;
  /** 自定义WorkflowRegistry */
  workflowRegistry?: any;
  /** 自定义ThreadRegistry */
  threadRegistry?: any;
}
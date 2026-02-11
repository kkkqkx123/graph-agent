/**
 * 工作流引用检查相关类型定义
 */

/**
 * 工作流引用信息
 */
export interface WorkflowReference {
  /** 引用类型 */
  type: 'subgraph' | 'trigger' | 'thread';
  /** 引用源ID（父工作流ID、触发器ID、线程ID等） */
  sourceId: string;
  /** 引用源名称 */
  sourceName: string;
  /** 是否为运行时引用（活跃的线程或触发器） */
  isRuntimeReference: boolean;
  /** 引用详情 */
  details: Record<string, any>;
}

/**
 * 工作流引用检查结果
 */
export interface WorkflowReferenceInfo {
  /** 是否存在引用 */
  hasReferences: boolean;
  /** 所有引用列表 */
  references: WorkflowReference[];
  /** 是否可以安全删除（无运行时引用） */
  canSafelyDelete: boolean;
  /** 引用统计 */
  stats: {
    subgraphReferences: number;
    triggerReferences: number;
    threadReferences: number;
    runtimeReferences: number;
  };
}

/**
 * 工作流引用类型
 */
export type WorkflowReferenceType = 'subgraph' | 'trigger' | 'thread';

/**
 * 工作流引用关系
 */
export interface WorkflowReferenceRelation {
  /** 源工作流ID */
  sourceWorkflowId: string;
  /** 目标工作流ID */
  targetWorkflowId: string;
  /** 引用类型 */
  referenceType: WorkflowReferenceType;
  /** 是否为运行时引用 */
  isRuntime: boolean;
  /** 引用源ID（线程ID、触发器ID等） */
  sourceReferenceId?: string;
  /** 引用详情 */
  details?: Record<string, any>;
}
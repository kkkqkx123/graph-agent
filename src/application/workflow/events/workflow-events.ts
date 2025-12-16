/**
 * 工作流创建事件
 */
export interface WorkflowCreatedEvent {
  /** 事件类型 */
  type: 'workflow.created';
  /** 事件ID */
  eventId: string;
  /** 事件时间 */
  timestamp: Date;
  /** 工作流ID */
  workflowId: string;
  /** 工作流名称 */
  name: string;
  /** 工作流描述 */
  description?: string;
  /** 工作流类型 */
  workflowType: string;
  /** 工作流状态 */
  status: string;
  /** 工作流配置 */
  config: Record<string, unknown>;
  /** 图ID */
  graphId?: string;
  /** 创建者ID */
  createdBy?: string;
  /** 事件元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 工作流激活事件
 */
export interface WorkflowActivatedEvent {
  /** 事件类型 */
  type: 'workflow.activated';
  /** 事件ID */
  eventId: string;
  /** 事件时间 */
  timestamp: Date;
  /** 工作流ID */
  workflowId: string;
  /** 操作用户ID */
  userId?: string;
  /** 激活原因 */
  reason?: string;
  /** 事件元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 工作流停用事件
 */
export interface WorkflowDeactivatedEvent {
  /** 事件类型 */
  type: 'workflow.deactivated';
  /** 事件ID */
  eventId: string;
  /** 事件时间 */
  timestamp: Date;
  /** 工作流ID */
  workflowId: string;
  /** 操作用户ID */
  userId?: string;
  /** 停用原因 */
  reason?: string;
  /** 事件元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 工作流归档事件
 */
export interface WorkflowArchivedEvent {
  /** 事件类型 */
  type: 'workflow.archived';
  /** 事件ID */
  eventId: string;
  /** 事件时间 */
  timestamp: Date;
  /** 工作流ID */
  workflowId: string;
  /** 操作用户ID */
  userId?: string;
  /** 归档原因 */
  reason?: string;
  /** 事件元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 工作流更新事件
 */
export interface WorkflowUpdatedEvent {
  /** 事件类型 */
  type: 'workflow.updated';
  /** 事件ID */
  eventId: string;
  /** 事件时间 */
  timestamp: Date;
  /** 工作流ID */
  workflowId: string;
  /** 更新字段 */
  updatedFields: string[];
  /** 操作用户ID */
  userId?: string;
  /** 事件元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 工作流执行开始事件
 */
export interface WorkflowExecutionStartedEvent {
  /** 事件类型 */
  type: 'workflow.execution.started';
  /** 事件ID */
  eventId: string;
  /** 事件时间 */
  timestamp: Date;
  /** 工作流ID */
  workflowId: string;
  /** 执行ID */
  executionId: string;
  /** 输入数据 */
  inputData: Record<string, unknown>;
  /** 执行参数 */
  parameters: Record<string, unknown>;
  /** 执行模式 */
  executionMode: string;
  /** 执行优先级 */
  priority: string;
  /** 操作用户ID */
  userId?: string;
  /** 事件元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 工作流执行完成事件
 */
export interface WorkflowExecutionCompletedEvent {
  /** 事件类型 */
  type: 'workflow.execution.completed';
  /** 事件ID */
  eventId: string;
  /** 事件时间 */
  timestamp: Date;
  /** 工作流ID */
  workflowId: string;
  /** 执行ID */
  executionId: string;
  /** 执行结果 */
  result: {
    /** 输出数据 */
    output: Record<string, unknown>;
    /** 执行持续时间（毫秒） */
    duration: number;
    /** 执行统计信息 */
    statistics: {
      /** 执行节点数 */
      executedNodes: number;
      /** 总节点数 */
      totalNodes: number;
      /** 执行边数 */
      executedEdges: number;
      /** 总边数 */
      totalEdges: number;
      /** 执行路径 */
      executionPath: string[];
    };
  };
  /** 事件元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 工作流执行失败事件
 */
export interface WorkflowExecutionFailedEvent {
  /** 事件类型 */
  type: 'workflow.execution.failed';
  /** 事件ID */
  eventId: string;
  /** 事件时间 */
  timestamp: Date;
  /** 工作流ID */
  workflowId: string;
  /** 执行ID */
  executionId: string;
  /** 错误信息 */
  error: {
    /** 错误消息 */
    message: string;
    /** 错误类型 */
    type?: string;
    /** 错误堆栈 */
    stack?: string;
  };
  /** 执行持续时间（毫秒） */
  duration: number;
  /** 事件元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 工作流删除事件
 */
export interface WorkflowDeletedEvent {
  /** 事件类型 */
  type: 'workflow.deleted';
  /** 事件ID */
  eventId: string;
  /** 事件时间 */
  timestamp: Date;
  /** 工作流ID */
  workflowId: string;
  /** 工作流名称 */
  name: string;
  /** 操作用户ID */
  userId?: string;
  /** 删除原因 */
  reason?: string;
  /** 事件元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 工作流标签添加事件
 */
export interface WorkflowTagAddedEvent {
  /** 事件类型 */
  type: 'workflow.tag.added';
  /** 事件ID */
  eventId: string;
  /** 事件时间 */
  timestamp: Date;
  /** 工作流ID */
  workflowId: string;
  /** 标签 */
  tag: string;
  /** 操作用户ID */
  userId?: string;
  /** 事件元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 工作流标签移除事件
 */
export interface WorkflowTagRemovedEvent {
  /** 事件类型 */
  type: 'workflow.tag.removed';
  /** 事件ID */
  eventId: string;
  /** 事件时间 */
  timestamp: Date;
  /** 工作流ID */
  workflowId: string;
  /** 标签 */
  tag: string;
  /** 操作用户ID */
  userId?: string;
  /** 事件元数据 */
  metadata: Record<string, unknown>;
}
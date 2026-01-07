/**
 * 工作流异常基类
 */
export abstract class WorkflowError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(message: string, code: string, details?: Record<string, any>) {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
    this.details = details;
    
    // 修复原型链，确保instanceof正常工作
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 工作流未找到异常
 */
export class WorkflowNotFoundError extends WorkflowError {
  constructor(workflowId: string) {
    super(`工作流未找到: ${workflowId}`, 'WORKFLOW_NOT_FOUND', { workflowId });
  }
}

/**
 * 工作流已存在异常
 */
export class WorkflowAlreadyExistsError extends WorkflowError {
  constructor(name: string) {
    super(`工作流已存在: ${name}`, 'WORKFLOW_ALREADY_EXISTS', { name });
  }
}

/**
 * 工作流状态转换错误异常
 */
export class WorkflowStateTransitionError extends WorkflowError {
  constructor(workflowId: string, currentStatus: string, targetStatus: string, reason: string) {
    super(
      `工作流状态转换错误: ${workflowId} - 从 ${currentStatus} 到 ${targetStatus} - ${reason}`,
      'WORKFLOW_STATE_TRANSITION_ERROR',
      { workflowId, currentStatus, targetStatus, reason }
    );
  }
}

/**
 * 工作流验证失败异常
 */
export class WorkflowValidationError extends WorkflowError {
  constructor(workflowId: string, errors: string[]) {
    super(`工作流验证失败: ${workflowId} - ${errors.join(', ')}`, 'WORKFLOW_VALIDATION_ERROR', {
      workflowId,
      errors,
    });
  }
}

/**
 * 工作流配置错误异常
 */
export class WorkflowConfigurationError extends WorkflowError {
  constructor(workflowId: string, reason: string, details?: Record<string, any>) {
    super(`工作流配置错误: ${workflowId} - ${reason}`, 'WORKFLOW_CONFIGURATION_ERROR', {
      workflowId,
      reason,
      ...details,
    });
  }
}

/**
 * 工作流执行错误异常
 */
export class WorkflowExecutionError extends WorkflowError {
  constructor(workflowId: string, reason: string, details?: Record<string, any>) {
    super(`工作流执行错误: ${workflowId} - ${reason}`, 'WORKFLOW_EXECUTION_ERROR', {
      workflowId,
      reason,
      ...details,
    });
  }
}

/**
 * 工作流执行超时异常
 */
export class WorkflowExecutionTimeoutError extends WorkflowExecutionError {
  constructor(workflowId: string, timeout: number) {
    super(workflowId, `执行超时: ${timeout}ms`, { timeout });
  }
}

/**
 * 工作流执行被取消异常
 */
export class WorkflowExecutionCancelledError extends WorkflowExecutionError {
  constructor(workflowId: string, reason?: string) {
    super(workflowId, reason || '执行被取消', { reason });
  }
}

/**
 * 工作流无起始节点异常
 */
export class WorkflowNoStartNodeError extends WorkflowExecutionError {
  constructor(workflowId: string) {
    super(workflowId, '工作流没有起始节点', {});
  }
}

/**
 * 工作流删除错误异常
 */
export class WorkflowDeletionError extends WorkflowError {
  constructor(workflowId: string, reason: string) {
    super(`工作流删除错误: ${workflowId} - ${reason}`, 'WORKFLOW_DELETION_ERROR', {
      workflowId,
      reason,
    });
  }
}

/**
 * 工作流编辑错误异常
 */
export class WorkflowEditError extends WorkflowError {
  constructor(workflowId: string, reason: string) {
    super(`工作流编辑错误: ${workflowId} - ${reason}`, 'WORKFLOW_EDIT_ERROR', {
      workflowId,
      reason,
    });
  }
}

/**
 * 工作流归档错误异常
 */
export class WorkflowArchiveError extends WorkflowError {
  constructor(workflowId: string, reason: string) {
    super(`工作流归档错误: ${workflowId} - ${reason}`, 'WORKFLOW_ARCHIVE_ERROR', {
      workflowId,
      reason,
    });
  }
}
/**
 * 线程异常基类
 */
export abstract class ThreadError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(message: string, code: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ThreadError';
    this.code = code;
    this.details = details;
    
    // 修复原型链，确保instanceof正常工作
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 线程未找到异常
 */
export class ThreadNotFoundError extends ThreadError {
  constructor(threadId: string) {
    super(`线程未找到: ${threadId}`, 'THREAD_NOT_FOUND', { threadId });
  }
}

/**
 * 线程已存在异常
 */
export class ThreadAlreadyExistsError extends ThreadError {
  constructor(threadId: string, sessionId: string) {
    super(`线程已存在: ${threadId} (会话: ${sessionId})`, 'THREAD_ALREADY_EXISTS', {
      threadId,
      sessionId,
    });
  }
}

/**
 * 线程状态转换错误异常
 */
export class ThreadStateTransitionError extends ThreadError {
  constructor(threadId: string, currentStatus: string, targetStatus: string, reason: string) {
    super(
      `线程状态转换错误: ${threadId} - 从 ${currentStatus} 到 ${targetStatus} - ${reason}`,
      'THREAD_STATE_TRANSITION_ERROR',
      { threadId, currentStatus, targetStatus, reason }
    );
  }
}

/**
 * 线程验证失败异常
 */
export class ThreadValidationError extends ThreadError {
  constructor(threadId: string, errors: string[]) {
    super(`线程验证失败: ${threadId} - ${errors.join(', ')}`, 'THREAD_VALIDATION_ERROR', {
      threadId,
      errors,
    });
  }
}

/**
 * 线程配置错误异常
 */
export class ThreadConfigurationError extends ThreadError {
  constructor(threadId: string, reason: string, details?: Record<string, any>) {
    super(`线程配置错误: ${threadId} - ${reason}`, 'THREAD_CONFIGURATION_ERROR', {
      threadId,
      reason,
      ...details,
    });
  }
}

/**
 * 线程执行错误异常
 */
export class ThreadExecutionError extends ThreadError {
  constructor(threadId: string, reason: string, details?: Record<string, any>) {
    super(`线程执行错误: ${threadId} - ${reason}`, 'THREAD_EXECUTION_ERROR', {
      threadId,
      reason,
      ...details,
    });
  }
}

/**
 * 线程执行失败异常
 */
export class ThreadExecutionFailedError extends ThreadExecutionError {
  constructor(threadId: string, errorMessage: string) {
    super(threadId, `执行失败: ${errorMessage}`, { errorMessage });
  }
}

/**
 * 线程执行超时异常
 */
export class ThreadExecutionTimeoutError extends ThreadExecutionError {
  constructor(threadId: string, timeout: number) {
    super(threadId, `执行超时: ${timeout}ms`, { timeout });
  }
}

/**
 * 线程执行被取消异常
 */
export class ThreadExecutionCancelledError extends ThreadExecutionError {
  constructor(threadId: string, reason?: string) {
    super(threadId, reason || '执行被取消', { reason });
  }
}

/**
 * 线程删除错误异常
 */
export class ThreadDeletionError extends ThreadError {
  constructor(threadId: string, reason: string) {
    super(`线程删除错误: ${threadId} - ${reason}`, 'THREAD_DELETION_ERROR', {
      threadId,
      reason,
    });
  }
}

/**
 * 线程重试错误异常
 */
export class ThreadRetryError extends ThreadError {
  constructor(threadId: string, reason: string) {
    super(`线程重试错误: ${threadId} - ${reason}`, 'THREAD_RETRY_ERROR', {
      threadId,
      reason,
    });
  }
}

/**
 * 线程优先级更新错误异常
 */
export class ThreadPriorityUpdateError extends ThreadError {
  constructor(threadId: string, reason: string) {
    super(`线程优先级更新错误: ${threadId} - ${reason}`, 'THREAD_PRIORITY_UPDATE_ERROR', {
      threadId,
      reason,
    });
  }
}

/**
 * 线程进度更新错误异常
 */
export class ThreadProgressUpdateError extends ThreadError {
  constructor(threadId: string, reason: string) {
    super(`线程进度更新错误: ${threadId} - ${reason}`, 'THREAD_PROGRESS_UPDATE_ERROR', {
      threadId,
      reason,
    });
  }
}

/**
 * 线程状态不存在异常
 */
export class ThreadStateNotFoundError extends ThreadError {
  constructor(threadId: string) {
    super(`线程状态不存在: ${threadId}`, 'THREAD_STATE_NOT_FOUND', { threadId });
  }
}

/**
 * 线程工作流未找到异常
 */
export class ThreadWorkflowNotFoundError extends ThreadError {
  constructor(threadId: string, workflowId: string) {
    super(`线程工作流未找到: ${threadId} - ${workflowId}`, 'THREAD_WORKFLOW_NOT_FOUND', {
      threadId,
      workflowId,
    });
  }
}

/**
 * 线程检查点未找到异常
 */
export class ThreadCheckpointNotFoundError extends ThreadError {
  constructor(threadId: string, checkpointId: string) {
    super(`线程检查点未找到: ${threadId} - ${checkpointId}`, 'THREAD_CHECKPOINT_NOT_FOUND', {
      threadId,
      checkpointId,
    });
  }
}

/**
 * 线程恢复错误异常
 */
export class ThreadRecoveryError extends ThreadError {
  constructor(threadId: string, reason: string) {
    super(`线程恢复错误: ${threadId} - ${reason}`, 'THREAD_RECOVERY_ERROR', {
      threadId,
      reason,
    });
  }
}

/**
 * 线程Fork错误异常
 */
export class ThreadForkError extends ThreadError {
  constructor(threadId: string, reason: string) {
    super(`线程Fork错误: ${threadId} - ${reason}`, 'THREAD_FORK_ERROR', {
      threadId,
      reason,
    });
  }
}

/**
 * 线程Copy错误异常
 */
export class ThreadCopyError extends ThreadError {
  constructor(threadId: string, reason: string) {
    super(`线程Copy错误: ${threadId} - ${reason}`, 'THREAD_COPY_ERROR', {
      threadId,
      reason,
    });
  }
}
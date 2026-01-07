/**
 * 会话异常基类
 */
export abstract class SessionError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(message: string, code: string, details?: Record<string, any>) {
    super(message);
    this.name = 'SessionError';
    this.code = code;
    this.details = details;
    
    // 修复原型链，确保instanceof正常工作
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 会话未找到异常
 */
export class SessionNotFoundError extends SessionError {
  constructor(sessionId: string) {
    super(`会话未找到: ${sessionId}`, 'SESSION_NOT_FOUND', { sessionId });
  }
}

/**
 * 会话已存在异常
 */
export class SessionAlreadyExistsError extends SessionError {
  constructor(sessionId: string) {
    super(`会话已存在: ${sessionId}`, 'SESSION_ALREADY_EXISTS', { sessionId });
  }
}

/**
 * 会话状态转换错误异常
 */
export class SessionStateTransitionError extends SessionError {
  constructor(sessionId: string, currentStatus: string, targetStatus: string, reason: string) {
    super(
      `会话状态转换错误: ${sessionId} - 从 ${currentStatus} 到 ${targetStatus} - ${reason}`,
      'SESSION_STATE_TRANSITION_ERROR',
      { sessionId, currentStatus, targetStatus, reason }
    );
  }
}

/**
 * 会话验证失败异常
 */
export class SessionValidationError extends SessionError {
  constructor(sessionId: string, errors: string[]) {
    super(`会话验证失败: ${sessionId} - ${errors.join(', ')}`, 'SESSION_VALIDATION_ERROR', {
      sessionId,
      errors,
    });
  }
}

/**
 * 会话配置错误异常
 */
export class SessionConfigurationError extends SessionError {
  constructor(sessionId: string, reason: string, details?: Record<string, any>) {
    super(`会话配置错误: ${sessionId} - ${reason}`, 'SESSION_CONFIGURATION_ERROR', {
      sessionId,
      reason,
      ...details,
    });
  }
}

/**
 * 会话删除错误异常
 */
export class SessionDeletionError extends SessionError {
  constructor(sessionId: string, reason: string) {
    super(`会话删除错误: ${sessionId} - ${reason}`, 'SESSION_DELETION_ERROR', {
      sessionId,
      reason,
    });
  }
}

/**
 * 会话线程数量超限异常
 */
export class SessionThreadLimitExceededError extends SessionError {
  constructor(sessionId: string, currentCount: number, maxCount: number) {
    super(
      `会话线程数量超限: ${sessionId} - 当前: ${currentCount}, 最大: ${maxCount}`,
      'SESSION_THREAD_LIMIT_EXCEEDED',
      { sessionId, currentCount, maxCount }
    );
  }
}

/**
 * 会话线程未找到异常
 */
export class SessionThreadNotFoundError extends SessionError {
  constructor(sessionId: string, threadId: string) {
    super(`会话线程未找到: ${sessionId} - ${threadId}`, 'SESSION_THREAD_NOT_FOUND', {
      sessionId,
      threadId,
    });
  }
}

/**
 * 会话线程创建错误异常
 */
export class SessionThreadCreationError extends SessionError {
  constructor(sessionId: string, reason: string) {
    super(`会话线程创建错误: ${sessionId} - ${reason}`, 'SESSION_THREAD_CREATION_ERROR', {
      sessionId,
      reason,
    });
  }
}

/**
 * 会话线程删除错误异常
 */
export class SessionThreadDeletionError extends SessionError {
  constructor(sessionId: string, threadId: string, reason: string) {
    super(
      `会话线程删除错误: ${sessionId} - ${threadId} - ${reason}`,
      'SESSION_THREAD_DELETION_ERROR',
      { sessionId, threadId, reason }
    );
  }
}

/**
 * 会话消息添加错误异常
 */
export class SessionMessageAddError extends SessionError {
  constructor(sessionId: string, reason: string) {
    super(`会话消息添加错误: ${sessionId} - ${reason}`, 'SESSION_MESSAGE_ADD_ERROR', {
      sessionId,
      reason,
    });
  }
}

/**
 * 会话线程通信错误异常
 */
export class SessionThreadCommunicationError extends SessionError {
  constructor(sessionId: string, fromThreadId: string, toThreadId: string, reason: string) {
    super(
      `会话线程通信错误: ${sessionId} - ${fromThreadId} -> ${toThreadId} - ${reason}`,
      'SESSION_THREAD_COMMUNICATION_ERROR',
      { sessionId, fromThreadId, toThreadId, reason }
    );
  }
}

/**
 * 会话资源不足异常
 */
export class SessionResourceInsufficientError extends SessionError {
  constructor(sessionId: string, resourceType: string, required: number, available: number) {
    super(
      `会话资源不足: ${sessionId} - ${resourceType} - 需要: ${required}, 可用: ${available}`,
      'SESSION_RESOURCE_INSUFFICIENT',
      { sessionId, resourceType, required, available }
    );
  }
}

/**
 * 会话内存超限异常
 */
export class SessionMemoryLimitExceededError extends SessionResourceInsufficientError {
  constructor(sessionId: string, required: number, maxMemory: number) {
    super(sessionId, 'memory', required, maxMemory);
  }
}

/**
 * 会话权限错误异常
 */
export class SessionPermissionError extends SessionError {
  constructor(sessionId: string, userId: string, reason: string) {
    super(`会话权限错误: ${sessionId} - 用户: ${userId} - ${reason}`, 'SESSION_PERMISSION_ERROR', {
      sessionId,
      userId,
      reason,
    });
  }
}

/**
 * 会话Fork错误异常
 */
export class SessionForkError extends SessionError {
  constructor(sessionId: string, reason: string) {
    super(`会话Fork错误: ${sessionId} - ${reason}`, 'SESSION_FORK_ERROR', {
      sessionId,
      reason,
    });
  }
}

/**
 * 会话Copy错误异常
 */
export class SessionCopyError extends SessionError {
  constructor(sessionId: string, reason: string) {
    super(`会话Copy错误: ${sessionId} - ${reason}`, 'SESSION_COPY_ERROR', {
      sessionId,
      reason,
    });
  }
}

/**
 * 会话统计信息获取错误异常
 */
export class SessionStatisticsError extends SessionError {
  constructor(sessionId: string, reason: string) {
    super(`会话统计信息获取错误: ${sessionId} - ${reason}`, 'SESSION_STATISTICS_ERROR', {
      sessionId,
      reason,
    });
  }
}

/**
 * 会话监控错误异常
 */
export class SessionMonitoringError extends SessionError {
  constructor(sessionId: string, reason: string) {
    super(`会话监控错误: ${sessionId} - ${reason}`, 'SESSION_MONITORING_ERROR', {
      sessionId,
      reason,
    });
  }
}

/**
 * 会话维护错误异常
 */
export class SessionMaintenanceError extends SessionError {
  constructor(sessionId: string, reason: string) {
    super(`会话维护错误: ${sessionId} - ${reason}`, 'SESSION_MAINTENANCE_ERROR', {
      sessionId,
      reason,
    });
  }
}
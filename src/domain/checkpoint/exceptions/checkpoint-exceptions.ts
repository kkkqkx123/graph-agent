/**
 * 检查点异常基类
 */
export abstract class CheckpointError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(message: string, code: string, details?: Record<string, any>) {
    super(message);
    this.name = 'CheckpointError';
    this.code = code;
    this.details = details;
    
    // 修复原型链，确保instanceof正常工作
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 检查点未找到异常
 */
export class CheckpointNotFoundError extends CheckpointError {
  constructor(checkpointId: string) {
    super(`检查点未找到: ${checkpointId}`, 'CHECKPOINT_NOT_FOUND', { checkpointId });
  }
}

/**
 * 检查点已存在异常
 */
export class CheckpointAlreadyExistsError extends CheckpointError {
  constructor(checkpointId: string) {
    super(`检查点已存在: ${checkpointId}`, 'CHECKPOINT_ALREADY_EXISTS', { checkpointId });
  }
}

/**
 * 检查点验证失败异常
 */
export class CheckpointValidationError extends CheckpointError {
  constructor(checkpointId: string, errors: string[]) {
    super(`检查点验证失败: ${checkpointId} - ${errors.join(', ')}`, 'CHECKPOINT_VALIDATION_ERROR', {
      checkpointId,
      errors,
    });
  }
}

/**
 * 检查点配置错误异常
 */
export class CheckpointConfigurationError extends CheckpointError {
  constructor(checkpointId: string, reason: string, details?: Record<string, any>) {
    super(`检查点配置错误: ${checkpointId} - ${reason}`, 'CHECKPOINT_CONFIGURATION_ERROR', {
      checkpointId,
      reason,
      ...details,
    });
  }
}

/**
 * 检查点创建错误异常
 */
export class CheckpointCreationError extends CheckpointError {
  constructor(threadId: string, reason: string) {
    super(`检查点创建错误: ${threadId} - ${reason}`, 'CHECKPOINT_CREATION_ERROR', {
      threadId,
      reason,
    });
  }
}

/**
 * 检查点删除错误异常
 */
export class CheckpointDeletionError extends CheckpointError {
  constructor(checkpointId: string, reason: string) {
    super(`检查点删除错误: ${checkpointId} - ${reason}`, 'CHECKPOINT_DELETION_ERROR', {
      checkpointId,
      reason,
    });
  }
}

/**
 * 检查点恢复错误异常
 */
export class CheckpointRestoreError extends CheckpointError {
  constructor(checkpointId: string, reason: string) {
    super(`检查点恢复错误: ${checkpointId} - ${reason}`, 'CHECKPOINT_RESTORE_ERROR', {
      checkpointId,
      reason,
    });
  }
}

/**
 * 检查点不可恢复异常
 */
export class CheckpointCannotRestoreError extends CheckpointRestoreError {
  constructor(checkpointId: string, reason: string) {
    super(checkpointId, `检查点不可恢复: ${reason}`);
  }
}

/**
 * 检查点已删除异常
 */
export class CheckpointAlreadyDeletedError extends CheckpointError {
  constructor(checkpointId: string) {
    super(`检查点已删除: ${checkpointId}`, 'CHECKPOINT_ALREADY_DELETED', { checkpointId });
  }
}

/**
 * 检查点过期异常
 */
export class CheckpointExpiredError extends CheckpointError {
  constructor(checkpointId: string, expiredAt: Date) {
    super(
      `检查点已过期: ${checkpointId} - 过期时间: ${expiredAt.toISOString()}`,
      'CHECKPOINT_EXPIRED',
      { checkpointId, expiredAt }
    );
  }
}

/**
 * 检查点数据解析失败异常
 */
export class CheckpointDataParseError extends CheckpointError {
  constructor(checkpointId: string, reason: string) {
    super(`检查点数据解析失败: ${checkpointId} - ${reason}`, 'CHECKPOINT_DATA_PARSE_ERROR', {
      checkpointId,
      reason,
    });
  }
}

/**
 * 检查点数据序列化失败异常
 */
export class CheckpointDataSerializeError extends CheckpointError {
  constructor(checkpointId: string, reason: string) {
    super(`检查点数据序列化失败: ${checkpointId} - ${reason}`, 'CHECKPOINT_DATA_SERIALIZE_ERROR', {
      checkpointId,
      reason,
    });
  }
}

/**
 * 检查点类型不支持异常
 */
export class CheckpointTypeNotSupportedError extends CheckpointError {
  constructor(checkpointId: string, checkpointType: string) {
    super(`检查点类型不支持: ${checkpointId} - ${checkpointType}`, 'CHECKPOINT_TYPE_NOT_SUPPORTED', {
      checkpointId,
      checkpointType,
    });
  }
}

/**
 * 检查点线程不匹配异常
 */
export class CheckpointThreadMismatchError extends CheckpointError {
  constructor(checkpointId: string, checkpointThreadId: string, targetThreadId: string) {
    super(
      `检查点线程不匹配: ${checkpointId} - 检查点线程: ${checkpointThreadId}, 目标线程: ${targetThreadId}`,
      'CHECKPOINT_THREAD_MISMATCH',
      { checkpointId, checkpointThreadId, targetThreadId }
    );
  }
}

/**
 * 检查点批量删除错误异常
 */
export class CheckpointBatchDeletionError extends CheckpointError {
  constructor(reason: string, failedCount: number, totalCount: number) {
    super(
      `检查点批量删除错误: ${reason} - 失败: ${failedCount}/${totalCount}`,
      'CHECKPOINT_BATCH_DELETION_ERROR',
      { reason, failedCount, totalCount }
    );
  }
}

/**
 * 检查点清理错误异常
 */
export class CheckpointCleanupError extends CheckpointError {
  constructor(reason: string) {
    super(`检查点清理错误: ${reason}`, 'CHECKPOINT_CLEANUP_ERROR', { reason });
  }
}

/**
 * 检查点统计信息获取错误异常
 */
export class CheckpointStatisticsError extends CheckpointError {
  constructor(reason: string) {
    super(`检查点统计信息获取错误: ${reason}`, 'CHECKPOINT_STATISTICS_ERROR', { reason });
  }
}

/**
 * 错误检查点描述缺失异常
 */
export class ErrorCheckpointDescriptionMissingError extends CheckpointValidationError {
  constructor(checkpointId: string) {
    super(checkpointId, ['错误检查点必须有描述']);
  }
}
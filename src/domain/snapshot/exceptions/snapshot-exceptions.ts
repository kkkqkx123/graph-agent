/**
 * Snapshot模块异常定义
 *
 * 提供快照相关的异常类
 */

/**
 * Snapshot异常基类
 */
export class SnapshotError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'SnapshotError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照创建失败异常
 */
export class SnapshotCreationError extends SnapshotError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super(`快照创建失败: ${reason}`, 'SNAPSHOT_CREATION_FAILED', details);
    this.name = 'SnapshotCreationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照范围验证失败异常
 */
export class SnapshotScopeValidationError extends SnapshotError {
  constructor(scope: string, reason: string, details?: Record<string, unknown>) {
    super(`快照范围验证失败 [${scope}]: ${reason}`, 'SNAPSHOT_SCOPE_VALIDATION_FAILED', {
      scope,
      ...details,
    });
    this.name = 'SnapshotScopeValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照目标ID验证失败异常
 */
export class SnapshotTargetIdError extends SnapshotError {
  constructor(scope: string, reason: string, details?: Record<string, unknown>) {
    super(`快照目标ID验证失败 [${scope}]: ${reason}`, 'SNAPSHOT_TARGET_ID_INVALID', {
      scope,
      ...details,
    });
    this.name = 'SnapshotTargetIdError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照类型验证失败异常
 */
export class SnapshotTypeError extends SnapshotError {
  constructor(type: string, reason: string, details?: Record<string, unknown>) {
    super(`快照类型验证失败 [${type}]: ${reason}`, 'SNAPSHOT_TYPE_INVALID', { type, ...details });
    this.name = 'SnapshotTypeError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照状态数据验证失败异常
 */
export class SnapshotStateDataError extends SnapshotError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super(`快照状态数据验证失败: ${reason}`, 'SNAPSHOT_STATE_DATA_INVALID', details);
    this.name = 'SnapshotStateDataError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照状态数据为空异常
 */
export class SnapshotStateDataEmptyError extends SnapshotError {
  constructor(details?: Record<string, unknown>) {
    super('快照状态数据不能为空', 'SNAPSHOT_STATE_DATA_EMPTY', details);
    this.name = 'SnapshotStateDataEmptyError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照更新失败异常
 */
export class SnapshotUpdateError extends SnapshotError {
  constructor(snapshotId: string, reason: string, details?: Record<string, unknown>) {
    super(`快照更新失败 [${snapshotId}]: ${reason}`, 'SNAPSHOT_UPDATE_FAILED', { snapshotId, ...details });
    this.name = 'SnapshotUpdateError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照删除失败异常
 */
export class SnapshotDeletionError extends SnapshotError {
  constructor(snapshotId: string, reason: string, details?: Record<string, unknown>) {
    super(`快照删除失败 [${snapshotId}]: ${reason}`, 'SNAPSHOT_DELETION_FAILED', { snapshotId, ...details });
    this.name = 'SnapshotDeletionError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照未找到异常
 */
export class SnapshotNotFoundError extends SnapshotError {
  constructor(snapshotId: string, details?: Record<string, unknown>) {
    super(`快照未找到: ${snapshotId}`, 'SNAPSHOT_NOT_FOUND', { snapshotId, ...details });
    this.name = 'SnapshotNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照已删除异常
 */
export class SnapshotAlreadyDeletedError extends SnapshotError {
  constructor(snapshotId: string, details?: Record<string, unknown>) {
    super(`快照已删除: ${snapshotId}`, 'SNAPSHOT_ALREADY_DELETED', { snapshotId, ...details });
    this.name = 'SnapshotAlreadyDeletedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照恢复失败异常
 */
export class SnapshotRestoreError extends SnapshotError {
  constructor(snapshotId: string, reason: string, details?: Record<string, unknown>) {
    super(`快照恢复失败 [${snapshotId}]: ${reason}`, 'SNAPSHOT_RESTORE_FAILED', { snapshotId, ...details });
    this.name = 'SnapshotRestoreError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照无效异常
 */
export class SnapshotInvalidError extends SnapshotError {
  constructor(snapshotId: string, reason: string, details?: Record<string, unknown>) {
    super(`快照无效 [${snapshotId}]: ${reason}`, 'SNAPSHOT_INVALID', { snapshotId, ...details });
    this.name = 'SnapshotInvalidError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照无法恢复异常
 */
export class SnapshotCannotRestoreError extends SnapshotError {
  constructor(snapshotId: string, reason: string, details?: Record<string, unknown>) {
    super(`快照无法恢复 [${snapshotId}]: ${reason}`, 'SNAPSHOT_CANNOT_RESTORE', { snapshotId, ...details });
    this.name = 'SnapshotCannotRestoreError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照查询失败异常
 */
export class SnapshotQueryError extends SnapshotError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super(`快照查询失败: ${reason}`, 'SNAPSHOT_QUERY_FAILED', details);
    this.name = 'SnapshotQueryError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照清理失败异常
 */
export class SnapshotCleanupError extends SnapshotError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super(`快照清理失败: ${reason}`, 'SNAPSHOT_CLEANUP_FAILED', details);
    this.name = 'SnapshotCleanupError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照统计失败异常
 */
export class SnapshotStatisticsError extends SnapshotError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super(`快照统计失败: ${reason}`, 'SNAPSHOT_STATISTICS_FAILED', details);
    this.name = 'SnapshotStatisticsError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照大小超限异常
 */
export class SnapshotSizeLimitError extends SnapshotError {
  constructor(actualSize: number, maxSize: number, details?: Record<string, unknown>) {
    super(
      `快照大小超限: 实际 ${actualSize} 字节，最大允许 ${maxSize} 字节`,
      'SNAPSHOT_SIZE_LIMIT_EXCEEDED',
      { actualSize, maxSize, ...details }
    );
    this.name = 'SnapshotSizeLimitError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照元数据操作失败异常
 */
export class SnapshotMetadataError extends SnapshotError {
  constructor(snapshotId: string, operation: string, reason: string, details?: Record<string, unknown>) {
    super(
      `快照元数据操作失败 [${snapshotId}]: ${operation} - ${reason}`,
      'SNAPSHOT_METADATA_OPERATION_FAILED',
      { snapshotId, operation, ...details }
    );
    this.name = 'SnapshotMetadataError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照状态数据操作失败异常
 */
export class SnapshotStateDataOperationError extends SnapshotError {
  constructor(snapshotId: string, operation: string, reason: string, details?: Record<string, unknown>) {
    super(
      `快照状态数据操作失败 [${snapshotId}]: ${operation} - ${reason}`,
      'SNAPSHOT_STATE_DATA_OPERATION_FAILED',
      { snapshotId, operation, ...details }
    );
    this.name = 'SnapshotStateDataOperationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照不变性验证失败异常
 */
export class SnapshotInvariantError extends SnapshotError {
  constructor(snapshotId: string, invariant: string, reason: string, details?: Record<string, unknown>) {
    super(
      `快照不变性验证失败 [${snapshotId}]: ${invariant} - ${reason}`,
      'SNAPSHOT_INVARIANT_VIOLATION',
      { snapshotId, invariant, ...details }
    );
    this.name = 'SnapshotInvariantError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照存储失败异常
 */
export class SnapshotStorageError extends SnapshotError {
  constructor(operation: string, reason: string, details?: Record<string, unknown>) {
    super(`快照存储失败: ${operation} - ${reason}`, 'SNAPSHOT_STORAGE_FAILED', { operation, ...details });
    this.name = 'SnapshotStorageError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照序列化失败异常
 */
export class SnapshotSerializationError extends SnapshotError {
  constructor(snapshotId: string, reason: string, details?: Record<string, unknown>) {
    super(`快照序列化失败 [${snapshotId}]: ${reason}`, 'SNAPSHOT_SERIALIZATION_FAILED', {
      snapshotId,
      ...details,
    });
    this.name = 'SnapshotSerializationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照反序列化失败异常
 */
export class SnapshotDeserializationError extends SnapshotError {
  constructor(data: string, reason: string, details?: Record<string, unknown>) {
    super(`快照反序列化失败: ${reason}`, 'SNAPSHOT_DESERIALIZATION_FAILED', { data, ...details });
    this.name = 'SnapshotDeserializationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照恢复统计失败异常
 */
export class SnapshotRestoreStatisticsError extends SnapshotError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super(`快照恢复统计失败: ${reason}`, 'SNAPSHOT_RESTORE_STATISTICS_FAILED', details);
    this.name = 'SnapshotRestoreStatisticsError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照时间范围无效异常
 */
export class SnapshotTimeRangeError extends SnapshotError {
  constructor(startTime: Date, endTime: Date, reason: string, details?: Record<string, unknown>) {
    super(
      `快照时间范围无效 [${startTime.toISOString()} - ${endTime.toISOString()}]: ${reason}`,
      'SNAPSHOT_TIME_RANGE_INVALID',
      { startTime, endTime, ...details }
    );
    this.name = 'SnapshotTimeRangeError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 快照年龄超限异常
 */
export class SnapshotAgeLimitError extends SnapshotError {
  constructor(snapshotId: string, age: number, maxAge: number, unit: string, details?: Record<string, unknown>) {
    super(
      `快照年龄超限 [${snapshotId}]: 实际 ${age} ${unit}，最大允许 ${maxAge} ${unit}`,
      'SNAPSHOT_AGE_LIMIT_EXCEEDED',
      { snapshotId, age, maxAge, unit, ...details }
    );
    this.name = 'SnapshotAgeLimitError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
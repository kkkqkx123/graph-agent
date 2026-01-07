/**
 * History模块异常定义
 *
 * 提供历史记录相关的异常类
 */

/**
 * History异常基类
 */
export class HistoryError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'HistoryError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 历史记录创建失败异常
 */
export class HistoryCreationError extends HistoryError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super(`历史记录创建失败: ${reason}`, 'HISTORY_CREATION_FAILED', details);
    this.name = 'HistoryCreationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 历史记录更新失败异常
 */
export class HistoryUpdateError extends HistoryError {
  constructor(historyId: string, reason: string, details?: Record<string, unknown>) {
    super(`历史记录更新失败 [${historyId}]: ${reason}`, 'HISTORY_UPDATE_FAILED', {
      historyId,
      ...details,
    });
    this.name = 'HistoryUpdateError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 历史记录删除失败异常
 */
export class HistoryDeletionError extends HistoryError {
  constructor(historyId: string, reason: string, details?: Record<string, unknown>) {
    super(`历史记录删除失败 [${historyId}]: ${reason}`, 'HISTORY_DELETION_FAILED', {
      historyId,
      ...details,
    });
    this.name = 'HistoryDeletionError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 历史记录查询失败异常
 */
export class HistoryQueryError extends HistoryError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super(`历史记录查询失败: ${reason}`, 'HISTORY_QUERY_FAILED', details);
    this.name = 'HistoryQueryError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 历史记录未找到异常
 */
export class HistoryNotFoundError extends HistoryError {
  constructor(historyId: string, details?: Record<string, unknown>) {
    super(`历史记录未找到: ${historyId}`, 'HISTORY_NOT_FOUND', { historyId, ...details });
    this.name = 'HistoryNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 历史记录已删除异常
 */
export class HistoryAlreadyDeletedError extends HistoryError {
  constructor(historyId: string, details?: Record<string, unknown>) {
    super(`历史记录已删除: ${historyId}`, 'HISTORY_ALREADY_DELETED', { historyId, ...details });
    this.name = 'HistoryAlreadyDeletedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 历史记录归档失败异常
 */
export class HistoryArchiveError extends HistoryError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super(`历史记录归档失败: ${reason}`, 'HISTORY_ARCHIVE_FAILED', details);
    this.name = 'HistoryArchiveError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 历史记录搜索失败异常
 */
export class HistorySearchError extends HistoryError {
  constructor(query: string, reason: string, details?: Record<string, unknown>) {
    super(`历史记录搜索失败 [${query}]: ${reason}`, 'HISTORY_SEARCH_FAILED', {
      query,
      ...details,
    });
    this.name = 'HistorySearchError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 历史记录统计失败异常
 */
export class HistoryStatisticsError extends HistoryError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super(`历史记录统计失败: ${reason}`, 'HISTORY_STATISTICS_FAILED', details);
    this.name = 'HistoryStatisticsError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 历史记录清理失败异常
 */
export class HistoryCleanupError extends HistoryError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super(`历史记录清理失败: ${reason}`, 'HISTORY_CLEANUP_FAILED', details);
    this.name = 'HistoryCleanupError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 历史类型验证失败异常
 */
export class HistoryTypeValidationError extends HistoryError {
  constructor(type: string, reason: string, details?: Record<string, unknown>) {
    super(`历史类型验证失败 [${type}]: ${reason}`, 'HISTORY_TYPE_VALIDATION_FAILED', {
      type,
      ...details,
    });
    this.name = 'HistoryTypeValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 历史详情验证失败异常
 */
export class HistoryDetailsValidationError extends HistoryError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super(`历史详情验证失败: ${reason}`, 'HISTORY_DETAILS_VALIDATION_FAILED', details);
    this.name = 'HistoryDetailsValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 历史记录时间范围无效异常
 */
export class HistoryTimeRangeError extends HistoryError {
  constructor(startTime: Date, endTime: Date, reason: string, details?: Record<string, unknown>) {
    super(
      `历史记录时间范围无效 [${startTime.toISOString()} - ${endTime.toISOString()}]: ${reason}`,
      'HISTORY_TIME_RANGE_INVALID',
      { startTime, endTime, ...details }
    );
    this.name = 'HistoryTimeRangeError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 历史记录关联实体无效异常
 */
export class HistoryEntityError extends HistoryError {
  constructor(entityType: string, entityId: string, reason: string, details?: Record<string, unknown>) {
    super(
      `历史记录关联实体无效 [${entityType}:${entityId}]: ${reason}`,
      'HISTORY_ENTITY_INVALID',
      { entityType, entityId, ...details }
    );
    this.name = 'HistoryEntityError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 历史记录元数据操作失败异常
 */
export class HistoryMetadataError extends HistoryError {
  constructor(historyId: string, operation: string, reason: string, details?: Record<string, unknown>) {
    super(
      `历史记录元数据操作失败 [${historyId}]: ${operation} - ${reason}`,
      'HISTORY_METADATA_OPERATION_FAILED',
      { historyId, operation, ...details }
    );
    this.name = 'HistoryMetadataError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 历史记录详情操作失败异常
 */
export class HistoryDetailsOperationError extends HistoryError {
  constructor(historyId: string, operation: string, reason: string, details?: Record<string, unknown>) {
    super(
      `历史记录详情操作失败 [${historyId}]: ${operation} - ${reason}`,
      'HISTORY_DETAILS_OPERATION_FAILED',
      { historyId, operation, ...details }
    );
    this.name = 'HistoryDetailsOperationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 历史记录趋势分析失败异常
 */
export class HistoryTrendAnalysisError extends HistoryError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super(`历史记录趋势分析失败: ${reason}`, 'HISTORY_TREND_ANALYSIS_FAILED', details);
    this.name = 'HistoryTrendAnalysisError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 历史记录存储失败异常
 */
export class HistoryStorageError extends HistoryError {
  constructor(operation: string, reason: string, details?: Record<string, unknown>) {
    super(`历史记录存储失败: ${operation} - ${reason}`, 'HISTORY_STORAGE_FAILED', {
      operation,
      ...details,
    });
    this.name = 'HistoryStorageError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
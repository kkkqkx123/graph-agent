/**
 * 工具异常基类
 */
export abstract class ToolError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(message: string, code: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
    this.details = details;
    
    // 修复原型链，确保instanceof正常工作
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 工具未找到异常
 */
export class ToolNotFoundError extends ToolError {
  constructor(toolId: string) {
    super(`工具未找到: ${toolId}`, 'TOOL_NOT_FOUND', { toolId });
  }
}

/**
 * 工具已存在异常
 */
export class ToolAlreadyExistsError extends ToolError {
  constructor(toolId: string) {
    super(`工具已存在: ${toolId}`, 'TOOL_ALREADY_EXISTS', { toolId });
  }
}

/**
 * 工具验证失败异常
 */
export class ToolValidationError extends ToolError {
  constructor(toolId: string, errors: string[]) {
    super(`工具验证失败: ${toolId} - ${errors.join(', ')}`, 'TOOL_VALIDATION_ERROR', {
      toolId,
      errors,
    });
  }
}

/**
 * 工具配置错误异常
 */
export class ToolConfigurationError extends ToolError {
  constructor(toolId: string, reason: string, details?: Record<string, any>) {
    super(`工具配置错误: ${toolId} - ${reason}`, 'TOOL_CONFIGURATION_ERROR', {
      toolId,
      reason,
      ...details,
    });
  }
}

/**
 * 工具执行错误异常
 */
export class ToolExecutionError extends ToolError {
  constructor(toolId: string, reason: string, details?: Record<string, any>) {
    super(`工具执行错误: ${toolId} - ${reason}`, 'TOOL_EXECUTION_ERROR', {
      toolId,
      reason,
      ...details,
    });
  }
}

/**
 * 工具执行失败异常
 */
export class ToolExecutionFailedError extends ToolExecutionError {
  constructor(toolId: string, errorMessage: string) {
    super(toolId, `执行失败: ${errorMessage}`, { errorMessage });
  }
}

/**
 * 工具执行超时异常
 */
export class ToolExecutionTimeoutError extends ToolExecutionError {
  constructor(toolId: string, timeout: number) {
    super(toolId, `执行超时: ${timeout}ms`, { timeout });
  }
}

/**
 * 工具执行被取消异常
 */
export class ToolExecutionCancelledError extends ToolExecutionError {
  constructor(toolId: string, reason?: string) {
    super(toolId, reason || '执行被取消', { reason });
  }
}

/**
 * 工具删除错误异常
 */
export class ToolDeletionError extends ToolError {
  constructor(toolId: string, reason: string) {
    super(`工具删除错误: ${toolId} - ${reason}`, 'TOOL_DELETION_ERROR', {
      toolId,
      reason,
    });
  }
}

/**
 * 工具不可用异常
 */
export class ToolUnavailableError extends ToolError {
  constructor(toolId: string, reason: string) {
    super(`工具不可用: ${toolId} - ${reason}`, 'TOOL_UNAVAILABLE', {
      toolId,
      reason,
    });
  }
}

/**
 * 工具参数验证失败异常
 */
export class ToolParameterValidationError extends ToolValidationError {
  constructor(toolId: string, parameterName: string, reason: string) {
    super(toolId, [`参数验证失败: ${parameterName} - ${reason}`]);
  }
}

/**
 * 工具参数缺失异常
 */
export class ToolParameterMissingError extends ToolParameterValidationError {
  constructor(toolId: string, parameterName: string) {
    super(toolId, parameterName, '参数缺失');
  }
}

/**
 * 工具参数类型错误异常
 */
export class ToolParameterTypeError extends ToolParameterValidationError {
  constructor(toolId: string, parameterName: string, expectedType: string, actualType: string) {
    super(toolId, parameterName, `类型错误，期望: ${expectedType}，实际: ${actualType}`);
  }
}

/**
 * 工具权限不足异常
 */
export class ToolPermissionError extends ToolError {
  constructor(toolId: string, reason: string) {
    super(`工具权限不足: ${toolId} - ${reason}`, 'TOOL_PERMISSION_ERROR', {
      toolId,
      reason,
    });
  }
}

/**
 * 工具类型不支持异常
 */
export class ToolTypeNotSupportedError extends ToolError {
  constructor(toolId: string, toolType: string) {
    super(`工具类型不支持: ${toolId} - ${toolType}`, 'TOOL_TYPE_NOT_SUPPORTED', {
      toolId,
      toolType,
    });
  }
}

/**
 * 工具注册错误异常
 */
export class ToolRegistrationError extends ToolError {
  constructor(toolId: string, reason: string) {
    super(`工具注册错误: ${toolId} - ${reason}`, 'TOOL_REGISTRATION_ERROR', {
      toolId,
      reason,
    });
  }
}

/**
 * 工具注销错误异常
 */
export class ToolUnregistrationError extends ToolError {
  constructor(toolId: string, reason: string) {
    super(`工具注销错误: ${toolId} - ${reason}`, 'TOOL_UNREGISTRATION_ERROR', {
      toolId,
      reason,
    });
  }
}

/**
 * 工具执行器未找到异常
 */
export class ToolExecutorNotFoundError extends ToolError {
  constructor(toolId: string, executorType: string) {
    super(`工具执行器未找到: ${toolId} - ${executorType}`, 'TOOL_EXECUTOR_NOT_FOUND', {
      toolId,
      executorType,
    });
  }
}

/**
 * 工具执行器初始化失败异常
 */
export class ToolExecutorInitializationError extends ToolError {
  constructor(toolId: string, executorType: string, reason: string) {
    super(
      `工具执行器初始化失败: ${toolId} - ${executorType} - ${reason}`,
      'TOOL_EXECUTOR_INITIALIZATION_ERROR',
      { toolId, executorType, reason }
    );
  }
}

/**
 * 工具结果解析失败异常
 */
export class ToolResultParseError extends ToolExecutionError {
  constructor(toolId: string, reason: string) {
    super(toolId, `结果解析失败: ${reason}`, { reason });
  }
}

/**
 * 工具状态转换错误异常
 */
export class ToolStateTransitionError extends ToolError {
  constructor(toolId: string, currentStatus: string, targetStatus: string, reason: string) {
    super(
      `工具状态转换错误: ${toolId} - 从 ${currentStatus} 到 ${targetStatus} - ${reason}`,
      'TOOL_STATE_TRANSITION_ERROR',
      { toolId, currentStatus, targetStatus, reason }
    );
  }
}

/**
 * 工具依赖未满足异常
 */
export class ToolDependencyNotSatisfiedError extends ToolExecutionError {
  constructor(toolId: string, dependencyId: string) {
    super(toolId, `工具依赖未满足: ${dependencyId}`, { dependencyId });
  }
}

/**
 * 工具版本不兼容异常
 */
export class ToolVersionIncompatibleError extends ToolError {
  constructor(toolId: string, requiredVersion: string, currentVersion: string) {
    super(
      `工具版本不兼容: ${toolId} - 需要: ${requiredVersion}，当前: ${currentVersion}`,
      'TOOL_VERSION_INCOMPATIBLE',
      { toolId, requiredVersion, currentVersion }
    );
  }
}
/**
 * 状态异常基类
 */
export abstract class StateError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(message: string, code: string, details?: Record<string, any>) {
    super(message);
    this.name = 'StateError';
    this.code = code;
    this.details = details;
    
    // 修复原型链，确保instanceof正常工作
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 状态未找到异常
 */
export class StateNotFoundError extends StateError {
  constructor(threadId: string) {
    super(`状态未找到: ${threadId}`, 'STATE_NOT_FOUND', { threadId });
  }
}

/**
 * 状态验证失败异常
 */
export class StateValidationError extends StateError {
  constructor(threadId: string, errors: string[]) {
    super(`状态验证失败: ${threadId} - ${errors.join(', ')}`, 'STATE_VALIDATION_ERROR', {
      threadId,
      errors,
    });
  }
}

/**
 * 状态变量验证失败异常
 */
export class StateVariableValidationError extends StateValidationError {
  constructor(threadId: string, variableName: string, reason: string) {
    super(threadId, [`变量验证失败: ${variableName} - ${reason}`]);
  }
}

/**
 * 状态变量名无效异常
 */
export class StateVariableNameInvalidError extends StateVariableValidationError {
  constructor(threadId: string, variableName: string) {
    super(threadId, variableName, '变量名格式不正确');
  }
}

/**
 * 状态变量名为空异常
 */
export class StateVariableNameEmptyError extends StateVariableValidationError {
  constructor(threadId: string) {
    super(threadId, '', '变量名不能为空');
  }
}

/**
 * 状态变量未找到异常
 */
export class StateVariableNotFoundError extends StateError {
  constructor(threadId: string, variableName: string) {
    super(`状态变量未找到: ${threadId} - ${variableName}`, 'STATE_VARIABLE_NOT_FOUND', {
      threadId,
      variableName,
    });
  }
}

/**
 * 状态变量已存在异常
 */
export class StateVariableAlreadyExistsError extends StateError {
  constructor(threadId: string, variableName: string) {
    super(`状态变量已存在: ${threadId} - ${variableName}`, 'STATE_VARIABLE_ALREADY_EXISTS', {
      threadId,
      variableName,
    });
  }
}

/**
 * 状态变量类型错误异常
 */
export class StateVariableTypeError extends StateError {
  constructor(threadId: string, variableName: string, expectedType: string, actualType: string) {
    super(
      `状态变量类型错误: ${threadId} - ${variableName} - 期望: ${expectedType}, 实际: ${actualType}`,
      'STATE_VARIABLE_TYPE_ERROR',
      { threadId, variableName, expectedType, actualType }
    );
  }
}

/**
 * 状态变量只读异常
 */
export class StateVariableReadOnlyError extends StateError {
  constructor(threadId: string, variableName: string) {
    super(`状态变量只读: ${threadId} - ${variableName}`, 'STATE_VARIABLE_READ_ONLY', {
      threadId,
      variableName,
    });
  }
}

/**
 * 状态变量访问权限错误异常
 */
export class StateVariableAccessDeniedError extends StateError {
  constructor(threadId: string, variableName: string, reason: string) {
    super(
      `状态变量访问权限错误: ${threadId} - ${variableName} - ${reason}`,
      'STATE_VARIABLE_ACCESS_DENIED',
      { threadId, variableName, reason }
    );
  }
}

/**
 * 状态更新错误异常
 */
export class StateUpdateError extends StateError {
  constructor(threadId: string, reason: string) {
    super(`状态更新错误: ${threadId} - ${reason}`, 'STATE_UPDATE_ERROR', {
      threadId,
      reason,
    });
  }
}

/**
 * 状态合并错误异常
 */
export class StateMergeError extends StateError {
  constructor(threadId: string, reason: string) {
    super(`状态合并错误: ${threadId} - ${reason}`, 'STATE_MERGE_ERROR', {
      threadId,
      reason,
    });
  }
}

/**
 * 状态重置错误异常
 */
export class StateResetError extends StateError {
  constructor(threadId: string, reason: string) {
    super(`状态重置错误: ${threadId} - ${reason}`, 'STATE_RESET_ERROR', {
      threadId,
      reason,
    });
  }
}

/**
 * 状态恢复点不可用异常
 */
export class StateRecoveryPointUnavailableError extends StateError {
  constructor(threadId: string, reason: string) {
    super(`状态恢复点不可用: ${threadId} - ${reason}`, 'STATE_RECOVERY_POINT_UNAVAILABLE', {
      threadId,
      reason,
    });
  }
}

/**
 * 状态恢复失败异常
 */
export class StateRecoveryFailedError extends StateError {
  constructor(threadId: string, reason: string) {
    super(`状态恢复失败: ${threadId} - ${reason}`, 'STATE_RECOVERY_FAILED', {
      threadId,
      reason,
    });
  }
}

/**
 * 状态数据序列化失败异常
 */
export class StateDataSerializeError extends StateError {
  constructor(threadId: string, reason: string) {
    super(`状态数据序列化失败: ${threadId} - ${reason}`, 'STATE_DATA_SERIALIZE_ERROR', {
      threadId,
      reason,
    });
  }
}

/**
 * 状态数据反序列化失败异常
 */
export class StateDataDeserializeError extends StateError {
  constructor(threadId: string, reason: string) {
    super(`状态数据反序列化失败: ${threadId} - ${reason}`, 'STATE_DATA_DESERIALIZE_ERROR', {
      threadId,
      reason,
    });
  }
}

/**
 * 状态上下文过滤错误异常
 */
export class StateContextFilterError extends StateError {
  constructor(threadId: string, reason: string) {
    super(`状态上下文过滤错误: ${threadId} - ${reason}`, 'STATE_CONTEXT_FILTER_ERROR', {
      threadId,
      reason,
    });
  }
}

/**
 * �状态表达式评估失败异常
 */
export class StateExpressionEvaluationError extends StateError {
  constructor(threadId: string, expression: string, reason: string) {
    super(
      `状态表达式评估失败: ${threadId} - ${expression} - ${reason}`,
      'STATE_EXPRESSION_EVALUATION_ERROR',
      { threadId, expression, reason }
    );
  }
}

/**
 * �状态转换函数执行失败异常
 */
export class StateTransformFunctionError extends StateError {
  constructor(threadId: string, transform: string, reason: string) {
    super(
      `状态转换函数执行失败: ${threadId} - ${transform} - ${reason}`,
      'STATE_TRANSFORM_FUNCTION_ERROR',
      { threadId, transform, reason }
    );
  }
}
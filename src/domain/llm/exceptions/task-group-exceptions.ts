import { DomainError } from '../../common/errors/domain-error';

/**
 * 任务组异常基类
 */
export abstract class TaskGroupError extends DomainError {
  constructor(
    message: string,
    code: string,
    details?: Record<string, any>
  ) {
    super(message, code, details);
  }
}

/**
 * 任务组未找到异常
 */
export class TaskGroupNotFoundError extends TaskGroupError {
  constructor(groupName: string) {
    super(
      `任务组未找到: ${groupName}`,
      'TASK_GROUP_NOT_FOUND',
      { groupName }
    );
  }
}

/**
 * 任务组配置错误异常
 */
export class TaskGroupConfigurationError extends TaskGroupError {
  constructor(groupName: string, configKey: string, reason: string) {
    super(
      `任务组配置错误: ${groupName} - ${configKey} - ${reason}`,
      'TASK_GROUP_CONFIGURATION_ERROR',
      { groupName, configKey, reason }
    );
  }
}

/**
 * 任务组层级未找到异常
 */
export class TaskGroupEchelonNotFoundError extends TaskGroupError {
  constructor(groupName: string, echelonName: string) {
    super(
      `任务组层级未找到: ${groupName} - ${echelonName}`,
      'TASK_GROUP_ECHELON_NOT_FOUND',
      { groupName, echelonName }
    );
  }
}

/**
 * 任务组引用解析错误异常
 */
export class TaskGroupReferenceParseError extends TaskGroupError {
  constructor(reference: string, reason: string) {
    super(
      `任务组引用解析错误: ${reference} - ${reason}`,
      'TASK_GROUP_REFERENCE_PARSE_ERROR',
      { reference, reason }
    );
  }
}

/**
 * 任务组降级失败异常
 */
export class TaskGroupFallbackError extends TaskGroupError {
  constructor(groupName: string, currentEchelon: string, reason: string) {
    super(
      `任务组降级失败: ${groupName} - ${currentEchelon} - ${reason}`,
      'TASK_GROUP_FALLBACK_ERROR',
      { groupName, currentEchelon, reason }
    );
  }
}

/**
 * 任务组模型不可用异常
 */
export class TaskGroupModelUnavailableError extends TaskGroupError {
  constructor(groupName: string, echelonName: string, modelName: string) {
    super(
      `任务组模型不可用: ${groupName} - ${echelonName} - ${modelName}`,
      'TASK_GROUP_MODEL_UNAVAILABLE',
      { groupName, echelonName, modelName }
    );
  }
}

/**
 * 任务组优先级配置错误异常
 */
export class TaskGroupPriorityError extends TaskGroupError {
  constructor(groupName: string, echelonName: string, priority: number) {
    super(
      `任务组优先级配置错误: ${groupName} - ${echelonName} - 优先级: ${priority}`,
      'TASK_GROUP_PRIORITY_ERROR',
      { groupName, echelonName, priority }
    );
  }
}

/**
 * 任务组降级策略错误异常
 */
export class TaskGroupFallbackStrategyError extends TaskGroupError {
  constructor(groupName: string, strategy: string, reason: string) {
    super(
      `任务组降级策略错误: ${groupName} - ${strategy} - ${reason}`,
      'TASK_GROUP_FALLBACK_STRATEGY_ERROR',
      { groupName, strategy, reason }
    );
  }
}
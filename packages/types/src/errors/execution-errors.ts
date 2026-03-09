/**
 * 执行相关错误类型定义
 * 定义执行过程中的错误类型
 */

import { ExecutionError, ErrorSeverity } from './base.js';

/**
 * 业务逻辑错误类型
 *
 * 专门用于业务逻辑相关的执行错误（如路由不匹配、条件不满足等）
 * 继承自 ExecutionError，保持向后兼容性
 *
 * 使用场景：
 * - 路由条件评估失败
 * - 条件节点判断失败
 * - 循环终止条件异常
 * - 业务规则验证失败
 */
export class BusinessLogicError extends ExecutionError {
  constructor(
    message: string,
    public readonly businessContext?: string,
    public readonly ruleName?: string,
    nodeId?: string,
    workflowId?: string,
    context?: Record<string, any>,
    cause?: Error,
    severity?: ErrorSeverity
  ) {
    super(message, nodeId, workflowId, { ...context, businessContext, ruleName }, cause, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'error';
  }
}

/**
 * 系统执行错误类型
 *
 * 用于系统级别的执行错误（如状态管理失败、上下文丢失等）
 * 继承自 ExecutionError，保持向后兼容性
 *
 * 注意：对于更具体的错误场景，请使用以下专用错误类型：
 * - DependencyInjectionError: 依赖注入失败
 * - StateManagementError: 状态管理失败
 * - CheckpointError: 检查点操作失败
 * - EventSystemError: 事件系统错误
 */
export class SystemExecutionError extends ExecutionError {
  constructor(
    message: string,
    public readonly systemComponent?: string,
    public readonly failurePoint?: string,
    nodeId?: string,
    workflowId?: string,
    context?: Record<string, any>,
    cause?: Error,
    severity?: ErrorSeverity
  ) {
    super(message, nodeId, workflowId, { ...context, systemComponent, failurePoint }, cause, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'error';
  }
}

/**
 * 依赖注入错误类型
 *
 * 专门用于依赖注入相关的错误
 * 当必需的服务、组件或依赖项未提供或无法解析时使用
 *
 * 使用场景：
 * - 必需的服务未注入
 * - 依赖项解析失败
 * - 服务初始化失败
 */
export class DependencyInjectionError extends ExecutionError {
  constructor(
    message: string,
    public readonly dependencyName: string,
    public readonly requiredBy?: string,
    nodeId?: string,
    workflowId?: string,
    context?: Record<string, any>,
    cause?: Error,
    severity?: ErrorSeverity
  ) {
    super(message, nodeId, workflowId, { ...context, dependencyName, requiredBy }, cause, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'error';
  }
}

/**
 * 状态管理错误类型
 *
 * 专门用于状态管理相关的错误
 * 当状态读取、写入、更新或删除操作失败时使用
 *
 * 使用场景：
 * - 状态读取失败
 * - 状态写入失败
 * - 状态同步失败
 * - 状态一致性错误
 */
export class StateManagementError extends ExecutionError {
  constructor(
    message: string,
    public readonly stateType: string,
    public readonly operation: 'read' | 'write' | 'delete' | 'update' | 'sync',
    public readonly stateKey?: string,
    nodeId?: string,
    workflowId?: string,
    context?: Record<string, any>,
    cause?: Error,
    severity?: ErrorSeverity
  ) {
    super(message, nodeId, workflowId, { ...context, stateType, operation, stateKey }, cause, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'error';
  }
}

/**
 * 检查点错误类型
 *
 * 专门用于检查点相关的错误
 * 当检查点创建、恢复、删除或验证操作失败时使用
 *
 * 使用场景：
 * - 检查点创建失败
 * - 检查点恢复失败
 * - 检查点删除失败
 * - 检查点验证失败
 */
export class CheckpointError extends ExecutionError {
  constructor(
    message: string,
    public readonly operation: 'create' | 'restore' | 'delete' | 'validate',
    public readonly checkpointId?: string,
    nodeId?: string,
    workflowId?: string,
    context?: Record<string, any>,
    cause?: Error,
    severity?: ErrorSeverity
  ) {
    super(message, nodeId, workflowId, { ...context, operation, checkpointId }, cause, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'error';
  }
}

/**
 * 事件系统错误类型
 *
 * 专门用于事件系统相关的错误
 * 当事件发射、监听或处理操作失败时使用
 *
 * 使用场景：
 * - 事件发射失败
 * - 事件监听器注册失败
 * - 事件处理器执行失败
 * - 事件总线错误
 */
export class EventSystemError extends ExecutionError {
  constructor(
    message: string,
    public readonly operation: 'emit' | 'subscribe' | 'unsubscribe' | 'handle',
    public readonly eventType?: string,
    nodeId?: string,
    workflowId?: string,
    context?: Record<string, any>,
    cause?: Error,
    severity?: ErrorSeverity
  ) {
    super(message, nodeId, workflowId, { ...context, eventType, operation }, cause, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'error';
  }
}

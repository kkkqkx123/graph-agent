/**
 * 执行相关错误类型定义
 * 定义执行过程中的错误类型
 */

import { SDKError, ExecutionError, ErrorSeverity } from './base';

/**
 * 业务逻辑错误类型
 *
 * 专门用于业务逻辑相关的执行错误（如路由不匹配、条件不满足等）
 * 继承自 ExecutionError，保持向后兼容性
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
 * 专门用于系统级别的执行错误（如状态管理失败、上下文丢失等）
 * 继承自 ExecutionError，保持向后兼容性
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
 * 资源访问错误类型
 *
 * 专门用于资源访问相关的执行错误
 * 继承自 ExecutionError，保持向后兼容性
 */
export class ResourceAccessError extends ExecutionError {
  constructor(
    message: string,
    public readonly resourceType?: string,
    public readonly resourceId?: string,
    public readonly accessType?: 'read' | 'write' | 'delete' | 'update',
    nodeId?: string,
    workflowId?: string,
    context?: Record<string, any>,
    cause?: Error,
    severity?: ErrorSeverity
  ) {
    super(message, nodeId, workflowId, { ...context, resourceType, resourceId, accessType }, cause, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'error';
  }
}
/**
 * 资源相关错误类型定义
 * 定义资源未找到相关的错误类型
 *
 * 注意：所有资源未找到错误默认为严重错误（error级别）
 * 如果需要记录警告但不中断执行，请使用 ContextualLogger.resourceNotFoundWarning()
 */

import { NotFoundError, ErrorSeverity } from './base.js';

/**
 * 工作流未找到错误类型
 *
 * 专门用于工作流未找到的场景
 * 继承自 NotFoundError，保持向后兼容性
 */
export class WorkflowNotFoundError extends NotFoundError {
  constructor(
    message: string,
    workflowId: string,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, 'Workflow', workflowId, context, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'error';
  }
}

/**
 * 节点未找到错误类型
 *
 * 专门用于节点未找到的场景
 * 继承自 NotFoundError，保持向后兼容性
 */
export class NodeNotFoundError extends NotFoundError {
  constructor(
    message: string,
    nodeId: string,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, 'Node', nodeId, context, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'error';
  }
}

/**
 * 工具未找到错误类型
 *
 * 专门用于工具未找到的场景
 * 继承自 NotFoundError，保持向后兼容性
 */
export class ToolNotFoundError extends NotFoundError {
  constructor(
    message: string,
    toolId: string,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, 'Tool', toolId, context, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'error';
  }
}

/**
 * 脚本未找到错误类型
 *
 * 专门用于脚本未找到的场景
 * 继承自 NotFoundError，保持向后兼容性
 */
export class ScriptNotFoundError extends NotFoundError {
  constructor(
    message: string,
    scriptName: string,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, 'Script', scriptName, context, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'error';
  }
}

/**
 * 线程上下文未找到错误类型
 *
 * 专门用于线程上下文未找到的场景
 * 继承自 NotFoundError，保持向后兼容性
 */
export class ThreadContextNotFoundError extends NotFoundError {
  constructor(
    message: string,
    threadId: string,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, 'ThreadContext', threadId, context, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'error';
  }
}

/**
 * 检查点未找到错误类型
 *
 * 专门用于检查点未找到的场景
 * 继承自 NotFoundError，保持向后兼容性
 */
export class CheckpointNotFoundError extends NotFoundError {
  constructor(
    message: string,
    checkpointId: string,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, 'Checkpoint', checkpointId, context, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'error';
  }
}

/**
 * 触发器模板未找到错误类型
 *
 * 专门用于触发器模板未找到的场景
 * 继承自 NotFoundError，保持向后兼容性
 */
export class TriggerTemplateNotFoundError extends NotFoundError {
  constructor(
    message: string,
    templateName: string,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, 'TriggerTemplate', templateName, context, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'error';
  }
}

/**
 * 节点模板未找到错误类型
 *
 * 专门用于节点模板未找到的场景
 * 继承自 NotFoundError，保持向后兼容性
 */
export class NodeTemplateNotFoundError extends NotFoundError {
  constructor(
    message: string,
    templateName: string,
    context?: Record<string, any>,
    severity?: ErrorSeverity
  ) {
    super(message, 'NodeTemplate', templateName, context, severity);
  }

  protected override getDefaultSeverity(): ErrorSeverity {
    return 'error';
  }
}
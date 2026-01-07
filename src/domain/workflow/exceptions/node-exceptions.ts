/**
 * 节点异常基类
 */
export abstract class NodeError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(message: string, code: string, details?: Record<string, any>) {
    super(message);
    this.name = 'NodeError';
    this.code = code;
    this.details = details;
    
    // 修复原型链，确保instanceof正常工作
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 节点未找到异常
 */
export class NodeNotFoundError extends NodeError {
  constructor(nodeId: string, workflowId?: string) {
    super(
      `节点未找到: ${nodeId}${workflowId ? ` (工作流: ${workflowId})` : ''}`,
      'NODE_NOT_FOUND',
      { nodeId, workflowId }
    );
  }
}

/**
 * 节点已存在异常
 */
export class NodeAlreadyExistsError extends NodeError {
  constructor(nodeId: string, workflowId: string) {
    super(`节点已存在: ${nodeId} (工作流: ${workflowId})`, 'NODE_ALREADY_EXISTS', {
      nodeId,
      workflowId,
    });
  }
}

/**
 * 节点验证失败异常
 */
export class NodeValidationError extends NodeError {
  constructor(nodeId: string, errors: string[]) {
    super(`节点验证失败: ${nodeId} - ${errors.join(', ')}`, 'NODE_VALIDATION_ERROR', {
      nodeId,
      errors,
    });
  }
}

/**
 * 节点配置错误异常
 */
export class NodeConfigurationError extends NodeError {
  constructor(nodeId: string, reason: string, details?: Record<string, any>) {
    super(`节点配置错误: ${nodeId} - ${reason}`, 'NODE_CONFIGURATION_ERROR', {
      nodeId,
      reason,
      ...details,
    });
  }
}

/**
 * 节点执行错误异常
 */
export class NodeExecutionError extends NodeError {
  constructor(nodeId: string, reason: string, details?: Record<string, any>) {
    super(`节点执行错误: ${nodeId} - ${reason}`, 'NODE_EXECUTION_ERROR', {
      nodeId,
      reason,
      ...details,
    });
  }
}

/**
 * 节点执行超时异常
 */
export class NodeExecutionTimeoutError extends NodeExecutionError {
  constructor(nodeId: string, timeout: number) {
    super(nodeId, `执行超时: ${timeout}ms`, { timeout });
  }
}

/**
 * 节点无法执行异常
 */
export class NodeCannotExecuteError extends NodeExecutionError {
  constructor(nodeId: string, reason: string) {
    super(nodeId, `节点无法执行: ${reason}`, { reason });
  }
}

/**
 * 节点类型不支持异常
 */
export class NodeTypeNotSupportedError extends NodeError {
  constructor(nodeId: string, nodeType: string) {
    super(`节点类型不支持: ${nodeId} - ${nodeType}`, 'NODE_TYPE_NOT_SUPPORTED', {
      nodeId,
      nodeType,
    });
  }
}

/**
 * 节点依赖未满足异常
 */
export class NodeDependencyNotSatisfiedError extends NodeExecutionError {
  constructor(nodeId: string, dependencyId: string) {
    super(nodeId, `节点依赖未满足: ${dependencyId}`, { dependencyId });
  }
}

/**
 * 节点输入验证失败异常
 */
export class NodeInputValidationError extends NodeValidationError {
  constructor(nodeId: string, inputName: string, reason: string) {
    super(nodeId, [`输入验证失败: ${inputName} - ${reason}`]);
  }
}

/**
 * 节点输出验证失败异常
 */
export class NodeOutputValidationError extends NodeValidationError {
  constructor(nodeId: string, outputName: string, reason: string) {
    super(nodeId, [`输出验证失败: ${outputName} - ${reason}`]);
  }
}

/**
 * 节点删除错误异常
 */
export class NodeDeletionError extends NodeError {
  constructor(nodeId: string, reason: string) {
    super(`节点删除错误: ${nodeId} - ${reason}`, 'NODE_DELETION_ERROR', { nodeId, reason });
  }
}

/**
 * 节点连接错误异常
 */
export class NodeConnectionError extends NodeError {
  constructor(sourceNodeId: string, targetNodeId: string, reason: string) {
    super(
      `节点连接错误: ${sourceNodeId} -> ${targetNodeId} - ${reason}`,
      'NODE_CONNECTION_ERROR',
      { sourceNodeId, targetNodeId, reason }
    );
  }
}

/**
 * 节点断开连接错误异常
 */
export class NodeDisconnectionError extends NodeError {
  constructor(sourceNodeId: string, targetNodeId: string, reason: string) {
    super(
      `节点断开连接错误: ${sourceNodeId} -> ${targetNodeId} - ${reason}`,
      'NODE_DISCONNECTION_ERROR',
      { sourceNodeId, targetNodeId, reason }
    );
  }
}
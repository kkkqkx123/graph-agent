import { ID } from '../../common/value-objects/id';

/**
 * 执行状态枚举
 */
export enum ExecutionStatus {
  /** 未开始 */
  PENDING = 'pending',
  /** 运行中 */
  RUNNING = 'running',
  /** 已暂停 */
  PAUSED = 'paused',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 已取消 */
  CANCELLED = 'cancelled',
  /** 失败 */
  FAILED = 'failed',
  /** 超时 */
  TIMEOUT = 'timeout'
}

/**
 * 执行模式枚举
 */
export enum ExecutionMode {
  /** 同步执行 */
  SYNC = 'sync',
  /** 异步执行 */
  ASYNC = 'async',
  /** 流式执行 */
  STREAMING = 'streaming',
  /** 批量执行 */
  BATCH = 'batch'
}

/**
 * 执行优先级枚举
 */
export enum ExecutionPriority {
  /** 低优先级 */
  LOW = 0,
  /** 普通优先级 */
  NORMAL = 1,
  /** 高优先级 */
  HIGH = 2,
  /** 紧急优先级 */
  URGENT = 3
}

/**
 * 执行上下文接口
 */
export interface ExecutionContext {
  /** 执行ID */
  readonly executionId: string;

  /** 图ID */
  readonly graphId: ID;

  /** 执行状态 */
  readonly status: ExecutionStatus;

  /** 执行模式 */
  readonly mode: ExecutionMode;

  /** 执行优先级 */
  readonly priority: ExecutionPriority;

  /** 开始时间 */
  readonly startTime: Date;

  /** 结束时间 */
  readonly endTime?: Date;

  /** 持续时间（毫秒） */
  readonly duration?: number;

  /** 当前节点ID */
  readonly currentNodeId?: ID;

  /** 已执行节点列表 */
  readonly executedNodes: ID[];

  /** 待执行节点列表 */
  readonly pendingNodes: ID[];

  /** 执行数据 */
  readonly data: Map<string, any>;

  /** 执行变量 */
  readonly variables: Map<string, any>;

  /** 执行配置 */
  readonly config: ExecutionConfig;

  /** 执行元数据 */
  readonly metadata: Record<string, any>;

  /** 执行日志 */
  readonly logs: ExecutionLog[];

  /** 执行错误 */
  readonly errors: ExecutionError[];
}

/**
 * 执行配置接口
 */
export interface ExecutionConfig {
  /** 是否启用调试模式 */
  readonly debug?: boolean;

  /** 超时时间（毫秒） */
  readonly timeout?: number;

  /** 最大重试次数 */
  readonly maxRetries?: number;

  /** 重试间隔（毫秒） */
  readonly retryInterval?: number;

  /** 是否启用断点 */
  readonly enableBreakpoints?: boolean;

  /** 断点列表 */
  readonly breakpoints?: ID[];

  /** 是否启用性能监控 */
  readonly enableProfiling?: boolean;

  /** 是否启用详细日志 */
  readonly enableVerboseLogging?: boolean;

  /** 环境变量 */
  readonly environment?: Record<string, string>;

  /** 自定义配置 */
  readonly custom?: Record<string, any>;
}

/**
 * 执行日志接口
 */
export interface ExecutionLog {
  /** 日志ID */
  readonly id: string;

  /** 日志级别 */
  readonly level: 'debug' | 'info' | 'warn' | 'error';

  /** 日志消息 */
  readonly message: string;

  /** 日志时间 */
  readonly timestamp: Date;

  /** 相关节点ID */
  readonly nodeId?: ID;

  /** 相关边ID */
  readonly edgeId?: ID;

  /** 日志上下文 */
  readonly context?: Record<string, any>;

  /** 日志来源 */
  readonly source?: string;
}

/**
 * 执行错误接口
 */
export interface ExecutionError {
  /** 错误ID */
  readonly id: string;

  /** 错误消息 */
  readonly message: string;

  /** 错误类型 */
  readonly type: string;

  /** 错误代码 */
  readonly code?: string;

  /** 错误堆栈 */
  readonly stack?: string;

  /** 错误时间 */
  readonly timestamp: Date;

  /** 相关节点ID */
  readonly nodeId?: ID;

  /** 相关边ID */
  readonly edgeId?: ID;

  /** 是否可重试 */
  readonly retryable?: boolean;

  /** 重试次数 */
  readonly retryCount?: number;

  /** 错误上下文 */
  readonly context?: Record<string, any>;

  /** 错误元数据 */
  readonly metadata: Record<string, any>;
}

/**
 * 节点执行上下文接口
 */
export interface NodeExecutionContext {
  /** 节点ID */
  readonly nodeId: ID;

  /** 节点类型 */
  readonly nodeType: string;

  /** 节点配置 */
  readonly nodeConfig: Record<string, any>;

  /** 输入数据 */
  readonly inputs: Map<string, any>;

  /** 输出数据 */
  readonly outputs: Map<string, any>;

  /** 执行开始时间 */
  readonly startTime: Date;

  /** 执行结束时间 */
  readonly endTime?: Date;

  /** 执行持续时间（毫秒） */
  readonly duration?: number;

  /** 执行状态 */
  readonly status: ExecutionStatus;

  /** 执行结果 */
  readonly result?: any;

  /** 执行错误 */
  readonly error?: ExecutionError;

  /** 执行日志 */
  readonly logs: ExecutionLog[];

  /** 执行元数据 */
  readonly metadata: Record<string, any>;
}

/**
 * 边执行上下文接口
 */
export interface EdgeExecutionContext {
  /** 边ID */
  readonly edgeId: ID;

  /** 边类型 */
  readonly edgeType: string;

  /** 边配置 */
  readonly edgeConfig: Record<string, any>;

  /** 源节点ID */
  readonly sourceNodeId: ID;

  /** 目标节点ID */
  readonly targetNodeId: ID;

  /** 传递的数据 */
  readonly data: Map<string, any>;

  /** 条件评估结果 */
  readonly conditionResult?: boolean;

  /** 执行开始时间 */
  readonly startTime: Date;

  /** 执行结束时间 */
  readonly endTime?: Date;

  /** 执行持续时间（毫秒） */
  readonly duration?: number;

  /** 执行状态 */
  readonly status: ExecutionStatus;

  /** 执行日志 */
  readonly logs: ExecutionLog[];

  /** 执行元数据 */
  readonly metadata: Record<string, any>;
}

/**
 * 执行上下文构建器
 */
export class ExecutionContextBuilder {
  private executionId: string;
  private graphId: ID;
  private status: ExecutionStatus = ExecutionStatus.PENDING;
  private mode: ExecutionMode = ExecutionMode.SYNC;
  private priority: ExecutionPriority = ExecutionPriority.NORMAL;
  private startTime: Date = new Date();
  private endTime?: Date;
  private duration?: number;
  private currentNodeId?: ID;
  private executedNodes: ID[] = [];
  private pendingNodes: ID[] = [];
  private data: Map<string, any> = new Map();
  private variables: Map<string, any> = new Map();
  private config: ExecutionConfig = {};
  private metadata: Record<string, any> = {};
  private logs: ExecutionLog[] = [];
  private errors: ExecutionError[] = [];

  constructor(executionId: string, graphId: ID) {
    this.executionId = executionId;
    this.graphId = graphId;
  }

  withStatus(status: ExecutionStatus): ExecutionContextBuilder {
    this.status = status;
    return this;
  }

  withMode(mode: ExecutionMode): ExecutionContextBuilder {
    this.mode = mode;
    return this;
  }

  withPriority(priority: ExecutionPriority): ExecutionContextBuilder {
    this.priority = priority;
    return this;
  }

  withStartTime(startTime: Date): ExecutionContextBuilder {
    this.startTime = startTime;
    return this;
  }

  withEndTime(endTime: Date): ExecutionContextBuilder {
    this.endTime = endTime;
    this.duration = endTime.getTime() - this.startTime.getTime();
    return this;
  }

  withCurrentNodeId(nodeId: ID): ExecutionContextBuilder {
    this.currentNodeId = nodeId;
    return this;
  }

  withExecutedNodes(nodes: ID[]): ExecutionContextBuilder {
    this.executedNodes = nodes;
    return this;
  }

  withPendingNodes(nodes: ID[]): ExecutionContextBuilder {
    this.pendingNodes = nodes;
    return this;
  }

  withData(data: Map<string, any>): ExecutionContextBuilder {
    this.data = new Map(data);
    return this;
  }

  withDataEntry(key: string, value: any): ExecutionContextBuilder {
    this.data.set(key, value);
    return this;
  }

  withVariables(variables: Map<string, any>): ExecutionContextBuilder {
    this.variables = new Map(variables);
    return this;
  }

  withVariable(key: string, value: any): ExecutionContextBuilder {
    this.variables.set(key, value);
    return this;
  }

  withConfig(config: ExecutionConfig): ExecutionContextBuilder {
    this.config = { ...this.config, ...config };
    return this;
  }

  withMetadata(metadata: Record<string, any>): ExecutionContextBuilder {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  withLogs(logs: ExecutionLog[]): ExecutionContextBuilder {
    this.logs = logs;
    return this;
  }

  withLog(log: ExecutionLog): ExecutionContextBuilder {
    this.logs.push(log);
    return this;
  }

  withErrors(errors: ExecutionError[]): ExecutionContextBuilder {
    this.errors = errors;
    return this;
  }

  withError(error: ExecutionError): ExecutionContextBuilder {
    this.errors.push(error);
    return this;
  }

  build(): ExecutionContext {
    return {
      executionId: this.executionId,
      graphId: this.graphId,
      status: this.status,
      mode: this.mode,
      priority: this.priority,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      currentNodeId: this.currentNodeId,
      executedNodes: this.executedNodes,
      pendingNodes: this.pendingNodes,
      data: this.data,
      variables: this.variables,
      config: this.config,
      metadata: this.metadata,
      logs: this.logs,
      errors: this.errors
    };
  }
}

/**
 * 节点执行上下文构建器
 */
export class NodeExecutionContextBuilder {
  private nodeId: ID;
  private nodeType: string;
  private nodeConfig: Record<string, any> = {};
  private inputs: Map<string, any> = new Map();
  private outputs: Map<string, any> = new Map();
  private startTime: Date = new Date();
  private endTime?: Date;
  private duration?: number;
  private status: ExecutionStatus = ExecutionStatus.PENDING;
  private result?: any;
  private error?: ExecutionError;
  private logs: ExecutionLog[] = [];
  private metadata: Record<string, any> = {};

  constructor(nodeId: ID, nodeType: string) {
    this.nodeId = nodeId;
    this.nodeType = nodeType;
  }

  withNodeConfig(config: Record<string, any>): NodeExecutionContextBuilder {
    this.nodeConfig = { ...this.nodeConfig, ...config };
    return this;
  }

  withInputs(inputs: Map<string, any>): NodeExecutionContextBuilder {
    this.inputs = new Map(inputs);
    return this;
  }

  withInput(key: string, value: any): NodeExecutionContextBuilder {
    this.inputs.set(key, value);
    return this;
  }

  withOutputs(outputs: Map<string, any>): NodeExecutionContextBuilder {
    this.outputs = new Map(outputs);
    return this;
  }

  withOutput(key: string, value: any): NodeExecutionContextBuilder {
    this.outputs.set(key, value);
    return this;
  }

  withStartTime(startTime: Date): NodeExecutionContextBuilder {
    this.startTime = startTime;
    return this;
  }

  withEndTime(endTime: Date): NodeExecutionContextBuilder {
    this.endTime = endTime;
    this.duration = endTime.getTime() - this.startTime.getTime();
    return this;
  }

  withStatus(status: ExecutionStatus): NodeExecutionContextBuilder {
    this.status = status;
    return this;
  }

  withResult(result: any): NodeExecutionContextBuilder {
    this.result = result;
    return this;
  }

  withError(error: ExecutionError): NodeExecutionContextBuilder {
    this.error = error;
    return this;
  }

  withLogs(logs: ExecutionLog[]): NodeExecutionContextBuilder {
    this.logs = logs;
    return this;
  }

  withLog(log: ExecutionLog): NodeExecutionContextBuilder {
    this.logs.push(log);
    return this;
  }

  withMetadata(metadata: Record<string, any>): NodeExecutionContextBuilder {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  build(): NodeExecutionContext {
    return {
      nodeId: this.nodeId,
      nodeType: this.nodeType,
      nodeConfig: this.nodeConfig,
      inputs: this.inputs,
      outputs: this.outputs,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      status: this.status,
      result: this.result,
      error: this.error,
      logs: this.logs,
      metadata: this.metadata
    };
  }
}

/**
 * 边执行上下文构建器
 */
export class EdgeExecutionContextBuilder {
  private edgeId: ID;
  private edgeType: string;
  private edgeConfig: Record<string, any> = {};
  private sourceNodeId: ID;
  private targetNodeId: ID;
  private data: Map<string, any> = new Map();
  private conditionResult?: boolean;
  private startTime: Date = new Date();
  private endTime?: Date;
  private duration?: number;
  private status: ExecutionStatus = ExecutionStatus.PENDING;
  private logs: ExecutionLog[] = [];
  private metadata: Record<string, any> = {};

  constructor(
    edgeId: ID,
    edgeType: string,
    sourceNodeId: ID,
    targetNodeId: ID
  ) {
    this.edgeId = edgeId;
    this.edgeType = edgeType;
    this.sourceNodeId = sourceNodeId;
    this.targetNodeId = targetNodeId;
  }

  withEdgeConfig(config: Record<string, any>): EdgeExecutionContextBuilder {
    this.edgeConfig = { ...this.edgeConfig, ...config };
    return this;
  }

  withData(data: Map<string, any>): EdgeExecutionContextBuilder {
    this.data = new Map(data);
    return this;
  }

  withDataEntry(key: string, value: any): EdgeExecutionContextBuilder {
    this.data.set(key, value);
    return this;
  }

  withConditionResult(result: boolean): EdgeExecutionContextBuilder {
    this.conditionResult = result;
    return this;
  }

  withStartTime(startTime: Date): EdgeExecutionContextBuilder {
    this.startTime = startTime;
    return this;
  }

  withEndTime(endTime: Date): EdgeExecutionContextBuilder {
    this.endTime = endTime;
    this.duration = endTime.getTime() - this.startTime.getTime();
    return this;
  }

  withStatus(status: ExecutionStatus): EdgeExecutionContextBuilder {
    this.status = status;
    return this;
  }

  withLogs(logs: ExecutionLog[]): EdgeExecutionContextBuilder {
    this.logs = logs;
    return this;
  }

  withLog(log: ExecutionLog): EdgeExecutionContextBuilder {
    this.logs.push(log);
    return this;
  }

  withMetadata(metadata: Record<string, any>): EdgeExecutionContextBuilder {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  build(): EdgeExecutionContext {
    return {
      edgeId: this.edgeId,
      edgeType: this.edgeType,
      edgeConfig: this.edgeConfig,
      sourceNodeId: this.sourceNodeId,
      targetNodeId: this.targetNodeId,
      data: this.data,
      conditionResult: this.conditionResult,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      status: this.status,
      logs: this.logs,
      metadata: this.metadata
    };
  }
}

/**
 * 执行上下文工具类
 */
export class ExecutionContextUtils {
  /**
   * 创建执行上下文
   */
  static create(executionId: string, graphId: ID): ExecutionContextBuilder {
    return new ExecutionContextBuilder(executionId, graphId);
  }

  /**
   * 创建节点执行上下文
   */
  static createNodeContext(nodeId: ID, nodeType: string): NodeExecutionContextBuilder {
    return new NodeExecutionContextBuilder(nodeId, nodeType);
  }

  /**
   * 创建边执行上下文
   */
  static createEdgeContext(
    edgeId: ID,
    edgeType: string,
    sourceNodeId: ID,
    targetNodeId: ID
  ): EdgeExecutionContextBuilder {
    return new EdgeExecutionContextBuilder(edgeId, edgeType, sourceNodeId, targetNodeId);
  }

  /**
   * 克隆执行上下文
   */
  static clone(context: ExecutionContext): ExecutionContext {
    return this.create(context.executionId, context.graphId)
      .withStatus(context.status)
      .withMode(context.mode)
      .withPriority(context.priority)
      .withStartTime(context.startTime)
      .withEndTime(context.endTime!)
      .withCurrentNodeId(context.currentNodeId!)
      .withExecutedNodes(context.executedNodes)
      .withPendingNodes(context.pendingNodes)
      .withData(context.data)
      .withVariables(context.variables)
      .withConfig(context.config)
      .withMetadata(context.metadata)
      .withLogs(context.logs)
      .withErrors(context.errors)
      .build();
  }

  /**
   * 更新执行状态
   */
  static withStatus(context: ExecutionContext, status: ExecutionStatus, endTime?: Date): ExecutionContext {
    const builder = this.create(context.executionId, context.graphId)
      .withStatus(context.status)
      .withMode(context.mode)
      .withPriority(context.priority)
      .withStartTime(context.startTime)
      .withCurrentNodeId(context.currentNodeId || ID.generate())
      .withExecutedNodes(context.executedNodes)
      .withPendingNodes(context.pendingNodes)
      .withData(context.data)
      .withVariables(context.variables)
      .withConfig(context.config)
      .withMetadata(context.metadata)
      .withLogs(context.logs)
      .withErrors(context.errors);

    if (endTime) {
      builder.withEndTime(endTime);
    }

    return builder.withStatus(status).build();
  }

  /**
   * 添加执行日志
   */
  static withLog(context: ExecutionContext, log: ExecutionLog): ExecutionContext {
    const newLogs = [...context.logs, log];
    return this.create(context.executionId, context.graphId)
      .withStatus(context.status)
      .withMode(context.mode)
      .withPriority(context.priority)
      .withStartTime(context.startTime)
      .withEndTime(context.endTime || new Date())
      .withCurrentNodeId(context.currentNodeId || ID.generate())
      .withExecutedNodes(context.executedNodes)
      .withPendingNodes(context.pendingNodes)
      .withData(context.data)
      .withVariables(context.variables)
      .withConfig(context.config)
      .withMetadata(context.metadata)
      .withLogs(newLogs)
      .withErrors(context.errors)
      .build();
  }

  /**
   * 添加执行错误
   */
  static withError(context: ExecutionContext, error: ExecutionError): ExecutionContext {
    const newErrors = [...context.errors, error];
    return this.create(context.executionId, context.graphId)
      .withStatus(context.status)
      .withMode(context.mode)
      .withPriority(context.priority)
      .withStartTime(context.startTime)
      .withEndTime(context.endTime || new Date())
      .withCurrentNodeId(context.currentNodeId || ID.generate())
      .withExecutedNodes(context.executedNodes)
      .withPendingNodes(context.pendingNodes)
      .withData(context.data)
      .withVariables(context.variables)
      .withConfig(context.config)
      .withMetadata(context.metadata)
      .withLogs(context.logs)
      .withErrors(newErrors)
      .build();
  }

  /**
   * 设置当前节点
   */
  static withCurrentNode(context: ExecutionContext, nodeId: ID): ExecutionContext {
    // 将节点从待执行列表移到已执行列表
    const pendingIndex = context.pendingNodes.indexOf(nodeId);
    const newPendingNodes = pendingIndex !== -1
      ? context.pendingNodes.filter((_, i) => i !== pendingIndex)
      : context.pendingNodes;

    const newExecutedNodes = context.executedNodes.includes(nodeId)
      ? context.executedNodes
      : [...context.executedNodes, nodeId];

    return this.create(context.executionId, context.graphId)
      .withStatus(context.status)
      .withMode(context.mode)
      .withPriority(context.priority)
      .withStartTime(context.startTime)
      .withEndTime(context.endTime || new Date())
      .withCurrentNodeId(nodeId)
      .withExecutedNodes(newExecutedNodes)
      .withPendingNodes(newPendingNodes)
      .withData(context.data)
      .withVariables(context.variables)
      .withConfig(context.config)
      .withMetadata(context.metadata)
      .withLogs(context.logs)
      .withErrors(context.errors)
      .build();
  }

  /**
   * 设置数据
   */
  static withData(context: ExecutionContext, key: string, value: any): ExecutionContext {
    const newData = new Map(context.data);
    newData.set(key, value);
    return this.create(context.executionId, context.graphId)
      .withStatus(context.status)
      .withMode(context.mode)
      .withPriority(context.priority)
      .withStartTime(context.startTime)
      .withEndTime(context.endTime || new Date())
      .withCurrentNodeId(context.currentNodeId || ID.generate())
      .withExecutedNodes(context.executedNodes)
      .withPendingNodes(context.pendingNodes)
      .withData(newData)
      .withVariables(context.variables)
      .withConfig(context.config)
      .withMetadata(context.metadata)
      .withLogs(context.logs)
      .withErrors(context.errors)
      .build();
  }

  /**
   * 设置变量
   */
  static withVariable(context: ExecutionContext, key: string, value: any): ExecutionContext {
    const newVariables = new Map(context.variables);
    newVariables.set(key, value);
    return this.create(context.executionId, context.graphId)
      .withStatus(context.status)
      .withMode(context.mode)
      .withPriority(context.priority)
      .withStartTime(context.startTime)
      .withEndTime(context.endTime || new Date())
      .withCurrentNodeId(context.currentNodeId || ID.generate())
      .withExecutedNodes(context.executedNodes)
      .withPendingNodes(context.pendingNodes)
      .withData(context.data)
      .withVariables(newVariables)
      .withConfig(context.config)
      .withMetadata(context.metadata)
      .withLogs(context.logs)
      .withErrors(context.errors)
      .build();
  }

  /**
   * 检查执行是否完成
   */
  static isCompleted(context: ExecutionContext): boolean {
    return context.status === ExecutionStatus.COMPLETED;
  }

  /**
   * 检查执行是否失败
   */
  static isFailed(context: ExecutionContext): boolean {
    return context.status === ExecutionStatus.FAILED;
  }

  /**
   * 检查执行是否正在运行
   */
  static isRunning(context: ExecutionContext): boolean {
    return context.status === ExecutionStatus.RUNNING;
  }

  /**
   * 检查执行是否已暂停
   */
  static isPaused(context: ExecutionContext): boolean {
    return context.status === ExecutionStatus.PAUSED;
  }

  /**
   * 检查执行是否已取消
   */
  static isCancelled(context: ExecutionContext): boolean {
    return context.status === ExecutionStatus.CANCELLED;
  }

  /**
   * 检查执行是否超时
   */
  static isTimeout(context: ExecutionContext): boolean {
    return context.status === ExecutionStatus.TIMEOUT;
  }

  /**
   * 检查执行是否可以暂停
   */
  static canPause(context: ExecutionContext): boolean {
    return context.status === ExecutionStatus.RUNNING;
  }

  /**
   * 检查执行是否可以恢复
   */
  static canResume(context: ExecutionContext): boolean {
    return context.status === ExecutionStatus.PAUSED;
  }

  /**
   * 检查执行是否可以取消
   */
  static canCancel(context: ExecutionContext): boolean {
    return context.status === ExecutionStatus.PENDING ||
      context.status === ExecutionStatus.RUNNING ||
      context.status === ExecutionStatus.PAUSED;
  }

  /**
   * 检查执行是否可以重试
   */
  static canRetry(context: ExecutionContext): boolean {
    return context.status === ExecutionStatus.FAILED ||
      context.status === ExecutionStatus.TIMEOUT;
  }

  /**
   * 获取执行进度
   */
  static getProgress(context: ExecutionContext): number {
    const total = context.executedNodes.length + context.pendingNodes.length;
    return total > 0 ? context.executedNodes.length / total : 0;
  }

  /**
   * 获取执行摘要
   */
  static getSummary(context: ExecutionContext): string {
    const parts = [
      `执行[${context.executionId}]`,
      `图[${context.graphId}]`,
      `状态[${context.status}]`,
      `模式[${context.mode}]`,
      `进度[${this.getProgress(context) * 100}%]`
    ];

    if (context.duration) {
      parts.push(`耗时[${context.duration}ms]`);
    }

    if (context.currentNodeId) {
      parts.push(`当前节点[${context.currentNodeId}]`);
    }

    return parts.join(' ');
  }

  /**
   * 创建执行日志
   */
  static createLog(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    nodeId?: ID,
    edgeId?: ID,
    context?: Record<string, any>,
    source?: string
  ): ExecutionLog {
    return {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level,
      message,
      timestamp: new Date(),
      nodeId,
      edgeId,
      context,
      source
    };
  }

  /**
   * 创建执行错误
   */
  static createError(
    message: string,
    type: string,
    nodeId?: ID,
    edgeId?: ID,
    retryable: boolean = false,
    context?: Record<string, any>
  ): ExecutionError {
    return {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      type,
      timestamp: new Date(),
      nodeId,
      edgeId,
      retryable,
      retryCount: 0,
      context,
      metadata: {}
    };
  }
}
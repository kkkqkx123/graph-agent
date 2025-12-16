import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { ExecutionStatus } from '../graph/execution';

/**
 * 节点执行事件基类
 */
export abstract class NodeExecutionEvent {
  /** 事件ID */
  readonly eventId: string;
  /** 执行ID */
  readonly executionId: string;
  /** 图ID */
  readonly graphId: ID;
  /** 节点ID */
  readonly nodeId: ID;
  /** 节点类型 */
  readonly nodeType: string;
  /** 事件时间 */
  readonly timestamp: Timestamp;
  /** 事件版本 */
  readonly version: Version;
  /** 事件元数据 */
  readonly metadata: Record<string, any>;

  constructor(
    executionId: string,
    graphId: ID,
    nodeId: ID,
    nodeType: string,
    metadata: Record<string, any> = {}
  ) {
    this.eventId = this.generateEventId();
    this.executionId = executionId;
    this.graphId = graphId;
    this.nodeId = nodeId;
    this.nodeType = nodeType;
    this.timestamp = Timestamp.now();
    this.version = Version.initial();
    this.metadata = metadata;
  }

  /**
   * 获取事件类型
   */
  abstract getEventType(): string;

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 序列化事件
   */
  serialize(): string {
    return JSON.stringify({
      eventId: this.eventId,
      eventType: this.getEventType(),
      executionId: this.executionId,
      graphId: this.graphId,
      nodeId: this.nodeId,
      nodeType: this.nodeType,
      timestamp: this.timestamp.toISOString(),
      version: this.version,
      metadata: this.metadata,
      data: this.getEventData()
    });
  }

  /**
   * 获取事件数据
   */
  protected abstract getEventData(): Record<string, any>;
}

/**
 * 节点执行开始事件
 */
export class NodeExecutionStartedEvent extends NodeExecutionEvent {
  constructor(
    executionId: string,
    graphId: ID,
    nodeId: ID,
    nodeType: string,
    readonly inputData: Record<string, any>,
    readonly config: Record<string, any>,
    metadata: Record<string, any> = {}
  ) {
    super(executionId, graphId, nodeId, nodeType, metadata);
  }

  getEventType(): string {
    return 'NodeExecutionStarted';
  }

  protected getEventData(): Record<string, any> {
    return {
      inputData: this.inputData,
      config: this.config
    };
  }
}

/**
 * 节点执行完成事件
 */
export class NodeExecutionCompletedEvent extends NodeExecutionEvent {
  constructor(
    executionId: string,
    graphId: ID,
    nodeId: ID,
    nodeType: string,
    readonly outputData: Record<string, any>,
    readonly duration: number,
    readonly result: any,
    metadata: Record<string, any> = {}
  ) {
    super(executionId, graphId, nodeId, nodeType, metadata);
  }

  getEventType(): string {
    return 'NodeExecutionCompleted';
  }

  protected getEventData(): Record<string, any> {
    return {
      outputData: this.outputData,
      duration: this.duration,
      result: this.result
    };
  }
}

/**
 * 节点执行失败事件
 */
export class NodeExecutionFailedEvent extends NodeExecutionEvent {
  constructor(
    executionId: string,
    graphId: ID,
    nodeId: ID,
    nodeType: string,
    readonly error: Error,
    readonly duration: number,
    readonly inputData: Record<string, any>,
    readonly retryCount: number,
    metadata: Record<string, any> = {}
  ) {
    super(executionId, graphId, nodeId, nodeType, metadata);
  }

  getEventType(): string {
    return 'NodeExecutionFailed';
  }

  protected getEventData(): Record<string, any> {
    return {
      error: {
        message: this.error.message,
        stack: this.error.stack,
        name: this.error.name
      },
      duration: this.duration,
      inputData: this.inputData,
      retryCount: this.retryCount
    };
  }
}

/**
 * 节点执行跳过事件
 */
export class NodeExecutionSkippedEvent extends NodeExecutionEvent {
  constructor(
    executionId: string,
    graphId: ID,
    nodeId: ID,
    nodeType: string,
    readonly skipReason: string,
    readonly condition: string,
    readonly conditionResult: boolean,
    metadata: Record<string, any> = {}
  ) {
    super(executionId, graphId, nodeId, nodeType, metadata);
  }

  getEventType(): string {
    return 'NodeExecutionSkipped';
  }

  protected getEventData(): Record<string, any> {
    return {
      skipReason: this.skipReason,
      condition: this.condition,
      conditionResult: this.conditionResult
    };
  }
}

/**
 * 节点执行重试事件
 */
export class NodeExecutionRetryEvent extends NodeExecutionEvent {
  constructor(
    executionId: string,
    graphId: ID,
    nodeId: ID,
    nodeType: string,
    readonly retryCount: number,
    readonly maxRetries: number,
    readonly retryDelay: number,
    readonly lastError: Error,
    metadata: Record<string, any> = {}
  ) {
    super(executionId, graphId, nodeId, nodeType, metadata);
  }

  getEventType(): string {
    return 'NodeExecutionRetry';
  }

  protected getEventData(): Record<string, any> {
    return {
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
      lastError: {
        message: this.lastError.message,
        stack: this.lastError.stack,
        name: this.lastError.name
      }
    };
  }
}

/**
 * 节点执行超时事件
 */
export class NodeExecutionTimeoutEvent extends NodeExecutionEvent {
  constructor(
    executionId: string,
    graphId: ID,
    nodeId: ID,
    nodeType: string,
    readonly timeoutDuration: number,
    readonly progress: number,
    metadata: Record<string, any> = {}
  ) {
    super(executionId, graphId, nodeId, nodeType, metadata);
  }

  getEventType(): string {
    return 'NodeExecutionTimeout';
  }

  protected getEventData(): Record<string, any> {
    return {
      timeoutDuration: this.timeoutDuration,
      progress: this.progress
    };
  }
}

/**
 * 节点执行暂停事件
 */
export class NodeExecutionPausedEvent extends NodeExecutionEvent {
  constructor(
    executionId: string,
    graphId: ID,
    nodeId: ID,
    nodeType: string,
    readonly pauseReason: string,
    readonly progress: number,
    readonly checkpoint: any,
    metadata: Record<string, any> = {}
  ) {
    super(executionId, graphId, nodeId, nodeType, metadata);
  }

  getEventType(): string {
    return 'NodeExecutionPaused';
  }

  protected getEventData(): Record<string, any> {
    return {
      pauseReason: this.pauseReason,
      progress: this.progress,
      checkpoint: this.checkpoint
    };
  }
}

/**
 * 节点执行恢复事件
 */
export class NodeExecutionResumedEvent extends NodeExecutionEvent {
  constructor(
    executionId: string,
    graphId: ID,
    nodeId: ID,
    nodeType: string,
    readonly resumeReason: string,
    readonly checkpoint: any,
    metadata: Record<string, any> = {}
  ) {
    super(executionId, graphId, nodeId, nodeType, metadata);
  }

  getEventType(): string {
    return 'NodeExecutionResumed';
  }

  protected getEventData(): Record<string, any> {
    return {
      resumeReason: this.resumeReason,
      checkpoint: this.checkpoint
    };
  }
}

/**
 * 节点执行进度更新事件
 */
export class NodeExecutionProgressEvent extends NodeExecutionEvent {
  constructor(
    executionId: string,
    graphId: ID,
    nodeId: ID,
    nodeType: string,
    readonly progress: number,
    readonly message?: string,
    readonly details?: Record<string, any>,
    metadata: Record<string, any> = {}
  ) {
    super(executionId, graphId, nodeId, nodeType, metadata);
  }

  getEventType(): string {
    return 'NodeExecutionProgress';
  }

  protected getEventData(): Record<string, any> {
    return {
      progress: this.progress,
      message: this.message,
      details: this.details
    };
  }
}

/**
 * 节点执行日志事件
 */
export class NodeExecutionLogEvent extends NodeExecutionEvent {
  constructor(
    executionId: string,
    graphId: ID,
    nodeId: ID,
    nodeType: string,
    readonly level: 'debug' | 'info' | 'warn' | 'error',
    readonly message: string,
    readonly details?: Record<string, any>,
    metadata: Record<string, any> = {}
  ) {
    super(executionId, graphId, nodeId, nodeType, metadata);
  }

  getEventType(): string {
    return 'NodeExecutionLog';
  }

  protected getEventData(): Record<string, any> {
    return {
      level: this.level,
      message: this.message,
      details: this.details
    };
  }
}
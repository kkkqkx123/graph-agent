import { GraphId } from '../entities/graph';
import { NodeId } from '../entities/node';
import { EdgeId } from '../entities/edge';
import { ExecutionStatus, ExecutionMode, ExecutionPriority } from '../execution';

/**
 * 图执行事件基类
 */
export abstract class GraphExecutionEvent {
  /** 事件ID */
  readonly eventId: string;
  /** 执行ID */
  readonly executionId: string;
  /** 图ID */
  readonly graphId: GraphId;
  /** 事件时间 */
  readonly timestamp: Date;
  /** 事件版本 */
  readonly version: number;
  /** 事件元数据 */
  readonly metadata: Record<string, any>;

  constructor(
    executionId: string,
    graphId: GraphId,
    metadata: Record<string, any> = {}
  ) {
    this.eventId = this.generateEventId();
    this.executionId = executionId;
    this.graphId = graphId;
    this.timestamp = new Date();
    this.version = 1;
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
 * 图执行开始事件
 */
export class GraphExecutionStartedEvent extends GraphExecutionEvent {
  constructor(
    executionId: string,
    graphId: GraphId,
    readonly mode: ExecutionMode,
    readonly priority: ExecutionPriority,
    readonly inputData: Record<string, any>,
    readonly config: Record<string, any>,
    metadata: Record<string, any> = {}
  ) {
    super(executionId, graphId, metadata);
  }

  getEventType(): string {
    return 'GraphExecutionStarted';
  }

  protected getEventData(): Record<string, any> {
    return {
      mode: this.mode,
      priority: this.priority,
      inputData: this.inputData,
      config: this.config
    };
  }
}

/**
 * 图执行完成事件
 */
export class GraphExecutionCompletedEvent extends GraphExecutionEvent {
  constructor(
    executionId: string,
    graphId: GraphId,
    readonly outputData: Record<string, any>,
    readonly duration: number,
    readonly executedNodes: NodeId[],
    readonly executedEdges: EdgeId[],
    readonly statistics: Record<string, any>,
    metadata: Record<string, any> = {}
  ) {
    super(executionId, graphId, metadata);
  }

  getEventType(): string {
    return 'GraphExecutionCompleted';
  }

  protected getEventData(): Record<string, any> {
    return {
      outputData: this.outputData,
      duration: this.duration,
      executedNodes: this.executedNodes,
      executedEdges: this.executedEdges,
      statistics: this.statistics
    };
  }
}

/**
 * 图执行失败事件
 */
export class GraphExecutionFailedEvent extends GraphExecutionEvent {
  constructor(
    executionId: string,
    graphId: GraphId,
    readonly error: Error,
    readonly duration: number,
    readonly executedNodes: NodeId[],
    readonly executedEdges: EdgeId[],
    readonly failurePoint: {
      nodeId?: NodeId;
      edgeId?: EdgeId;
      phase: string;
    },
    metadata: Record<string, any> = {}
  ) {
    super(executionId, graphId, metadata);
  }

  getEventType(): string {
    return 'GraphExecutionFailed';
  }

  protected getEventData(): Record<string, any> {
    return {
      error: {
        message: this.error.message,
        stack: this.error.stack,
        name: this.error.name
      },
      duration: this.duration,
      executedNodes: this.executedNodes,
      executedEdges: this.executedEdges,
      failurePoint: this.failurePoint
    };
  }
}

/**
 * 图执行暂停事件
 */
export class GraphExecutionPausedEvent extends GraphExecutionEvent {
  constructor(
    executionId: string,
    graphId: GraphId,
    readonly pauseReason: string,
    readonly currentNodeId: NodeId,
    readonly progress: number,
    metadata: Record<string, any> = {}
  ) {
    super(executionId, graphId, metadata);
  }

  getEventType(): string {
    return 'GraphExecutionPaused';
  }

  protected getEventData(): Record<string, any> {
    return {
      pauseReason: this.pauseReason,
      currentNodeId: this.currentNodeId,
      progress: this.progress
    };
  }
}

/**
 * 图执行恢复事件
 */
export class GraphExecutionResumedEvent extends GraphExecutionEvent {
  constructor(
    executionId: string,
    graphId: GraphId,
    readonly resumeReason: string,
    readonly currentNodeId: NodeId,
    metadata: Record<string, any> = {}
  ) {
    super(executionId, graphId, metadata);
  }

  getEventType(): string {
    return 'GraphExecutionResumed';
  }

  protected getEventData(): Record<string, any> {
    return {
      resumeReason: this.resumeReason,
      currentNodeId: this.currentNodeId
    };
  }
}

/**
 * 图执行取消事件
 */
export class GraphExecutionCancelledEvent extends GraphExecutionEvent {
  constructor(
    executionId: string,
    graphId: GraphId,
    readonly cancelReason: string,
    readonly cancelledBy: string,
    readonly progress: number,
    metadata: Record<string, any> = {}
  ) {
    super(executionId, graphId, metadata);
  }

  getEventType(): string {
    return 'GraphExecutionCancelled';
  }

  protected getEventData(): Record<string, any> {
    return {
      cancelReason: this.cancelReason,
      cancelledBy: this.cancelledBy,
      progress: this.progress
    };
  }
}

/**
 * 图执行超时事件
 */
export class GraphExecutionTimeoutEvent extends GraphExecutionEvent {
  constructor(
    executionId: string,
    graphId: GraphId,
    readonly timeoutDuration: number,
    readonly currentNodeId: NodeId,
    readonly progress: number,
    metadata: Record<string, any> = {}
  ) {
    super(executionId, graphId, metadata);
  }

  getEventType(): string {
    return 'GraphExecutionTimeout';
  }

  protected getEventData(): Record<string, any> {
    return {
      timeoutDuration: this.timeoutDuration,
      currentNodeId: this.currentNodeId,
      progress: this.progress
    };
  }
}

/**
 * 图执行进度更新事件
 */
export class GraphExecutionProgressEvent extends GraphExecutionEvent {
  constructor(
    executionId: string,
    graphId: GraphId,
    readonly progress: number,
    readonly currentNodeId: NodeId,
    readonly executedNodes: NodeId[],
    readonly pendingNodes: NodeId[],
    readonly estimatedTimeRemaining?: number,
    metadata: Record<string, any> = {}
  ) {
    super(executionId, graphId, metadata);
  }

  getEventType(): string {
    return 'GraphExecutionProgress';
  }

  protected getEventData(): Record<string, any> {
    return {
      progress: this.progress,
      currentNodeId: this.currentNodeId,
      executedNodes: this.executedNodes,
      pendingNodes: this.pendingNodes,
      estimatedTimeRemaining: this.estimatedTimeRemaining
    };
  }
}
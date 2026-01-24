import { ValueObject, ID, Timestamp } from '../../common/value-objects';
import { NodeId, NodeStatus } from '../../workflow/value-objects';
import { ValidationError } from '../../../common/exceptions';

/**
 * LLM调用记录接口
 */
export interface LLMCallRecord {
  readonly callId: ID;
  readonly model: string;
  readonly prompt: string;
  readonly response: string;
  readonly tokenUsage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  readonly cost: number;
  readonly currency: string;
  readonly duration: number;
  readonly timestamp: Timestamp;
  readonly metadata: Record<string, unknown>;
}

/**
 * 工具调用记录接口
 */
export interface ToolCallRecord {
  readonly callId: ID;
  readonly toolName: string;
  readonly parameters: Record<string, unknown>;
  readonly result?: unknown;
  readonly error?: Error;
  readonly duration: number;
  readonly timestamp: Timestamp;
  readonly metadata: Record<string, unknown>;
}

/**
 * 执行步骤接口
 */
export interface ExecutionStep {
  readonly stepId: string;
  readonly name: string;
  readonly startTime: Timestamp;
  readonly endTime?: Timestamp;
  readonly status: NodeStatus;
  readonly input?: unknown;
  readonly output?: unknown;
  readonly error?: Error;
  readonly metadata?: Record<string, unknown>;
}

/**
 * 重试信息接口
 */
export interface RetryInfo {
  readonly maxRetries: number;
  readonly currentRetry: number;
  readonly retryDelay: number;
  readonly lastRetryAt?: Timestamp;
  readonly retryReason?: string;
}

/**
 * 节点执行错误接口
 */
export interface NodeExecutionError {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
  readonly stack?: string;
  readonly timestamp: Timestamp;
}

/**
 * NodeExecution值对象属性接口
 */
export interface NodeExecutionProps {
  readonly nodeId: NodeId;
  readonly status: NodeStatus;
  readonly startTime?: Timestamp;
  readonly endTime?: Timestamp;
  readonly duration?: number;
  readonly result?: unknown;
  readonly error?: NodeExecutionError;
  readonly llmCalls: LLMCallRecord[];
  readonly toolCalls: ToolCallRecord[];
  readonly executionSteps: ExecutionStep[];
  readonly retryInfo: RetryInfo;
  readonly metadata: Record<string, unknown>;
}

/**
 * NodeExecution值对象
 *
 * 表示单个节点的执行状态，包含详细的执行信息
 */
export class NodeExecution extends ValueObject<NodeExecutionProps> {
  /**
   * 创建节点执行
   * @param nodeId 节点ID
   * @returns 节点执行实例
   */
  public static create(nodeId: NodeId): NodeExecution {
    return new NodeExecution({
      nodeId,
      status: NodeStatus.pending(),
      retryInfo: {
        maxRetries: 3,
        currentRetry: 0,
        retryDelay: 1000,
      },
      llmCalls: [],
      toolCalls: [],
      executionSteps: [],
      metadata: {},
    });
  }

  /**
   * 从已有属性重建节点执行
   * @param props 节点执行属性
   * @returns 节点执行实例
   */
  public static fromProps(props: NodeExecutionProps): NodeExecution {
    return new NodeExecution(props);
  }

  /**
   * 获取节点ID
   * @returns 节点ID
   */
  public get nodeId(): NodeId {
    return this.props.nodeId;
  }

  /**
   * 获取执行状态
   * @returns 执行状态
   */
  public get status(): NodeStatus {
    return this.props.status;
  }

  /**
   * 获取开始时间
   * @returns 开始时间
   */
  public get startTime(): Timestamp | undefined {
    return this.props.startTime;
  }

  /**
   * 获取结束时间
   * @returns 结束时间
   */
  public get endTime(): Timestamp | undefined {
    return this.props.endTime;
  }

  /**
   * 获取执行时长
   * @returns 执行时长（毫秒）
   */
  public get duration(): number | undefined {
    return this.props.duration;
  }

  /**
   * 获取执行结果
   * @returns 执行结果
   */
  public get result(): unknown | undefined {
    return this.props.result;
  }

  /**
   * 获取错误信息
   * @returns 错误信息
   */
  public get error(): NodeExecutionError | undefined {
    return this.props.error;
  }

  /**
   * 获取LLM调用记录
   * @returns LLM调用记录数组
   */
  public get llmCalls(): LLMCallRecord[] {
    return [...this.props.llmCalls];
  }

  /**
   * 获取工具调用记录
   * @returns 工具调用记录数组
   */
  public get toolCalls(): ToolCallRecord[] {
    return [...this.props.toolCalls];
  }

  /**
   * 获取执行步骤
   * @returns 执行步骤数组
   */
  public get executionSteps(): ExecutionStep[] {
    return [...this.props.executionSteps];
  }

  /**
   * 获取重试信息
   * @returns 重试信息
   */
  public get retryInfo(): RetryInfo {
    return { ...this.props.retryInfo };
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 开始执行
   * @returns 新的节点执行实例
   */
  public start(): NodeExecution {
    if (!this.props.status.canStart()) {
      throw new ValidationError(`节点状态不允许开始执行: ${this.props.status.toString()}`);
    }

    return new NodeExecution({
      ...this.props,
      status: NodeStatus.running(),
      startTime: Timestamp.now(),
    });
  }

  /**
   * 完成执行
   * @param result 执行结果
   * @returns 新的节点执行实例
   */
  public complete(result?: unknown): NodeExecution {
    if (!this.props.status.isRunning()) {
      throw new ValidationError(`节点状态不允许完成: ${this.props.status.toString()}`);
    }

    const now = Timestamp.now();
    const duration = this.props.startTime ? now.diff(this.props.startTime) : 0;

    return new NodeExecution({
      ...this.props,
      status: NodeStatus.completed(),
      result,
      endTime: now,
      duration,
    });
  }

  /**
   * 标记失败
   * @param error 错误信息
   * @returns 新的节点执行实例
   */
  public fail(error: NodeExecutionError): NodeExecution {
    if (!this.props.status.isRunning()) {
      throw new ValidationError(`节点状态不允许标记失败: ${this.props.status.toString()}`);
    }

    const now = Timestamp.now();
    const duration = this.props.startTime ? now.diff(this.props.startTime) : 0;

    return new NodeExecution({
      ...this.props,
      status: NodeStatus.failed(),
      error,
      endTime: now,
      duration,
    });
  }

  /**
   * 跳过执行
   * @param reason 跳过原因
   * @returns 新的节点执行实例
   */
  public skip(reason?: string): NodeExecution {
    if (!this.props.status.canStart()) {
      throw new ValidationError(`节点状态不允许跳过: ${this.props.status.toString()}`);
    }

    return new NodeExecution({
      ...this.props,
      status: NodeStatus.skipped(),
      result: { skipped: true, reason },
      endTime: Timestamp.now(),
    });
  }

  /**
   * 取消执行
   * @returns 新的节点执行实例
   */
  public cancel(): NodeExecution {
    if (!this.props.status.canCancel()) {
      throw new ValidationError(`节点状态不允许取消: ${this.props.status.toString()}`);
    }

    const now = Timestamp.now();
    const duration = this.props.startTime ? now.diff(this.props.startTime) : 0;

    return new NodeExecution({
      ...this.props,
      status: NodeStatus.cancelled(),
      endTime: now,
      duration,
    });
  }

  /**
   * 重试执行
   * @returns 新的节点执行实例
   */
  public retry(): NodeExecution {
    if (!this.props.status.canRetry()) {
      throw new ValidationError(`节点状态不允许重试: ${this.props.status.toString()}`);
    }

    if (this.props.retryInfo.currentRetry >= this.props.retryInfo.maxRetries) {
      throw new ValidationError('已达到最大重试次数');
    }

    return new NodeExecution({
      ...this.props,
      status: NodeStatus.pending(),
      retryInfo: {
        ...this.props.retryInfo,
        currentRetry: this.props.retryInfo.currentRetry + 1,
        lastRetryAt: Timestamp.now(),
      },
      startTime: undefined,
      endTime: undefined,
      duration: undefined,
      error: undefined,
    });
  }

  /**
   * 添加LLM调用记录
   * @param llmCall LLM调用记录
   * @returns 新的节点执行实例
   */
  public addLLMCall(llmCall: LLMCallRecord): NodeExecution {
    return new NodeExecution({
      ...this.props,
      llmCalls: [...this.props.llmCalls, llmCall],
    });
  }

  /**
   * 添加工具调用记录
   * @param toolCall 工具调用记录
   * @returns 新的节点执行实例
   */
  public addToolCall(toolCall: ToolCallRecord): NodeExecution {
    return new NodeExecution({
      ...this.props,
      toolCalls: [...this.props.toolCalls, toolCall],
    });
  }

  /**
   * 添加执行步骤
   * @param step 执行步骤
   * @returns 新的节点执行实例
   */
  public addExecutionStep(step: ExecutionStep): NodeExecution {
    return new NodeExecution({
      ...this.props,
      executionSteps: [...this.props.executionSteps, step],
    });
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   * @returns 新的节点执行实例
   */
  public updateMetadata(metadata: Record<string, unknown>): NodeExecution {
    return new NodeExecution({
      ...this.props,
      metadata: { ...this.props.metadata, ...metadata },
    });
  }

  /**
   * 创建快照
   * @returns 节点执行快照
   */
  public createSnapshot(): NodeExecutionSnapshot {
    return {
      nodeId: this.props.nodeId,
      status: this.props.status,
      startTime: this.props.startTime,
      endTime: this.props.endTime,
      duration: this.props.duration,
      result: this.props.result,
      error: this.props.error,
      llmCalls: [...this.props.llmCalls],
      toolCalls: [...this.props.toolCalls],
      executionSteps: [...this.props.executionSteps],
      retryInfo: { ...this.props.retryInfo },
      metadata: { ...this.props.metadata },
      snapshotAt: Timestamp.now(),
    };
  }

  /**
   * 验证值对象的有效性
   */
  public validate(): void {
    // 基本数据验证
    if (!this.props.nodeId) {
      throw new ValidationError('节点ID不能为空');
    }

    if (!this.props.status) {
      throw new ValidationError('节点状态不能为空');
    }

    if (this.props.duration !== undefined && this.props.duration < 0) {
      throw new ValidationError('执行时长不能为负数');
    }

    if (this.props.retryInfo.currentRetry < 0) {
      throw new ValidationError('重试次数不能为负数');
    }

    if (this.props.retryInfo.maxRetries < 0) {
      throw new ValidationError('最大重试次数不能为负数');
    }

    if (this.props.retryInfo.currentRetry > this.props.retryInfo.maxRetries) {
      throw new ValidationError('当前重试次数不能超过最大重试次数');
    }

    // 业务逻辑验证已移到应用层
  }
}

/**
 * 节点执行快照接口
 */
export interface NodeExecutionSnapshot {
  readonly nodeId: NodeId;
  readonly status: NodeStatus;
  readonly startTime?: Timestamp;
  readonly endTime?: Timestamp;
  readonly duration?: number;
  readonly result?: unknown;
  readonly error?: NodeExecutionError;
  readonly llmCalls: LLMCallRecord[];
  readonly toolCalls: ToolCallRecord[];
  readonly executionSteps: ExecutionStep[];
  readonly retryInfo: RetryInfo;
  readonly metadata: Record<string, unknown>;
  readonly snapshotAt: Timestamp;
}

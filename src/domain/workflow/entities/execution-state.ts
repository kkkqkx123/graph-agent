import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { ExecutionStatus } from '../value-objects/execution-status';
import { WorkflowState } from './workflow-state';
import { NodeExecutionState } from './node-execution-state';
import { PromptContext } from '../value-objects/prompt-context';
import { NodeId } from '../value-objects/node-id';

/**
 * 执行步骤接口
 */
export interface ExecutionStep {
  /** 步骤ID */
  stepId: string;
  /** 节点ID */
  nodeId: NodeId;
  /** 步骤名称 */
  name: string;
  /** 开始时间 */
  startTime: Timestamp;
  /** 结束时间 */
  endTime?: Timestamp;
  /** 状态 */
  status: ExecutionStatus;
  /** 输入数据 */
  input?: unknown;
  /** 输出数据 */
  output?: unknown;
  /** 错误信息 */
  error?: Error;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 执行状态属性接口
 */
export interface ExecutionStateProps {
  /** 执行ID */
  executionId: ID;
  /** 工作流ID */
  workflowId: ID;
  /** 线程ID */
  threadId: ID;
  /** 执行状态 */
  status: ExecutionStatus;
  /** 工作流状态 */
  workflowState: WorkflowState;
  /** 节点执行状态映射 */
  nodeStates: Map<string, NodeExecutionState>;
  /** 提示词上下文 */
  promptContext: PromptContext;
  /** 执行变量 */
  variables: Map<string, unknown>;
  /** 执行历史 */
  executionHistory: ExecutionStep[];
  /** 开始时间 */
  startTime?: Timestamp;
  /** 结束时间 */
  endTime?: Timestamp;
  /** 执行时长（毫秒） */
  duration?: number;
  /** 元数据 */
  metadata: Record<string, unknown>;
  /** 创建时间 */
  createdAt: Timestamp;
  /** 更新时间 */
  updatedAt: Timestamp;
  /** 版本 */
  version: Version;
}

/**
 * 执行状态实体
 *
 * 表示工作流执行的完整状态，包含工作流状态、节点状态和上下文
 */
export class ExecutionState extends Entity {
  private readonly props: ExecutionStateProps;

  /**
   * 构造函数
   * @param props 执行状态属性
   */
  private constructor(props: ExecutionStateProps) {
    super(
      props.executionId,
      props.createdAt,
      props.updatedAt,
      props.version
    );
    this.props = Object.freeze(props);
  }

  /**
   * 创建执行状态
   * @param workflowId 工作流ID
   * @param threadId 线程ID
   * @param promptContext 提示词上下文
   * @param totalNodes 总节点数
   * @returns 执行状态实例
   */
  public static create(
    workflowId: ID,
    threadId: ID,
    promptContext: PromptContext,
    totalNodes: number = 0
  ): ExecutionState {
    const now = Timestamp.now();
    const executionId = ID.generate();
    const workflowState = WorkflowState.create(workflowId, totalNodes);

    const props: ExecutionStateProps = {
      executionId,
      workflowId,
      threadId,
      status: ExecutionStatus.pending(),
      workflowState,
      nodeStates: new Map(),
      promptContext,
      variables: new Map(),
      executionHistory: [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial()
    };
    return new ExecutionState(props);
  }

  /**
   * 从已有属性重建执行状态
   * @param props 执行状态属性
   * @returns 执行状态实例
   */
  public static fromProps(props: ExecutionStateProps): ExecutionState {
    return new ExecutionState(props);
  }

  /**
   * 获取执行ID
   * @returns 执行ID
   */
  public get executionId(): ID {
    return this.props.executionId;
  }

  /**
   * 获取工作流ID
   * @returns 工作流ID
   */
  public get workflowId(): ID {
    return this.props.workflowId;
  }

  /**
   * 获取线程ID
   * @returns 线程ID
   */
  public get threadId(): ID {
    return this.props.threadId;
  }

  /**
   * 获取执行状态
   * @returns 执行状态
   */
  public get status(): ExecutionStatus {
    return this.props.status;
  }

  /**
   * 获取工作流状态
   * @returns 工作流状态
   */
  public get workflowState(): WorkflowState {
    return this.props.workflowState;
  }

  /**
   * 获取节点执行状态映射
   * @returns 节点执行状态映射
   */
  public get nodeStates(): Map<string, NodeExecutionState> {
    return new Map(this.props.nodeStates);
  }

  /**
   * 获取提示词上下文
   * @returns 提示词上下文
   */
  public get promptContext(): PromptContext {
    return this.props.promptContext;
  }

  /**
   * 获取执行变量
   * @returns 执行变量映射
   */
  public get variables(): Map<string, unknown> {
    return new Map(this.props.variables);
  }

  /**
   * 获取执行历史
   * @returns 执行历史数组
   */
  public get executionHistory(): ExecutionStep[] {
    return [...this.props.executionHistory];
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
   * 获取元数据
   * @returns 元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 检查是否正在执行
   * @returns 是否正在执行
   */
  public isRunning(): boolean {
    return this.props.status.isRunning();
  }

  /**
   * 检查是否已完成
   * @returns 是否已完成
   */
  public isCompleted(): boolean {
    return this.props.status.isCompleted();
  }

  /**
   * 检查是否失败
   * @returns 是否失败
   */
  public isFailed(): boolean {
    return this.props.status.isFailed();
  }

  /**
   * 获取节点执行状态
   * @param nodeId 节点ID
   * @returns 节点执行状态
   */
  public getNodeState(nodeId: NodeId): NodeExecutionState | undefined {
    return this.props.nodeStates.get(nodeId.toString());
  }

  /**
   * 检查节点是否存在
   * @param nodeId 节点ID
   * @returns 是否存在
   */
  public hasNodeState(nodeId: NodeId): boolean {
    return this.props.nodeStates.has(nodeId.toString());
  }

  /**
   * 获取变量值
   * @param key 变量名
   * @returns 变量值
   */
  public getVariable(key: string): unknown | undefined {
    return this.props.variables.get(key);
  }

  /**
   * 检查变量是否存在
   * @param key 变量名
   * @returns 是否存在
   */
  public hasVariable(key: string): boolean {
    return this.props.variables.has(key);
  }

  /**
   * 开始执行
   */
  public start(): void {
    if (!this.props.status.canStart()) {
      throw new Error(`执行状态不允许开始: ${this.props.status.toString()}`);
    }

    const now = Timestamp.now();
    (this.props as any).status = ExecutionStatus.running();
    (this.props as any).startTime = now;
    (this.props as any).workflowState = this.props.workflowState;
    this.props.workflowState.start();
    this.update();
  }

  /**
   * 完成执行
   */
  public complete(): void {
    if (!this.props.status.isRunning()) {
      throw new Error(`执行状态不允许完成: ${this.props.status.toString()}`);
    }

    const now = Timestamp.now();
    const duration = this.props.startTime ? now.diff(this.props.startTime) : 0;

    (this.props as any).status = ExecutionStatus.completed();
    (this.props as any).endTime = now;
    (this.props as any).duration = duration;
    this.props.workflowState.complete();
    this.update();
  }

  /**
   * 标记失败
   * @param error 错误信息
   */
  public fail(error: Error): void {
    if (!this.props.status.isRunning()) {
      throw new Error(`执行状态不允许标记失败: ${this.props.status.toString()}`);
    }

    const now = Timestamp.now();
    const duration = this.props.startTime ? now.diff(this.props.startTime) : 0;

    (this.props as any).status = ExecutionStatus.failed();
    (this.props as any).endTime = now;
    (this.props as any).duration = duration;
    (this.props as any).metadata = { ...this.props.metadata, error: error.message };
    this.props.workflowState.fail(error);
    this.update();
  }

  /**
   * 暂停执行
   */
  public pause(): void {
    if (!this.props.status.canPause()) {
      throw new Error(`执行状态不允许暂停: ${this.props.status.toString()}`);
    }

    (this.props as any).status = ExecutionStatus.paused();
    this.props.workflowState.pause();
    this.update();
  }

  /**
   * 恢复执行
   */
  public resume(): void {
    if (!this.props.status.canResume()) {
      throw new Error(`执行状态不允许恢复: ${this.props.status.toString()}`);
    }

    (this.props as any).status = ExecutionStatus.running();
    this.props.workflowState.resume();
    this.update();
  }

  /**
   * 取消执行
   */
  public cancel(): void {
    if (!this.props.status.canCancel()) {
      throw new Error(`执行状态不允许取消: ${this.props.status.toString()}`);
    }

    const now = Timestamp.now();
    const duration = this.props.startTime ? now.diff(this.props.startTime) : 0;

    (this.props as any).status = ExecutionStatus.cancelled();
    (this.props as any).endTime = now;
    (this.props as any).duration = duration;
    this.props.workflowState.cancel();
    this.update();
  }

  /**
   * 添加节点执行状态
   * @param nodeState 节点执行状态
   */
  public addNodeState(nodeState: NodeExecutionState): void {
    const nodeId = nodeState.nodeId.toString();
    if (this.props.nodeStates.has(nodeId)) {
      throw new Error(`节点状态已存在: ${nodeId}`);
    }
    (this.props as any).nodeStates = new Map(this.props.nodeStates);
    this.props.nodeStates.set(nodeId, nodeState);
    this.update();
  }

  /**
   * 更新节点执行状态
   * @param nodeState 节点执行状态
   */
  public updateNodeState(nodeState: NodeExecutionState): void {
    const nodeId = nodeState.nodeId.toString();
    if (!this.props.nodeStates.has(nodeId)) {
      throw new Error(`节点状态不存在: ${nodeId}`);
    }
    (this.props as any).nodeStates = new Map(this.props.nodeStates);
    this.props.nodeStates.set(nodeId, nodeState);
    this.update();
  }

  /**
   * 设置变量
   * @param key 变量名
   * @param value 变量值
   */
  public setVariable(key: string, value: unknown): void {
    (this.props as any).variables = new Map(this.props.variables);
    this.props.variables.set(key, value);
    this.update();
  }

  /**
   * 批量设置变量
   * @param variables 变量映射
   */
  public setVariables(variables: Map<string, unknown>): void {
    const newVariables = new Map(this.props.variables);
    for (const [key, value] of variables.entries()) {
      newVariables.set(key, value);
    }
    (this.props as any).variables = newVariables;
    this.update();
  }

  /**
   * 更新提示词上下文
   * @param promptContext 新的提示词上下文
   */
  public updatePromptContext(promptContext: PromptContext): void {
    (this.props as any).promptContext = promptContext;
    this.update();
  }

  /**
   * 添加执行步骤
   * @param step 执行步骤
   */
  public addExecutionStep(step: ExecutionStep): void {
    (this.props as any).executionHistory = [...this.props.executionHistory, step];
    this.update();
  }

  /**
   * 更新元数据
   * @param metadata 新元数据
   */
  public updateMetadata(metadata: Record<string, unknown>): void {
    (this.props as any).metadata = { ...this.props.metadata, ...metadata };
    this.update();
  }

  /**
   * 更新实体
   */
  protected override update(): void {
    (this.props as any).updatedAt = Timestamp.now();
    (this.props as any).version = this.props.version.nextPatch();
    super.update();
  }

  /**
   * 获取执行状态的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return `ExecutionState(executionId=${this.props.executionId.toString()}, workflowId=${this.props.workflowId.toString()}, status=${this.props.status.toString()}, nodes=${this.props.nodeStates.size})`;
  }
}
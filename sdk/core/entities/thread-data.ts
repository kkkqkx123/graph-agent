/**
 * 线程数据结构（ThreadData）
 *
 * 设计说明：
 * - ThreadData 是 Thread 接口的实现类
 * - 提供线程的基本数据存储和查询功能
 * - 作为核心实体，放在 core/entities 目录
 *
 * 核心职责：
 * - 存储线程的执行状态和上下文
 * - 提供线程的查询方法
 * - 作为无状态数据结构，不包含执行逻辑
 *
 * 使用场景：
 * - 工作流执行实例的表示
 * - 线程状态管理和持久化
 * - 线程历史记录和审计
 *
 * 注意事项：
 * - ThreadData 是无状态的数据结构，构建完成后不应被修改
 * - 线程的执行逻辑由 ThreadExecutor 负责
 * - 运行时通过 ThreadRegistry 管理，确保不可变性
 */

import type {
  Thread,
  ID,
  Timestamp,
  Version,
  PreprocessedGraph,
  ThreadStatus,
  ThreadType,
  ThreadVariable,
  NodeExecutionResult,
  VariableScopes,
  ForkJoinContext,
  TriggeredSubworkflowContext,
  SDKError
} from '@modular-agent/types';

/**
 * 线程数据结构类
 * 核心职责：存储和管理线程的执行状态和上下文
 * 不包含执行逻辑，仅提供基础的线程操作
 */
export class ThreadData implements Thread {
  /** 线程唯一标识符 */
  public readonly id: ID;
  /** 关联的工作流ID */
  public readonly workflowId: ID;
  /** 工作流版本 */
  public readonly workflowVersion: Version;
  /** 线程状态 */
  public status: ThreadStatus;
  /** 当前执行节点ID */
  public currentNodeId: ID;
  /** 预处理后的工作流图结构 */
  public readonly graph: PreprocessedGraph;
  /** 变量数组（用于持久化和元数据） */
  public variables: ThreadVariable[];
  /** 四级作用域变量存储 */
  public variableScopes: VariableScopes;
  /** 输入数据（作为特殊变量，可通过路径访问） */
  public input: Record<string, any>;
  /** 输出数据（作为特殊变量，可通过路径访问） */
  public output: Record<string, any>;
  /** 执行历史记录（按执行顺序存储） */
  public nodeResults: NodeExecutionResult[];
  /** 开始时间 */
  public readonly startTime: Timestamp;
  /** 结束时间 */
  public endTime?: Timestamp;
  /** 错误信息数组 */
  public errors: (SDKError | Error | unknown)[];
  /** 上下文数据（用于存储 Conversation 等实例） */
  public contextData?: Record<string, any>;
  /** 暂停标志（运行时控制）*/
  public shouldPause?: boolean;
  /** 停止标志（运行时控制）*/
  public shouldStop?: boolean;
  /** 线程类型 */
  public readonly threadType?: ThreadType;
  /** FORK/JOIN上下文 */
  public readonly forkJoinContext?: ForkJoinContext;
  /** Triggered子工作流上下文 */
  public readonly triggeredSubworkflowContext?: TriggeredSubworkflowContext;

  constructor(data: Thread) {
    this.id = data.id;
    this.workflowId = data.workflowId;
    this.workflowVersion = data.workflowVersion;
    this.status = data.status;
    this.currentNodeId = data.currentNodeId;
    this.graph = data.graph;
    this.variables = data.variables ? [...data.variables] : [];
    this.variableScopes = data.variableScopes ? {
      global: { ...data.variableScopes.global },
      thread: { ...data.variableScopes.thread },
      local: [...data.variableScopes.local],
      loop: [...data.variableScopes.loop]
    } : {
      global: {},
      thread: {},
      local: [],
      loop: []
    };
    this.input = data.input ? { ...data.input } : {};
    this.output = data.output ? { ...data.output } : {};
    this.nodeResults = data.nodeResults ? [...data.nodeResults] : [];
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.errors = data.errors ? [...data.errors] : [];
    this.contextData = data.contextData ? { ...data.contextData } : undefined;
    this.shouldPause = data.shouldPause;
    this.shouldStop = data.shouldStop;
    this.threadType = data.threadType;
    this.forkJoinContext = data.forkJoinContext;
    this.triggeredSubworkflowContext = data.triggeredSubworkflowContext;
  }

  /**
   * 添加节点执行结果
   * 注意：此方法仅用于执行阶段，构建阶段不应调用
   */
  addNodeResult(result: NodeExecutionResult): void {
    this.nodeResults.push(result);
  }

  /**
   * 添加错误信息
   * 注意：此方法仅用于执行阶段，构建阶段不应调用
   */
  addError(error: SDKError | Error | unknown): void {
    this.errors.push(error);
  }

  /**
   * 获取最新的节点执行结果
   */
  getLatestNodeResult(): NodeExecutionResult | undefined {
    return this.nodeResults[this.nodeResults.length - 1];
  }

  /**
   * 获取指定节点的执行结果
   */
  getNodeResult(nodeId: ID): NodeExecutionResult | undefined {
    return this.nodeResults.find(result => result.nodeId === nodeId);
  }

  /**
   * 获取执行时长（毫秒）
   */
  getExecutionDuration(): number {
    if (!this.endTime) {
      return 0;
    }
    return this.endTime - this.startTime;
  }

  /**
   * 检查是否正在执行
   */
  isRunning(): boolean {
    return this.status === 'RUNNING';
  }

  /**
   * 检查是否已完成
   */
  isCompleted(): boolean {
    return this.status === 'COMPLETED';
  }

  /**
   * 检查是否已失败
   */
  isFailed(): boolean {
    return this.status === 'FAILED';
  }

  /**
   * 检查是否已暂停
   */
  isPaused(): boolean {
    return this.status === 'PAUSED';
  }

  /**
   * 检查是否已取消
   */
  isCancelled(): boolean {
    return this.status === 'CANCELLED';
  }

  /**
   * 检查是否已创建
   */
  isCreated(): boolean {
    return this.status === 'CREATED';
  }

  /**
   * 检查是否超时
   */
  isTimeout(): boolean {
    return this.status === 'TIMEOUT';
  }

  /**
   * 检查是否有错误
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * 检查是否为主线程
   */
  isMainThread(): boolean {
    return this.threadType === 'MAIN' || this.threadType === undefined;
  }

  /**
   * 检查是否为FORK线程
   */
  isForkThread(): boolean {
    return this.threadType === 'FORK_JOIN';
  }

  /**
   * 检查是否为触发子工作流线程
   */
  isTriggeredSubworkflowThread(): boolean {
    return this.threadType === 'TRIGGERED_SUBWORKFLOW';
  }

  /**
   * 检查是否应该暂停
   */
  shouldPauseExecution(): boolean {
    return this.shouldPause === true;
  }

  /**
   * 检查是否应该停止
   */
  shouldStopExecution(): boolean {
    return this.shouldStop === true;
  }

  /**
   * 获取已执行的节点数量
   */
  getExecutedNodeCount(): number {
    return this.nodeResults.length;
  }

  /**
   * 获取成功执行的节点数量
   */
  getSuccessNodeCount(): number {
    return this.nodeResults.filter(result => result.status === 'COMPLETED').length;
  }

  /**
   * 获取失败的节点数量
   */
  getFailedNodeCount(): number {
    return this.nodeResults.filter(result => result.status === 'FAILED').length;
  }

  /**
   * 获取跳过的节点数量
   */
  getSkippedNodeCount(): number {
    return this.nodeResults.filter(result => result.status === 'SKIPPED').length;
  }

  /**
   * 获取正在执行的节点数量
   */
  getRunningNodeCount(): number {
    return this.nodeResults.filter(result => result.status === 'RUNNING').length;
  }

  /**
   * 获取指定状态的节点执行结果
   * @param status 节点状态
   * @returns 节点执行结果数组
   */
  getNodeResultsByStatus(status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'CANCELLED'): NodeExecutionResult[] {
    return this.nodeResults.filter(result => result.status === status);
  }

  /**
   * 获取指定类型的节点执行结果
   * @param nodeType 节点类型
   * @returns 节点执行结果数组
   */
  getNodeResultsByType(nodeType: string): NodeExecutionResult[] {
    return this.nodeResults.filter(result => result.nodeType === nodeType);
  }

  /**
   * 获取全局作用域变量
   * @param key 变量键
   * @returns 变量值或undefined
   */
  getGlobalVariable(key: string): unknown {
    return this.variableScopes.global[key];
  }

  /**
   * 获取线程作用域变量
   * @param key 变量键
   * @returns 变量值或undefined
   */
  getThreadVariable(key: string): unknown {
    return this.variableScopes.thread[key];
  }

  /**
   * 获取输入数据
   * @param path 路径（支持点号分隔）
   * @returns 输入值或undefined
   */
  getInputValue(path: string): unknown {
    const keys = path.split('.');
    let value: unknown = this.input;
    for (const key of keys) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = (value as Record<string, unknown>)[key];
    }
    return value;
  }

  /**
   * 获取输出数据
   * @param path 路径（支持点号分隔）
   * @returns 输出值或undefined
   */
  getOutputValue(path: string): unknown {
    const keys = path.split('.');
    let value: unknown = this.output;
    for (const key of keys) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = (value as Record<string, unknown>)[key];
    }
    return value;
  }

  /**
   * 获取上下文数据
   * @param key 上下文键
   * @returns 上下文值或undefined
   */
  getContextData(key: string): unknown {
    return this.contextData?.[key];
  }

  /**
   * 检查是否有上下文数据
   * @param key 上下文键
   * @returns 是否存在该上下文数据
   */
  hasContextData(key: string): boolean {
    return this.contextData !== undefined && key in this.contextData;
  }

  /**
   * 获取Fork ID（仅FORK线程有效）
   * @returns Fork ID或undefined
   */
  getForkId(): string | undefined {
    return this.forkJoinContext?.forkId;
  }

  /**
   * 获取Fork路径ID（仅FORK线程有效）
   * @returns Fork路径ID或undefined
   */
  getForkPathId(): string | undefined {
    return this.forkJoinContext?.forkPathId;
  }

  /**
   * 获取父线程ID（仅Triggered子工作流线程有效）
   * @returns 父线程ID或undefined
   */
  getParentThreadId(): ID | undefined {
    return this.triggeredSubworkflowContext?.parentThreadId;
  }

  /**
   * 获取子线程ID数组（仅Triggered子工作流线程有效）
   * @returns 子线程ID数组
   */
  getChildThreadIds(): ID[] {
    return this.triggeredSubworkflowContext?.childThreadIds ?? [];
  }

  /**
   * 获取触发的子工作流ID（仅Triggered子工作流线程有效）
   * @returns 子工作流ID或undefined
   */
  getTriggeredSubworkflowId(): ID | undefined {
    return this.triggeredSubworkflowContext?.triggeredSubworkflowId;
  }

  /**
   * 转换为纯对象
   */
  toJSON(): Thread {
    return {
      id: this.id,
      workflowId: this.workflowId,
      workflowVersion: this.workflowVersion,
      status: this.status,
      currentNodeId: this.currentNodeId,
      graph: this.graph,
      variables: [...this.variables],
      variableScopes: {
        global: { ...this.variableScopes.global },
        thread: { ...this.variableScopes.thread },
        local: [...this.variableScopes.local],
        loop: [...this.variableScopes.loop]
      },
      input: { ...this.input },
      output: { ...this.output },
      nodeResults: [...this.nodeResults],
      startTime: this.startTime,
      endTime: this.endTime,
      errors: [...this.errors],
      contextData: this.contextData ? { ...this.contextData } : undefined,
      shouldPause: this.shouldPause,
      shouldStop: this.shouldStop,
      threadType: this.threadType,
      forkJoinContext: this.forkJoinContext,
      triggeredSubworkflowContext: this.triggeredSubworkflowContext
    };
  }
}
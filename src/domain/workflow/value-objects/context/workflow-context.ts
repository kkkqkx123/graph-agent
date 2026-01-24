import { ValueObject } from '../../../common/value-objects';
import { ExecutionState, ExecutionStatistics } from '../execution/execution-state';
import { PromptState } from './prompt-state';
import { NodeExecutionState } from '../execution/node-execution-state';
import { PromptHistoryEntry } from './prompt-history-entry';
import { WorkflowExecutionContext } from '../../entities/node';
import { ExecutionContext } from '../../../../services/threads/execution/context/execution-context';

/**
 * 工作流上下文属性接口
 */
export interface WorkflowContextProps {
  /** 工作流ID */
  workflowId: string;
  /** 执行ID */
  executionId: string;
  /** 执行状态上下文 */
  executionState: ExecutionState;
  /** 提示词状态上下文 */
  promptState: PromptState;
  /** 全局变量 */
  variables: Map<string, unknown>;
  /** 元数据 */
  metadata: Record<string, unknown>;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 工作流上下文值对象
 *
 * 统一的工作流上下文，整合执行状态、提示词历史、全局变量和元数据
 * 实现WorkflowExecutionContext接口以兼容现有代码
 */
export class WorkflowContext extends ValueObject<WorkflowContextProps> implements WorkflowExecutionContext, ExecutionContext {
  private constructor(props: WorkflowContextProps) {
    super(props);
    this.validate();
  }

  /**
   * 创建工作流上下文
   * @param workflowId 工作流ID
   * @param executionId 执行ID
   * @returns 工作流上下文实例
   */
  public static create(workflowId: string, executionId: string): WorkflowContext {
    const now = new Date();
    return new WorkflowContext({
      workflowId,
      executionId,
      executionState: ExecutionState.create(),
      promptState: PromptState.create(),
      variables: new Map(),
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * 从已有属性重建工作流上下文
   * @param props 工作流上下文属性
   * @returns 工作流上下文实例
   */
  public static fromProps(props: WorkflowContextProps): WorkflowContext {
    return new WorkflowContext({
      workflowId: props.workflowId,
      executionId: props.executionId,
      executionState: ExecutionState.fromProps(props.executionState),
      promptState: PromptState.fromProps(props.promptState),
      variables: new Map(props.variables),
      metadata: { ...props.metadata },
      createdAt: new Date(props.createdAt),
      updatedAt: new Date(props.updatedAt),
    });
  }

  /**
   * 获取工作流ID
   * @returns 工作流ID
   */
  public get workflowId(): string {
    return this.props.workflowId;
  }

  /**
   * 获取执行ID
   * @returns 执行ID
   */
  public get executionId(): string {
    return this.props.executionId;
  }

  /**
   * 获取执行状态上下文
   * @returns 执行状态上下文
   */
  public get executionState(): ExecutionState {
    return this.props.executionState;
  }

  /**
   * 获取提示词状态上下文
   * @returns 提示词状态上下文
   */
  public get promptState(): PromptState {
    return this.props.promptState;
  }

  /**
   * 获取全局变量
   * @returns 全局变量映射
   */
  public get variables(): Map<string, unknown> {
    return new Map(this.props.variables);
  }

  /**
   * 局部变量（用于节点级别的变量）
   * @returns 局部变量映射
   */
  public get localVariables(): Map<string, unknown> {
    return new Map(); // WorkflowContext不使用局部变量，返回空Map
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 获取创建时间
   * @returns 创建时间
   */
  public get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  /**
   * 获取更新时间
   * @returns 更新时间
   */
  public get updatedAt(): Date {
    return new Date(this.props.updatedAt);
  }

  /**
   * 追加节点执行状态
   * @param state 节点执行状态
   * @returns 新的工作流上下文实例
   */
  public appendNodeExecution(state: NodeExecutionState): WorkflowContext {
    return new WorkflowContext({
      ...this.props,
      executionState: this.props.executionState.addNodeExecution(state),
      updatedAt: new Date(),
    });
  }

  /**
   * 追加提示词历史记录
   * @param role 消息角色
   * @param content 内容
   * @param toolCalls 工具调用信息（可选）
   * @param toolCallId 工具调用ID（可选）
   * @param metadata 元数据
   * @returns 新的工作流上下文实例
   */
  public appendPromptHistory(
    role: 'system' | 'user' | 'assistant' | 'tool' | 'output',
    content: string,
    toolCalls?: any[],
    toolCallId?: string,
    metadata?: Record<string, unknown>
  ): WorkflowContext {
    return new WorkflowContext({
      ...this.props,
      promptState: this.props.promptState.addMessage(role, content, toolCalls, toolCallId, metadata),
      updatedAt: new Date(),
    });
  }

  /**
   * 更新节点执行状态
   * @param nodeId 节点ID
   * @param updates 更新内容
   * @returns 新的工作流上下文实例
   */
  public updateNodeExecution(nodeId: string, updates: Partial<NodeExecutionState>): WorkflowContext {
    return new WorkflowContext({
      ...this.props,
      executionState: this.props.executionState.updateNodeExecution(nodeId, updates),
      updatedAt: new Date(),
    });
  }

  /**
   * 更新全局变量
   * @param key 变量名
   * @param value 变量值
   * @returns 新的工作流上下文实例
   */
  public updateVariable(key: string, value: unknown): WorkflowContext {
    const newVariables = new Map(this.props.variables);
    newVariables.set(key, value);

    return new WorkflowContext({
      ...this.props,
      variables: newVariables,
      updatedAt: new Date(),
    });
  }

  /**
   * 批量更新全局变量
   * @param variables 变量映射
   * @returns 新的工作流上下文实例
   */
  public updateVariables(variables: Record<string, unknown>): WorkflowContext {
    const newVariables = new Map(this.props.variables);
    for (const [key, value] of Object.entries(variables)) {
      newVariables.set(key, value);
    }

    return new WorkflowContext({
      ...this.props,
      variables: newVariables,
      updatedAt: new Date(),
    });
  }

  /**
   * 更新元数据
   * @param updates 元数据更新
   * @returns 新的工作流上下文实例
   */
  public updateMetadata(updates: Record<string, unknown>): WorkflowContext {
    return new WorkflowContext({
      ...this.props,
      metadata: { ...this.props.metadata, ...updates },
      updatedAt: new Date(),
    });
  }

  /**
   * 设置当前节点
   * @param nodeId 节点ID
   * @returns 新的工作流上下文实例
   */
  public setCurrentNode(nodeId: string): WorkflowContext {
    return new WorkflowContext({
      ...this.props,
      executionState: this.props.executionState.setCurrentNode(nodeId),
      updatedAt: new Date(),
    });
  }

  /**
   * 完成工作流执行
   * @returns 新的工作流上下文实例
   */
  public completeWorkflow(): WorkflowContext {
    return new WorkflowContext({
      ...this.props,
      executionState: this.props.executionState.complete(),
      updatedAt: new Date(),
    });
  }

  /**
   * 标记工作流失败
   * @param error 错误信息
   * @returns 新的工作流上下文实例
   */
  public failWorkflow(error: string): WorkflowContext {
    return new WorkflowContext({
      ...this.props,
      executionState: this.props.executionState.fail(error),
      metadata: { ...this.props.metadata, error },
      updatedAt: new Date(),
    });
  }

  /**
   * 获取执行统计
   * @returns 执行统计信息
   */
  public getExecutionStatistics(): ExecutionStatistics {
    return this.props.executionState.getStatistics();
  }

  /**
   * 获取变量值
   * @param key 变量名
   * @returns 变量值
   */
  public getVariable(key: string): unknown {
    return this.props.variables.get(key);
  }

  /**
   * 设置变量值（注意：此方法不会修改原上下文，仅用于兼容接口）
   * @param key 变量名
   * @param value 变量值
   * @deprecated 使用updateVariable方法进行不可变更新
   */
  public setVariable(key: string, value: unknown): void {
    // WorkflowContext使用不可变更新模式，此方法仅用于兼容接口
    // 实际更新应该通过ContextManagement.updateContext完成
    console.warn(`WorkflowContext.setVariable() is deprecated. Use ContextManagement.updateContext() instead.`);
  }

  /**
   * 获取节点结果
   * @param nodeId 节点ID
   * @returns 节点结果
   */
  public getNodeResult(nodeId: string): unknown {
    const nodeExecution = this.props.executionState.nodeExecutions.get(nodeId);
    return nodeExecution?.result;
  }

  /**
   * 设置节点结果（注意：此方法不会修改原上下文，仅用于兼容接口）
   * @param nodeId 节点ID
   * @param result 节点结果
   * @deprecated 使用updateNodeExecution方法进行不可变更新
   */
  public setNodeResult(nodeId: string, result: unknown): void {
    // WorkflowContext使用不可变更新模式，此方法仅用于兼容接口
    // 实际更新应该通过ContextManagement.updateContext完成
    console.warn(`WorkflowContext.setNodeResult() is deprecated. Use ContextManagement.updateContext() instead.`);
  }

  /**
   * 获取服务（用于依赖注入）
   * @param serviceName 服务名称
   * @returns 服务实例
   */
  public getService<T>(serviceName: string): T {
    // WorkflowContext本身不提供服务，此方法仅用于兼容接口
    // 实际服务应该通过依赖注入容器获取
    throw new Error(`WorkflowContext.getService() is not supported. Use dependency injection instead.`);
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
   * 删除变量
   * @param key 变量名
   * @returns 新的工作流上下文实例
   */
  public deleteVariable(key: string): WorkflowContext {
    const newVariables = new Map(this.props.variables);
    newVariables.delete(key);

    return new WorkflowContext({
      ...this.props,
      variables: newVariables,
      updatedAt: new Date(),
    });
  }

  /**
   * 获取所有变量
   * @returns 变量对象
   */
  public getAllVariables(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of this.props.variables.entries()) {
      result[key] = value;
    }
    return result;
  }

  /**
   * 获取执行ID（实现WorkflowExecutionContext接口）
   * @returns 执行ID
   */
  public getExecutionId(): string {
    return this.props.executionId;
  }

  /**
   * 获取工作流ID（实现WorkflowExecutionContext接口）
   * @returns 工作流ID
   */
  public getWorkflowId(): string {
    return this.props.workflowId;
  }

  /**
   * 获取元数据值
   * @param key 元数据键
   * @returns 元数据值
   */
  public getMetadata(key: string): unknown {
    return this.props.metadata[key];
  }

  /**
   * 检查元数据是否存在
   * @param key 元数据键
   * @returns 是否存在
   */
  public hasMetadata(key: string): boolean {
    return key in this.props.metadata;
  }

  /**
   * 比较两个工作流上下文是否相等
   * @param context 另一个工作流上下文
   * @returns 是否相等
   */
  public override equals(context?: WorkflowContext): boolean {
    if (context === null || context === undefined) {
      return false;
    }
    return (
      this.props.workflowId === context.workflowId &&
      this.props.executionId === context.executionId &&
      this.props.createdAt.getTime() === context.createdAt.getTime()
    );
  }

  /**
   * 获取工作流上下文的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    const stats = this.getExecutionStatistics();
    return `WorkflowContext(workflowId="${this.props.workflowId}", executionId="${this.props.executionId}", nodes=${stats.totalNodes}, variables=${this.props.variables.size})`;
  }

  /**
   * 验证值对象的有效性
   */
  public validate(): void {
    if (!this.props.workflowId || typeof this.props.workflowId !== 'string') {
      throw new Error('工作流ID必须是非空字符串');
    }
    if (!this.props.executionId || typeof this.props.executionId !== 'string') {
      throw new Error('执行ID必须是非空字符串');
    }
    if (!(this.props.createdAt instanceof Date)) {
      throw new Error('创建时间必须是Date对象');
    }
    if (!(this.props.updatedAt instanceof Date)) {
      throw new Error('更新时间必须是Date对象');
    }
    if (this.props.createdAt > this.props.updatedAt) {
      throw new Error('创建时间不能晚于更新时间');
    }
  }

  /**
   * 获取线程ID（实现ExecutionContext接口）
   * @returns 线程ID（使用executionId作为线程ID）
   */
  public get threadId(): string {
    return this.props.executionId;
  }

  /**
   * 初始化变量（实现ExecutionContext接口）
   * @param variables 变量映射
   */
  public initializeVariables(variables: Record<string, any>): void {
    // WorkflowContext使用不可变更新模式，此方法仅用于兼容接口
    // 实际更新应该通过ContextManagement.updateContext完成
    console.warn(`WorkflowContext.initializeVariables() is deprecated. Use ContextManagement.updateContext() instead.`);
  }

  /**
   * 获取所有节点结果（实现ExecutionContext接口）
   * @returns 节点结果映射
   */
  public getAllNodeResults(): Map<string, any> {
    const results = new Map<string, any>();
    for (const [nodeId, nodeExecution] of this.props.executionState.nodeExecutions.entries()) {
      results.set(nodeId, nodeExecution.result);
    }
    return results;
  }

  /**
   * 设置元数据（实现ExecutionContext接口）
   * @param key 元数据键
   * @param value 元数据值
   */
  public setMetadata(key: string, value: any): void {
    // WorkflowContext使用不可变更新模式，此方法仅用于兼容接口
    // 实际更新应该通过ContextManagement.updateContext完成
    console.warn(`WorkflowContext.setMetadata() is deprecated. Use ContextManagement.updateContext() instead.`);
  }
}
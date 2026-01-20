import { ValueObject } from '../../../common/value-objects';
import { NodeExecutionState, NodeExecutionStateProps } from './node-execution-state';
import { NodeStatusValue } from '../node/node-status';

/**
 * 执行统计信息接口
 */
export interface ExecutionStatistics {
  /** 总节点数 */
  totalNodes: number;
  /** 已执行节点数 */
  executedNodes: number;
  /** 已完成节点数 */
  completedNodes: number;
  /** 失败节点数 */
  failedNodes: number;
  /** 跳过节点数 */
  skippedNodes: number;
  /** 取消节点数 */
  cancelledNodes: number;
  /** 运行中节点数 */
  runningNodes: number;
  /** 待执行节点数 */
  pendingNodes: number;
}

/**
 * 执行状态属性接口
 */
export interface ExecutionStateProps {
  /** 节点执行状态映射 */
  nodeExecutions: Map<string, NodeExecutionState>;
  /** 当前节点ID */
  currentNodeId?: string;
  /** 已执行节点ID列表 */
  executedNodes: string[];
  /** 工作流开始时间 */
  startTime: Date;
  /** 工作流结束时间 */
  endTime?: Date;
}

/**
 * 执行状态值对象
 *
 * 用于管理工作流执行状态，包括节点执行状态、执行历史、当前节点等信息
 */
export class ExecutionState extends ValueObject<ExecutionStateProps> {
  private constructor(props: ExecutionStateProps) {
    super(props);
    this.validate();
  }

  /**
   * 创建初始执行状态
   * @returns 执行状态实例
   */
  public static create(): ExecutionState {
    const now = new Date();
    return new ExecutionState({
      nodeExecutions: new Map(),
      executedNodes: [],
      startTime: now,
    });
  }

  /**
   * 从已有属性重建执行状态
   * @param props 执行状态属性
   * @returns 执行状态实例
   */
  public static fromProps(props: ExecutionStateProps): ExecutionState {
    const nodeExecutions = new Map<string, NodeExecutionState>();
    for (const [nodeId, state] of props.nodeExecutions.entries()) {
      nodeExecutions.set(nodeId, NodeExecutionState.fromProps(state));
    }

    return new ExecutionState({
      nodeExecutions,
      currentNodeId: props.currentNodeId,
      executedNodes: [...props.executedNodes],
      startTime: new Date(props.startTime),
      endTime: props.endTime ? new Date(props.endTime) : undefined,
    });
  }

  /**
   * 获取节点执行状态映射
   * @returns 节点执行状态映射
   */
  public get nodeExecutions(): Map<string, NodeExecutionState> {
    return new Map(this.props.nodeExecutions);
  }

  /**
   * 获取当前节点ID
   * @returns 当前节点ID
   */
  public get currentNodeId(): string | undefined {
    return this.props.currentNodeId;
  }

  /**
   * 获取已执行节点ID列表
   * @returns 已执行节点ID列表
   */
  public get executedNodes(): string[] {
    return [...this.props.executedNodes];
  }

  /**
   * 获取工作流开始时间
   * @returns 工作流开始时间
   */
  public get startTime(): Date {
    return new Date(this.props.startTime);
  }

  /**
   * 获取工作流结束时间
   * @returns 工作流结束时间
   */
  public get endTime(): Date | undefined {
    return this.props.endTime ? new Date(this.props.endTime) : undefined;
  }

  /**
   * 添加节点执行状态
   * @param state 节点执行状态
   * @returns 新的执行状态实例
   */
  public addNodeExecution(state: NodeExecutionState): ExecutionState {
    const newNodeExecutions = new Map(this.props.nodeExecutions);
    newNodeExecutions.set(state.nodeId, state);

    const newExecutedNodes = this.props.executedNodes.includes(state.nodeId)
      ? this.props.executedNodes
      : [...this.props.executedNodes, state.nodeId];

    return new ExecutionState({
      ...this.props,
      nodeExecutions: newNodeExecutions,
      executedNodes: newExecutedNodes,
    });
  }

  /**
   * 更新节点执行状态
   * @param nodeId 节点ID
   * @param updates 更新内容
   * @returns 新的执行状态实例
   */
  public updateNodeExecution(nodeId: string, updates: Partial<Omit<NodeExecutionStateProps, 'nodeId'>>): ExecutionState {
    const currentState = this.props.nodeExecutions.get(nodeId);
    if (!currentState) {
      throw new Error(`节点 ${nodeId} 不存在`);
    }

    const newNodeExecutions = new Map(this.props.nodeExecutions);
    newNodeExecutions.set(nodeId, NodeExecutionState.fromProps({
      nodeId: currentState.nodeId,
      status: updates.status ?? currentState.status,
      startTime: updates.startTime ?? currentState.startTime,
      endTime: updates.endTime ?? currentState.endTime,
      executionTime: updates.executionTime ?? currentState.executionTime,
      error: updates.error ?? currentState.error,
      result: updates.result ?? currentState.result,
      metadata: updates.metadata ?? currentState.metadata,
    }));

    return new ExecutionState({
      ...this.props,
      nodeExecutions: newNodeExecutions,
    });
  }

  /**
   * 设置当前节点
   * @param nodeId 节点ID
   * @returns 新的执行状态实例
   */
  public setCurrentNode(nodeId: string): ExecutionState {
    return new ExecutionState({
      ...this.props,
      currentNodeId: nodeId,
    });
  }

  /**
   * 标记节点开始执行
   * @param nodeId 节点ID
   * @returns 新的执行状态实例
   */
  public markNodeStarted(nodeId: string): ExecutionState {
    const currentState = this.props.nodeExecutions.get(nodeId);
    if (currentState) {
      return this.updateNodeExecution(nodeId, {
        status: NodeStatusValue.RUNNING,
        startTime: new Date(),
      });
    } else {
      return this.addNodeExecution(
        NodeExecutionState.create(nodeId, NodeStatusValue.RUNNING).start()
      );
    }
  }

  /**
   * 标记节点完成
   * @param nodeId 节点ID
   * @param result 执行结果
   * @returns 新的执行状态实例
   */
  public markNodeCompleted(nodeId: string, result?: unknown): ExecutionState {
    const currentState = this.props.nodeExecutions.get(nodeId);
    if (!currentState) {
      throw new Error(`节点 ${nodeId} 不存在`);
    }

    return this.updateNodeExecution(nodeId, {
      status: NodeStatusValue.COMPLETED,
      endTime: new Date(),
      executionTime: currentState.startTime
        ? Date.now() - currentState.startTime.getTime()
        : undefined,
      result,
    });
  }

  /**
   * 标记节点失败
   * @param nodeId 节点ID
   * @param error 错误信息
   * @returns 新的执行状态实例
   */
  public markNodeFailed(nodeId: string, error: string): ExecutionState {
    const currentState = this.props.nodeExecutions.get(nodeId);
    if (!currentState) {
      throw new Error(`节点 ${nodeId} 不存在`);
    }

    return this.updateNodeExecution(nodeId, {
      status: NodeStatusValue.FAILED,
      endTime: new Date(),
      executionTime: currentState.startTime
        ? Date.now() - currentState.startTime.getTime()
        : undefined,
      error,
    });
  }

  /**
   * 标记节点跳过
   * @param nodeId 节点ID
   * @returns 新的执行状态实例
   */
  public markNodeSkipped(nodeId: string): ExecutionState {
    const currentState = this.props.nodeExecutions.get(nodeId);
    if (!currentState) {
      throw new Error(`节点 ${nodeId} 不存在`);
    }

    return this.updateNodeExecution(nodeId, {
      status: NodeStatusValue.SKIPPED,
      endTime: new Date(),
      executionTime: currentState.startTime
        ? Date.now() - currentState.startTime.getTime()
        : undefined,
    });
  }

  /**
   * 标记节点取消
   * @param nodeId 节点ID
   * @returns 新的执行状态实例
   */
  public markNodeCancelled(nodeId: string): ExecutionState {
    const currentState = this.props.nodeExecutions.get(nodeId);
    if (!currentState) {
      throw new Error(`节点 ${nodeId} 不存在`);
    }

    return this.updateNodeExecution(nodeId, {
      status: NodeStatusValue.CANCELLED,
      endTime: new Date(),
      executionTime: currentState.startTime
        ? Date.now() - currentState.startTime.getTime()
        : undefined,
    });
  }

  /**
   * 完成工作流执行
   * @returns 新的执行状态实例
   */
  public complete(): ExecutionState {
    return new ExecutionState({
      ...this.props,
      endTime: new Date(),
    });
  }

  /**
   * 标记工作流失败
   * @param error 错误信息
   * @returns 新的执行状态实例
   */
  public fail(error: string): ExecutionState {
    return new ExecutionState({
      ...this.props,
      endTime: new Date(),
    });
  }

  /**
   * 获取节点执行状态
   * @param nodeId 节点ID
   * @returns 节点执行状态
   */
  public getNodeExecution(nodeId: string): NodeExecutionState | undefined {
    return this.props.nodeExecutions.get(nodeId);
  }

  /**
   * 获取指定状态的节点列表
   * @param status 节点状态
   * @returns 节点ID列表
   */
  public getNodesByStatus(status: NodeStatusValue): string[] {
    const result: string[] = [];
    for (const [nodeId, state] of this.props.nodeExecutions.entries()) {
      if (state.status === status) {
        result.push(nodeId);
      }
    }
    return result;
  }

  /**
   * 获取执行统计
   * @returns 执行统计信息
   */
  public getStatistics(): ExecutionStatistics {
    const nodeExecutions = Array.from(this.props.nodeExecutions.values());

    return {
      totalNodes: nodeExecutions.length,
      executedNodes: this.props.executedNodes.length,
      completedNodes: nodeExecutions.filter(n => n.status === NodeStatusValue.COMPLETED).length,
      failedNodes: nodeExecutions.filter(n => n.status === NodeStatusValue.FAILED).length,
      skippedNodes: nodeExecutions.filter(n => n.status === NodeStatusValue.SKIPPED).length,
      cancelledNodes: nodeExecutions.filter(n => n.status === NodeStatusValue.CANCELLED).length,
      runningNodes: nodeExecutions.filter(n => n.status === NodeStatusValue.RUNNING).length,
      pendingNodes: nodeExecutions.filter(n => n.status === NodeStatusValue.PENDING).length,
    };
  }

  /**
   * 检查节点是否存在
   * @param nodeId 节点ID
   * @returns 是否存在
   */
  public hasNode(nodeId: string): boolean {
    return this.props.nodeExecutions.has(nodeId);
  }

  /**
   * 检查工作流是否已完成
   * @returns 是否已完成
   */
  public isCompleted(): boolean {
    return this.props.endTime !== undefined;
  }

  /**
   * 获取工作流执行时长
   * @returns 执行时长（毫秒）
   */
  public getDuration(): number {
    const endTime = this.props.endTime || new Date();
    return endTime.getTime() - this.props.startTime.getTime();
  }

  /**
   * 比较两个执行状态是否相等
   * @param state 另一个执行状态
   * @returns 是否相等
   */
  public override equals(state?: ExecutionState): boolean {
    if (state === null || state === undefined) {
      return false;
    }
    return (
      this.props.startTime.getTime() === state.startTime.getTime() &&
      this.props.endTime?.getTime() === state.endTime?.getTime() &&
      this.props.currentNodeId === state.currentNodeId &&
      this.props.executedNodes.length === state.executedNodes.length &&
      this.props.nodeExecutions.size === state.nodeExecutions.size
    );
  }

  /**
   * 获取执行状态的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    const stats = this.getStatistics();
    return `ExecutionState(nodes=${stats.totalNodes}, completed=${stats.completedNodes}, failed=${stats.failedNodes}, duration=${this.getDuration()}ms)`;
  }

  /**
   * 验证值对象的有效性
   */
  public validate(): void {
    if (!(this.props.startTime instanceof Date)) {
      throw new Error('开始时间必须是Date对象');
    }
    if (this.props.endTime && !(this.props.endTime instanceof Date)) {
      throw new Error('结束时间必须是Date对象');
    }
    if (this.props.startTime > (this.props.endTime || new Date())) {
      throw new Error('开始时间不能晚于结束时间');
    }
    if (this.props.currentNodeId && !this.props.nodeExecutions.has(this.props.currentNodeId)) {
      throw new Error(`当前节点 ${this.props.currentNodeId} 不在节点执行状态中`);
    }
  }
}
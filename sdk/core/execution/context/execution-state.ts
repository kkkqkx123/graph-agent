/**
 * ExecutionState - 执行状态管理器
 * 管理Thread执行过程中的临时状态
 * 与持久化数据分离，专注于执行时状态管理
 */

import type { ID } from '@modular-agent/types';

/**
 * 子图执行上下文
 */
interface SubgraphContext {
  /** 子工作流ID */
  workflowId: ID;
  /** 父工作流ID */
  parentWorkflowId: ID;
  /** 开始时间 */
  startTime: number;
  /** 输入数据 */
  input: any;
  /** 当前深度 */
  depth: number;
}

/**
 * ExecutionState - 执行状态管理器
 *
 * 核心职责：
 * - 管理子图执行栈
 * - 管理子工作流执行历史（用于触发器触发的孤立子工作流）
 * - 提供当前工作流ID（考虑子图上下文）
 * - 管理执行时的临时状态
 *
 * 设计原则：
 * - 与持久化数据分离
 * - 生命周期与执行周期绑定
 * - 纯状态管理，不包含业务逻辑
 */
export class ExecutionState {
  /**
   * 子图执行堆栈
   */
  private subgraphStack: SubgraphContext[] = [];

  /**
   * 子工作流执行历史记录（用于触发器触发的孤立子工作流）
   */
  private subgraphExecutionHistory: any[] = [];

  /**
   * 是否正在执行触发子工作流
   */
  private isExecutingTriggeredSubgraph: boolean = false;

  /**
   * 构造函数
   */
  constructor() {
    // 初始化为空状态
  }

  /**
   * 进入子图
   * @param workflowId 子工作流ID
   * @param parentWorkflowId 父工作流ID
   * @param input 输入数据
   */
  enterSubgraph(workflowId: ID, parentWorkflowId: ID, input: any): void {
    this.subgraphStack.push({
      workflowId,
      parentWorkflowId,
      startTime: Date.now(),
      input,
      depth: this.subgraphStack.length
    });
  }

  /**
   * 退出子图
   */
  exitSubgraph(): void {
    this.subgraphStack.pop();
  }

  /**
   * 获取当前子图上下文
   * @returns 当前子图上下文，如果不在子图中则返回null
   */
  getCurrentSubgraphContext(): SubgraphContext | null {
    return this.subgraphStack.length > 0
      ? this.subgraphStack[this.subgraphStack.length - 1] || null
      : null;
  }

  /**
   * 获取子图执行堆栈
   * @returns 子图执行堆栈的副本
   */
  getSubgraphStack(): SubgraphContext[] {
    return [...this.subgraphStack];
  }

  /**
   * 检查是否在子图中执行
   * @returns 是否在子图中
   */
  isInSubgraph(): boolean {
    return this.subgraphStack.length > 0;
  }

  /**
   * 获取当前工作流ID（考虑子图上下文）
   * @param baseWorkflowId 基础工作流ID
   * @returns 当前工作流ID
   */
  getCurrentWorkflowId(baseWorkflowId: ID): ID {
    const context = this.getCurrentSubgraphContext();
    return context ? context.workflowId : baseWorkflowId;
  }

  /**
   * 获取当前子图深度
   * @returns 当前子图深度
   */
  getCurrentDepth(): number {
    return this.subgraphStack.length;
  }

  /**
   * 添加子工作流执行结果
   * @param result 节点执行结果
   */
  addSubgraphExecutionResult(result: any): void {
    if (this.isExecutingTriggeredSubgraph) {
      this.subgraphExecutionHistory.push(result);
    }
  }

  /**
   * 获取子工作流执行历史
   * @returns 子工作流执行结果数组
   */
  getSubgraphExecutionHistory(): any[] {
    return [...this.subgraphExecutionHistory];
  }

  /**
   * 开始执行触发子工作流
   * @param workflowId 子工作流ID
   */
  startTriggeredSubgraphExecution(workflowId: string): void {
    this.isExecutingTriggeredSubgraph = true;
    this.subgraphExecutionHistory = [];
  }

  /**
   * 结束执行触发子工作流
   */
  endTriggeredSubgraphExecution(): void {
    this.isExecutingTriggeredSubgraph = false;
  }

  /**
   * 检查是否正在执行触发子工作流
   * @returns 是否正在执行
   */
  isExecutingSubgraph(): boolean {
    return this.isExecutingTriggeredSubgraph;
  }

  /**
   * 清空所有执行状态
   */
  clear(): void {
    this.subgraphStack = [];
    this.subgraphExecutionHistory = [];
    this.isExecutingTriggeredSubgraph = false;
  }

  /**
   * 克隆执行状态
   * @returns 执行状态的副本
   */
  clone(): ExecutionState {
    const cloned = new ExecutionState();
    cloned.subgraphStack = this.subgraphStack.map(context => ({ ...context }));
    cloned.subgraphExecutionHistory = [...this.subgraphExecutionHistory];
    cloned.isExecutingTriggeredSubgraph = this.isExecutingTriggeredSubgraph;
    return cloned;
  }
}
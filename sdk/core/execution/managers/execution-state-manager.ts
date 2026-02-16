/**
 * ExecutionStateManager - 触发子工作流执行状态管理器
 * 
 * 职责：
 * - 管理triggered子工作流的执行状态
 * - 记录执行历史
 * - 提供状态查询接口
 * 
 * 设计原则：
 * - 单一职责：专注于执行状态管理
 * - 无副作用：不执行业务逻辑
 * - 线程安全：状态变更原子性
 */

import type { ID } from '@modular-agent/types';

/**
 * 触发子工作流执行状态接口
 */
export interface TriggeredSubworkflowExecutionState {
  /** 是否正在执行 */
  isExecuting: boolean;
  /** 当前执行的工作流ID */
  currentWorkflowId: string;
  /** 执行历史记录 */
  executionHistory: any[];
  /** 开始执行时间 */
  startTime?: number;
}

/**
 * ExecutionStateManager - 执行状态管理器
 */
export class ExecutionStateManager {
  /**
   * 是否正在执行
   */
  private isExecuting: boolean = false;

  /**
   * 当前执行的工作流ID
   */
  private currentWorkflowId: string = '';

  /**
   * 执行历史记录
   */
  private executionHistory: any[] = [];

  /**
   * 开始执行时间
   */
  private startTime?: number;

  /**
   * 开始执行
   * @param workflowId 工作流ID
   */
  startExecution(workflowId: string): void {
    this.isExecuting = true;
    this.currentWorkflowId = workflowId;
    this.executionHistory = [];
    this.startTime = Date.now();
  }

  /**
   * 结束执行
   */
  endExecution(): void {
    this.isExecuting = false;
    this.currentWorkflowId = '';
    this.startTime = undefined;
  }

  /**
   * 添加执行结果
   * @param result 执行结果
   */
  addExecutionResult(result: any): void {
    this.executionHistory.push(result);
  }

  /**
   * 获取执行状态
   * @returns 执行状态
   */
  getState(): TriggeredSubworkflowExecutionState {
    return {
      isExecuting: this.isExecuting,
      currentWorkflowId: this.currentWorkflowId,
      executionHistory: [...this.executionHistory],
      startTime: this.startTime
    };
  }

  /**
   * 获取执行历史
   * @returns 执行历史数组
   */
  getHistory(): any[] {
    return [...this.executionHistory];
  }

  /**
   * 检查是否正在执行
   * @returns 是否正在执行
   */
  isCurrentlyExecuting(): boolean {
    return this.isExecuting;
  }

  /**
   * 获取当前工作流ID
   * @returns 当前工作流ID
   */
  getCurrentWorkflowId(): string {
    return this.currentWorkflowId;
  }

  /**
   * 获取执行时长（毫秒）
   * @returns 执行时长，如果未执行则返回0
   */
  getExecutionDuration(): number {
    if (!this.startTime) {
      return 0;
    }
    return Date.now() - this.startTime;
  }

  /**
   * 清空所有状态
   */
  clear(): void {
    this.isExecuting = false;
    this.currentWorkflowId = '';
    this.executionHistory = [];
    this.startTime = undefined;
  }

  /**
   * 克隆状态管理器
   * @returns 状态管理器的副本
   */
  clone(): ExecutionStateManager {
    const cloned = new ExecutionStateManager();
    cloned.isExecuting = this.isExecuting;
    cloned.currentWorkflowId = this.currentWorkflowId;
    cloned.executionHistory = [...this.executionHistory];
    cloned.startTime = this.startTime;
    return cloned;
  }
}
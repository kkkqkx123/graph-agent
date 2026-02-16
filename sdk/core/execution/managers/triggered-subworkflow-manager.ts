/**
 * TriggeredSubworkflowManager - 触发子工作流管理器
 * 
 * 职责：
 * - 管理triggered子工作流的完整生命周期
 * - 协调子工作流的创建和执行
 * - 管理执行状态和历史
 * - 提供统一的执行接口
 * 
 * 设计原则：
 * - 单一职责：专注于triggered子工作流管理
 * - 依赖注入：通过构造函数注入依赖
 * - 事件驱动：通过事件管理器通知执行状态
 */

import type { ID } from '@modular-agent/types';
import { ThreadContext } from '../context/thread-context';
import type { EventManager } from '../../services/event-manager';
import { EventType } from '@modular-agent/types';
import type { ThreadResult } from '@modular-agent/types';
import { now, getErrorMessage, getErrorOrNew } from '@modular-agent/common-utils';
import { ExecutionStateManager, type TriggeredSubworkflowExecutionState } from './execution-state-manager';
import { createSubgraphMetadata } from '../handlers/subgraph-handler';

/**
 * 子工作流执行器接口
 */
export interface SubgraphExecutor {
  executeThread(threadContext: ThreadContext): Promise<ThreadResult>;
}

/**
 * 子工作流上下文工厂接口
 */
export interface SubgraphContextFactory {
  buildSubgraphContext(subgraphId: ID, input: Record<string, any>, metadata: any): Promise<ThreadContext>;
}

/**
 * 触发子工作流任务接口
 */
export interface TriggeredSubgraphTask {
  /** 子工作流ID */
  subgraphId: ID;
  /** 输入数据 */
  input: Record<string, any>;
  /** 触发器ID */
  triggerId: string;
  /** 主工作流线程上下文 */
  mainThreadContext: ThreadContext;
  /** 配置选项 */
  config?: {
    /**
     * 是否等待子工作流完成
     * - true: 同步执行（默认），调用者会阻塞直到子工作流完成
     * - false: 异步执行，调用者立即返回，子工作流在后台执行
     */
    waitForCompletion?: boolean;
    /** 超时时间（毫秒） */
    timeout?: number;
    /** 是否记录历史 */
    recordHistory?: boolean;
    /** 元数据 */
    metadata?: any;
  };
}

/**
 * 执行单个触发子工作流的返回结果
 */
export interface ExecutedSubgraphResult {
  /** 子工作流上下文 */
  subgraphContext: ThreadContext;
  /** 执行结果 */
  threadResult: ThreadResult;
  /** 执行时间（毫秒） */
  executionTime: number;
}

/**
 * TriggeredSubworkflowManager - 触发子工作流管理器
 */
export class TriggeredSubworkflowManager {
  /**
   * 执行状态管理器
   */
  private executionStateManager: ExecutionStateManager;

  /**
   * 子工作流上下文工厂
   */
  private contextFactory: SubgraphContextFactory;

  /**
   * 子工作流执行器
   */
  private executor: SubgraphExecutor;

  /**
   * 事件管理器
   */
  private eventManager: EventManager;

  /**
   * 构造函数
   * @param contextFactory 子工作流上下文工厂
   * @param executor 子工作流执行器
   * @param eventManager 事件管理器
   */
  constructor(
    contextFactory: SubgraphContextFactory,
    executor: SubgraphExecutor,
    eventManager: EventManager
  ) {
    this.contextFactory = contextFactory;
    this.executor = executor;
    this.eventManager = eventManager;
    this.executionStateManager = new ExecutionStateManager();
  }

  /**
   * 执行触发子工作流
   * @param task 触发子工作流任务
   * @returns 执行结果
   */
  async executeTriggeredSubgraph(
    task: TriggeredSubgraphTask
  ): Promise<ExecutedSubgraphResult> {
    const startTime = Date.now();
    
    // 开始执行
    this.executionStateManager.startExecution(task.subgraphId);
    
    try {
      // 创建上下文
      const subgraphContext = await this.createSubgraphContext(task);
      
      // 触发开始事件
      await this.emitStartedEvent(task);
      
      // 执行子工作流
      const threadResult = await this.executeSubgraph(subgraphContext, task);
      
      const executionTime = Date.now() - startTime;
      
      // 触发完成事件
      await this.emitCompletedEvent(task, subgraphContext, executionTime);
      
      return {
        subgraphContext,
        threadResult,
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // 触发失败事件
      await this.emitFailedEvent(task, getErrorOrNew(error), executionTime);
      
      // 重新抛出错误，让调用者处理
      throw error;
    } finally {
      // 结束执行
      this.executionStateManager.endExecution();
    }
  }

  /**
   * 创建子工作流上下文
   * @param task 触发子工作流任务
   * @returns 子工作流上下文
   */
  private async createSubgraphContext(
    task: TriggeredSubgraphTask
  ): Promise<ThreadContext> {
    const metadata = createSubgraphMetadata(
      task.triggerId,
      task.mainThreadContext.getThreadId()
    );
    
    return await this.contextFactory.buildSubgraphContext(
      task.subgraphId,
      task.input,
      metadata
    );
  }

  /**
   * 执行子工作流
   * @param subgraphContext 子工作流上下文
   * @param task 触发子工作流任务
   * @returns 执行结果
   */
  private async executeSubgraph(
    subgraphContext: ThreadContext,
    task: TriggeredSubgraphTask
  ): Promise<ThreadResult> {
    const result = await this.executor.executeThread(subgraphContext);
    
    // 如果配置了记录历史，则记录执行结果
    if (task.config?.recordHistory !== false) {
      this.executionStateManager.addExecutionResult(result);
    }
    
    return result;
  }

  /**
   * 触发子工作流开始事件
   * @param task 触发子工作流任务
   */
  private async emitStartedEvent(task: TriggeredSubgraphTask): Promise<void> {
    await this.eventManager.emit({
      type: EventType.TRIGGERED_SUBGRAPH_STARTED,
      threadId: task.mainThreadContext.getThreadId(),
      workflowId: task.mainThreadContext.getWorkflowId(),
      subgraphId: task.subgraphId,
      triggerId: task.triggerId,
      input: task.input,
      timestamp: now()
    });
  }

  /**
   * 触发子工作流完成事件
   * @param task 触发子工作流任务
   * @param subgraphContext 子工作流上下文
   * @param executionTime 执行时间（毫秒）
   */
  private async emitCompletedEvent(
    task: TriggeredSubgraphTask,
    subgraphContext: ThreadContext,
    executionTime: number
  ): Promise<void> {
    await this.eventManager.emit({
      type: EventType.TRIGGERED_SUBGRAPH_COMPLETED,
      threadId: task.mainThreadContext.getThreadId(),
      workflowId: task.mainThreadContext.getWorkflowId(),
      subgraphId: task.subgraphId,
      triggerId: task.triggerId,
      output: subgraphContext.getOutput(),
      executionTime,
      timestamp: now()
    });
  }

  /**
   * 触发子工作流失败事件
   * @param task 触发子工作流任务
   * @param error 错误信息
   * @param executionTime 执行时间（毫秒）
   */
  private async emitFailedEvent(
    task: TriggeredSubgraphTask,
    error: Error | string,
    executionTime: number
  ): Promise<void> {
    await this.eventManager.emit({
      type: EventType.TRIGGERED_SUBGRAPH_FAILED,
      threadId: task.mainThreadContext.getThreadId(),
      workflowId: task.mainThreadContext.getWorkflowId(),
      subgraphId: task.subgraphId,
      triggerId: task.triggerId,
      error: getErrorMessage(error),
      executionTime,
      timestamp: now()
    });
  }

  /**
   * 获取执行状态
   * @returns 执行状态
   */
  getExecutionState(): TriggeredSubworkflowExecutionState {
    return this.executionStateManager.getState();
  }

  /**
   * 获取执行历史
   * @returns 执行历史数组
   */
  getExecutionHistory(): any[] {
    return this.executionStateManager.getHistory();
  }

  /**
   * 检查是否正在执行
   * @returns 是否正在执行
   */
  isExecuting(): boolean {
    return this.executionStateManager.isCurrentlyExecuting();
  }

  /**
   * 获取当前工作流ID
   * @returns 当前工作流ID
   */
  getCurrentWorkflowId(): string {
    return this.executionStateManager.getCurrentWorkflowId();
  }

  /**
   * 获取执行时长（毫秒）
   * @returns 执行时长
   */
  getExecutionDuration(): number {
    return this.executionStateManager.getExecutionDuration();
  }

  /**
   * 清空所有状态
   */
  clear(): void {
    this.executionStateManager.clear();
  }
}
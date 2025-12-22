import { ID } from '../../common/value-objects/id';
import { IExecutionContextManager, IExecutionContext } from '../execution';
import { ExecutionContext } from '../execution';
import {
  ExecutionResult,
  ExecutionProgress,
  ExecutionStatistics,
  ExecutionEventCallback,
  ExecutionStatus,
  ExecutionMode,
  ExecutionPriority,
  ExecutionConfig
} from '../execution/types';
import { IWorkflowCompiler, CompilationOptions, CompilationResult, CompilationTarget } from '../validation';
import { ITriggerManager, TriggerContext } from '../extensions';
import { IStateManager } from '../state';
import { Timestamp } from '../../common/value-objects/timestamp';

/**
 * 工作流执行请求接口
 */
export interface WorkflowExecutionRequest {
  /** 执行ID */
  readonly executionId: string;
  /** 工作流ID */
  readonly workflowId: ID;
  /** 执行模式 */
  readonly mode: ExecutionMode;
  /** 执行优先级 */
  readonly priority: ExecutionPriority;
  /** 执行配置 */
  readonly config: ExecutionConfig;
  /** 输入数据 */
  readonly inputData: Record<string, any>;
  /** 执行参数 */
  readonly parameters: Record<string, any>;
  /** 触发上下文 */
  readonly triggerContext?: TriggerContext;
}

/**
 * 工作流执行结果接口
 */
export interface WorkflowExecutionResult {
  /** 执行ID */
  readonly executionId: ID;
  /** 工作流ID */
  readonly workflowId: ID;
  /** 执行状态 */
  readonly status: ExecutionStatus;
  /** 执行结果数据 */
  readonly data?: any;
  /** 错误信息 */
  readonly error?: Error;
  /** 执行统计 */
  readonly statistics: ExecutionStatistics;
  /** 执行完成时间 */
  readonly completedAt?: Timestamp;
}

/**
 * 工作流执行服务接口
 */
export interface IWorkflowExecutionService {
  /**
   * 执行工作流
   */
  execute(request: WorkflowExecutionRequest): Promise<ExecutionResult>;

  /**
   * 异步执行工作流
   */
  executeAsync(request: WorkflowExecutionRequest): Promise<string>;

  /**
   * 流式执行工作流
   */
  executeStream(
    request: WorkflowExecutionRequest,
    onProgress?: (progress: WorkflowExecutionProgress) => void,
    onNodeComplete?: (nodeId: ID, result: any) => void,
    onError?: (error: Error) => void
  ): Promise<ExecutionResult>;

  /**
   * 批量执行工作流
   */
  executeBatch(requests: WorkflowExecutionRequest[]): Promise<ExecutionResult[]>;

  /**
   * 暂停执行
   */
  pauseExecution(executionId: string): Promise<void>;

  /**
   * 恢复执行
   */
  resumeExecution(executionId: string): Promise<void>;

  /**
   * 取消执行
   */
  cancelExecution(executionId: string): Promise<void>;

  /**
   * 获取执行状态
   */
  getExecutionStatus(executionId: string): Promise<ExecutionStatus>;

  /**
   * 获取执行结果
   */
  getExecutionResult(executionId: string): Promise<ExecutionResult | undefined>;

  /**
   * 获取执行上下文
   */
  getExecutionContext(executionId: string): Promise<ExecutionContext | undefined>;

  /**
   * 获取执行进度
   */
  getExecutionProgress(executionId: string): Promise<ExecutionProgress>;

  /**
   * 获取执行日志
   */
  getExecutionLogs(
    executionId: string,
    level?: 'debug' | 'info' | 'warn' | 'error',
    nodeId?: ID,
    edgeId?: ID
  ): Promise<Array<{
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    timestamp: Date;
    nodeId?: ID;
    edgeId?: ID;
  }>>;

  /**
   * 重试执行
   */
  retryExecution(executionId: string): Promise<ExecutionResult>;

  /**
   * 获取执行统计信息
   */
  getExecutionStatistics(
    workflowId?: ID,
    startTime?: Date,
    endTime?: Date
  ): Promise<ExecutionStatistics>;

  /**
   * 清理执行历史
   */
  cleanupExecutionHistory(maxAge: number): Promise<number>;

  /**
   * 导出执行结果
   */
  exportExecutionResult(executionId: string): Promise<string>;

  /**
   * 导入执行结果
   */
  importExecutionResult(data: string): Promise<string>;

  /**
   * 订阅执行事件
   */
  subscribeExecutionEvents(callback: ExecutionEventCallback): Promise<string>;

  /**
   * 取消订阅执行事件
   */
  unsubscribeExecutionEvents(subscriptionId: string): Promise<boolean>;
}

/**
 * 工作流执行进度接口
 */
export interface WorkflowExecutionProgress {
  /** 执行ID */
  readonly executionId: string;
  /** 工作流ID */
  readonly workflowId: ID;
  /** 执行状态 */
  readonly status: ExecutionStatus;
  /** 进度百分比 */
  readonly progress: number;
  /** 当前节点ID */
  readonly currentNodeId?: ID;
  /** 已执行节点数 */
  readonly executedNodes: number;
  /** 总节点数 */
  readonly totalNodes: number;
  /** 已执行边数 */
  readonly executedEdges: number;
  /** 总边数 */
  readonly totalEdges: number;
  /** 预估剩余时间（毫秒） */
  readonly estimatedTimeRemaining?: number;
  /** 执行开始时间 */
  readonly startTime: Date;
  /** 当前时间 */
  readonly currentTime: Date;
}

/**
 * 工作流执行统计信息接口
 */
export interface WorkflowExecutionStatistics {
  /** 总执行数 */
  readonly totalExecutions: number;
  /** 成功执行数 */
  readonly successfulExecutions: number;
  /** 失败执行数 */
  readonly failedExecutions: number;
  /** 平均执行时间（毫秒） */
  readonly averageExecutionTime: number;
  /** 最长执行时间（毫秒） */
  readonly maxExecutionTime: number;
  /** 最短执行时间（毫秒） */
  readonly minExecutionTime: number;
  /** 按状态分组的执行数 */
  readonly executionsByStatus: Record<ExecutionStatus, number>;
  /** 按模式分组的执行数 */
  readonly executionsByMode: Record<ExecutionMode, number>;
  /** 按优先级分组的执行数 */
  readonly executionsByPriority: Record<ExecutionPriority, number>;
  /** 按工作流分组的执行数 */
  readonly executionsByWorkflow: Record<string, number>;
  /** 成功率 */
  readonly successRate: number;
  /** 失败率 */
  readonly failureRate: number;
}

/**
 * 工作流执行事件接口
 */
export interface WorkflowExecutionEvent {
  /** 事件类型 */
  readonly type: 'started' | 'paused' | 'resumed' | 'completed' | 'failed' | 'cancelled' | 'node_started' | 'node_completed' | 'edge_traversed';
  /** 执行ID */
  readonly executionId: string;
  /** 工作流ID */
  readonly workflowId: ID;
  /** 事件时间 */
  readonly timestamp: Date;
  /** 相关节点ID */
  readonly nodeId?: ID;
  /** 相关边ID */
  readonly edgeId?: ID;
  /** 事件数据 */
  readonly data?: Record<string, any>;
  /** 事件元数据 */
  readonly metadata: Record<string, any>;
}

/**
 * 工作流执行事件回调类型
 */
export type WorkflowExecutionEventCallback = (event: WorkflowExecutionEvent) => void;

/**
 * 默认工作流执行服务实现
 */
export class DefaultWorkflowExecutionService implements IWorkflowExecutionService {
  constructor(
    private readonly contextManager: IExecutionContextManager,
    private readonly compiler: IWorkflowCompiler,
    private readonly triggerManager: ITriggerManager,
    private readonly stateManager: IStateManager
  ) { }

  /**
   * 执行工作流
   */
  async execute(request: WorkflowExecutionRequest): Promise<ExecutionResult> {
    // 创建执行上下文
    const context: IExecutionContext = {
      executionId: ID.fromString(request.executionId),
      workflowId: request.workflowId,
      data: {},
      workflowState: {} as any,
      executionHistory: [],
      metadata: {},
      startTime: Timestamp.now(),
      status: 'pending',
      getVariable: (path: string) => undefined,
      setVariable: (path: string, value: any) => {},
      getAllVariables: () => ({}),
      getAllMetadata: () => ({}),
      getInput: () => ({}),
      getExecutedNodes: () => [],
      getNodeResult: (nodeId: string) => undefined,
      getElapsedTime: () => 0,
      getWorkflow: () => undefined
    };
    
    await this.contextManager.createContext(context);

    try {
      // 编译工作流
      const compilationOptions: CompilationOptions = {
        target: CompilationTarget.MEMORY,
        optimize: true,
        debug: request.config.debug || false,
        validation: {
          enabled: true,
          level: 'normal'
        }
      };

      // 这里需要获取工作流数据，简化处理
      const workflowData = {}; // 实际实现中应该从仓储获取

      const compilationResult = await this.compiler.compile(
        request.workflowId,
        workflowData,
        compilationOptions
      );

      if (!compilationResult.success) {
        throw new Error(`工作流编译失败: ${compilationResult.validation.errors.map(e => e.message).join(', ')}`);
      }

      // 更新执行状态为运行中
      await this.contextManager.updateStatus(request.executionId, ExecutionStatus.RUNNING);

      // 执行工作流逻辑
      const result = await this.executeWorkflowLogic(request, context, compilationResult);

      // 更新执行状态为已完成
      await this.contextManager.updateStatus(request.executionId, ExecutionStatus.COMPLETED);

      return result;
    } catch (error) {
      // 更新执行状态为失败
      await this.contextManager.updateStatus(request.executionId, ExecutionStatus.FAILED);

      return {
        executionId: ID.fromString(request.executionId),
        status: ExecutionStatus.FAILED,
        data: {},
        error: error as Error,
        statistics: {
          totalTime: new Date().getTime() - context.startTime.getMilliseconds(),
          nodeExecutionTime: 0,
          successfulNodes: 0,
          failedNodes: 0,
          skippedNodes: 0,
          retries: 0
        },
        completedAt: Timestamp.now()
      };
    }
  }

  /**
   * 异步执行工作流
   */
  async executeAsync(request: WorkflowExecutionRequest): Promise<string> {
    // 异步启动执行
    this.execute(request).catch(error => {
      console.error(`异步执行失败 [${request.executionId}]:`, error);
    });

    return request.executionId;
  }

  /**
   * 流式执行工作流
   */
  async executeStream(
    request: WorkflowExecutionRequest,
    onProgress?: (progress: WorkflowExecutionProgress) => void,
    onNodeComplete?: (nodeId: ID, result: any) => void,
    onError?: (error: Error) => void
  ): Promise<WorkflowExecutionResult> {
    // 简化实现，实际中应该支持真正的流式执行
    try {
      const result = await this.execute(request);

      if (onProgress) {
        // 由于ExecutionResult没有workflowId和startTime等属性，需要简化进度信息
        const progressInfo: WorkflowExecutionProgress = {
          executionId: request.executionId,
          workflowId: request.workflowId,
          status: result.status,
          progress: 100,
          executedNodes: 0,
          totalNodes: 0,
          executedEdges: 0,
          totalEdges: 0,
          startTime: new Date(),
          currentTime: new Date()
        };
        onProgress(progressInfo);
      }

      return {
        executionId: result.executionId,
        workflowId: request.workflowId,
        status: result.status,
        data: result.data,
        error: result.error,
        statistics: result.statistics,
        completedAt: result.completedAt
      };
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * 批量执行工作流
   */
  async executeBatch(requests: WorkflowExecutionRequest[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const request of requests) {
      try {
        const result = await this.execute(request);
        results.push(result);
      } catch (error) {
        results.push({
          executionId: ID.fromString(request.executionId),
          status: ExecutionStatus.FAILED,
          data: {},
          error: error as Error,
          statistics: {
            totalTime: 0,
            nodeExecutionTime: 0,
            successfulNodes: 0,
            failedNodes: 0,
            skippedNodes: 0,
            retries: 0
          },
          completedAt: Timestamp.now()
        });
      }
    }

    return results;
  }

  /**
   * 暂停执行
   */
  async pauseExecution(executionId: string): Promise<void> {
    await this.contextManager.updateStatus(executionId, ExecutionStatus.PAUSED);
  }

  /**
   * 恢复执行
   */
  async resumeExecution(executionId: string): Promise<void> {
    await this.contextManager.updateStatus(executionId, ExecutionStatus.RUNNING);
  }

  /**
   * 取消执行
   */
  async cancelExecution(executionId: string): Promise<void> {
    await this.contextManager.updateStatus(executionId, ExecutionStatus.CANCELLED);
  }

  /**
   * 获取执行状态
   */
  async getExecutionStatus(executionId: string): Promise<ExecutionStatus> {
    const context = await this.contextManager.getContext(executionId);
    if (!context) {
      return ExecutionStatus.PENDING;
    }
    
    // 将字符串状态转换为枚举
    switch (context.status) {
      case 'pending': return ExecutionStatus.PENDING;
      case 'running': return ExecutionStatus.RUNNING;
      case 'completed': return ExecutionStatus.COMPLETED;
      case 'failed': return ExecutionStatus.FAILED;
      case 'cancelled': return ExecutionStatus.CANCELLED;
      default: return ExecutionStatus.PENDING;
    }
  }

  /**
   * 获取执行结果
   */
  async getExecutionResult(executionId: string): Promise<ExecutionResult | undefined> {
    const context = await this.contextManager.getContext(executionId);
    if (!context) {
      return undefined;
    }

    return {
      executionId: context.executionId,
      status: ExecutionStatus.PENDING, // 需要将字符串状态转换为枚举
      data: {}, // 实际实现中应该从上下文获取
      statistics: {
        totalTime: context.duration || 0,
        nodeExecutionTime: 0,
        successfulNodes: context.executedNodes?.length || 0,
        failedNodes: 0,
        skippedNodes: 0,
        retries: 0
      },
      completedAt: context.endTime
    };
  }

  /**
   * 获取执行上下文
   */
  async getExecutionContext(executionId: string): Promise<ExecutionContext | undefined> {
    return await this.contextManager.getContext(executionId);
  }

  /**
   * 获取执行进度
   */
  async getExecutionProgress(executionId: string): Promise<ExecutionProgress> {
    const context = await this.contextManager.getContext(executionId);
    if (!context) {
      throw new Error(`执行上下文不存在: ${executionId}`);
    }

    const executedNodes = context.executedNodes || [];
    const pendingNodes = context.pendingNodes || [];
    const totalNodes = executedNodes.length + pendingNodes.length;
    const progress = totalNodes > 0 ? (executedNodes.length / totalNodes) * 100 : 0;

    return {
      executionId: context.executionId,
      totalNodes,
      completedNodes: executedNodes.length,
      progress,
      currentNodeId: context.currentNodeId
    };
  }

  /**
   * 获取执行日志
   */
  async getExecutionLogs(
    executionId: string,
    level?: 'debug' | 'info' | 'warn' | 'error',
    nodeId?: ID,
    edgeId?: ID
  ): Promise<Array<{
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    timestamp: Date;
    nodeId?: ID;
    edgeId?: ID;
  }>> {
    const context = await this.contextManager.getContext(executionId);
    if (!context) {
      return [];
    }

    let logs = (context.logs || []).map(log => ({
      level: log.level,
      message: log.message,
      timestamp: log.timestamp,
      nodeId: log.nodeId,
      edgeId: log.edgeId
    }));

    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    if (nodeId) {
      logs = logs.filter(log => log.nodeId === nodeId);
    }

    if (edgeId) {
      logs = logs.filter(log => log.edgeId === edgeId);
    }

    return logs;
  }

  /**
   * 重试执行
   */
  async retryExecution(executionId: string): Promise<ExecutionResult> {
    const context = await this.contextManager.getContext(executionId);
    if (!context) {
      throw new Error(`执行上下文不存在: ${executionId}`);
    }

    // 创建新的执行请求
    const retryRequest: WorkflowExecutionRequest = {
      executionId: `${executionId}_retry_${Date.now()}`,
      workflowId: context.workflowId,
      mode: context.mode || ExecutionMode.SYNC,
      priority: context.priority || ExecutionPriority.NORMAL,
      config: context.config || {},
      inputData: {}, // 实际实现中应该从上下文获取
      parameters: {}
    };

    return await this.execute(retryRequest);
  }

  /**
   * 获取执行统计信息
   */
  async getExecutionStatistics(
    workflowId?: ID,
    startTime?: Date,
    endTime?: Date
  ): Promise<ExecutionStatistics> {
    // 简化实现，实际中应该从数据库查询
    return {
      totalTime: 0,
      nodeExecutionTime: 0,
      successfulNodes: 0,
      failedNodes: 0,
      skippedNodes: 0,
      retries: 0
    };
  }

  /**
   * 清理执行历史
   */
  async cleanupExecutionHistory(maxAge: number): Promise<number> {
    await this.contextManager.cleanupExpiredContexts();
    return 0; // 简化实现，实际中应该返回清理的数量
  }

  /**
   * 导出执行结果
   */
  async exportExecutionResult(executionId: string): Promise<string> {
    const context = await this.contextManager.exportContext(executionId);
    return context ? JSON.stringify(context) : '';
  }

  /**
   * 导入执行结果
   */
  async importExecutionResult(data: string): Promise<string> {
    const context = JSON.parse(data) as IExecutionContext;
    await this.contextManager.importContext(context);
    return context.executionId.toString();
  }

  /**
   * 订阅执行事件
   */
  async subscribeExecutionEvents(callback: ExecutionEventCallback): Promise<string> {
    // 简化实现，实际中应该支持事件订阅
    return `subscription_${Date.now()}`;
  }

  /**
   * 取消订阅执行事件
   */
  async unsubscribeExecutionEvents(subscriptionId: string): Promise<boolean> {
    // 简化实现，实际中应该支持事件取消订阅
    return true;
  }

  /**
   * 执行工作流逻辑
   */
  private async executeWorkflowLogic(
    request: WorkflowExecutionRequest,
    context: ExecutionContext,
    compilationResult: CompilationResult
  ): Promise<ExecutionResult> {
    // 简化实现，实际中应该执行真正的工作流逻辑
    const endTime = new Date();
    const duration = endTime.getTime() - context.startTime.getMilliseconds();

    return {
      executionId: ID.fromString(request.executionId),
      status: ExecutionStatus.COMPLETED,
      data: request.inputData,
      statistics: {
        totalTime: duration,
        nodeExecutionTime: 0,
        successfulNodes: 0,
        failedNodes: 0,
        skippedNodes: 0,
        retries: 0
      },
      completedAt: Timestamp.now()
    };
  }
}
import { ID } from '../../common/value-objects/id';
import {
  ExecutionContext,
  ExecutionStatus,
  ExecutionMode,
  ExecutionPriority,
  ExecutionConfig,
  IExecutionContextManager
} from '../execution';
import { IGraphCompiler, CompilationOptions, CompilationResult } from '../validation';
import { ITriggerManager, TriggerContext } from '../extensions';
import { IStateManager } from '../state';

/**
 * 执行请求接口
 */
export interface ExecutionRequest {
  /** 执行ID */
  readonly executionId: string;
  /** 图ID */
  readonly graphId: ID;
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
 * 执行结果接口
 */
export interface ExecutionResult {
  /** 执行ID */
  readonly executionId: string;
  /** 图ID */
  readonly graphId: ID;
  /** 执行状态 */
  readonly status: ExecutionStatus;
  /** 执行开始时间 */
  readonly startTime: Date;
  /** 执行结束时间 */
  readonly endTime?: Date;
  /** 执行持续时间（毫秒） */
  readonly duration?: number;
  /** 执行输出 */
  readonly output: Record<string, any>;
  /** 执行错误 */
  readonly error?: Error;
  /** 执行日志 */
  readonly logs: Array<{
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    timestamp: Date;
    nodeId?: ID;
    edgeId?: ID;
  }>;
  /** 执行统计信息 */
  readonly statistics: {
    /** 执行节点数 */
    executedNodes: number;
    /** 总节点数 */
    totalNodes: number;
    /** 执行边数 */
    executedEdges: number;
    /** 总边数 */
    totalEdges: number;
    /** 执行路径 */
    executionPath: ID[];
  };
  /** 执行元数据 */
  readonly metadata: Record<string, any>;
}

/**
 * 图执行服务接口
 */
export interface IGraphExecutionService {
  /**
   * 执行图
   */
  execute(request: ExecutionRequest): Promise<ExecutionResult>;

  /**
   * 异步执行图
   */
  executeAsync(request: ExecutionRequest): Promise<string>;

  /**
   * 流式执行图
   */
  executeStream(
    request: ExecutionRequest,
    onProgress?: (progress: ExecutionProgress) => void,
    onNodeComplete?: (nodeId: ID, result: any) => void,
    onError?: (error: Error) => void
  ): Promise<ExecutionResult>;

  /**
   * 批量执行图
   */
  executeBatch(requests: ExecutionRequest[]): Promise<ExecutionResult[]>;

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
    graphId?: ID,
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
 * 执行进度接口
 */
export interface ExecutionProgress {
  /** 执行ID */
  readonly executionId: string;
  /** 图ID */
  readonly graphId: ID;
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
 * 执行统计信息接口
 */
export interface ExecutionStatistics {
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
  /** 按图分组的执行数 */
  readonly executionsByGraph: Record<string, number>;
  /** 成功率 */
  readonly successRate: number;
  /** 失败率 */
  readonly failureRate: number;
}

/**
 * 执行事件接口
 */
export interface ExecutionEvent {
  /** 事件类型 */
  readonly type: 'started' | 'paused' | 'resumed' | 'completed' | 'failed' | 'cancelled' | 'node_started' | 'node_completed' | 'edge_traversed';
  /** 执行ID */
  readonly executionId: string;
  /** 图ID */
  readonly graphId: ID;
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
 * 执行事件回调类型
 */
export type ExecutionEventCallback = (event: ExecutionEvent) => void;

/**
 * 默认图执行服务实现
 */
export class DefaultGraphExecutionService implements IGraphExecutionService {
  constructor(
    private readonly contextManager: IExecutionContextManager,
    private readonly compiler: IGraphCompiler,
    private readonly triggerManager: ITriggerManager,
    private readonly stateManager: IStateManager
  ) {}

  /**
   * 执行图
   */
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    // 创建执行上下文
    const context = await this.contextManager.createContext(
      request.executionId,
      request.graphId,
      request.config
    );

    try {
      // 编译图
      const compilationOptions: CompilationOptions = {
        target: 'memory' as any,
        optimize: true,
        debug: request.config.debug || false,
        validation: {
          enabled: true,
          level: 'normal'
        }
      };

      // 这里需要获取图数据，简化处理
      const graphData = {}; // 实际实现中应该从仓储获取

      const compilationResult = await this.compiler.compile(
        request.graphId,
        graphData,
        compilationOptions
      );

      if (!compilationResult.success) {
        throw new Error(`图编译失败: ${compilationResult.validation.errors.map(e => e.message).join(', ')}`);
      }

      // 更新执行状态为运行中
      await this.contextManager.updateStatus(request.executionId, ExecutionStatus.RUNNING);

      // 执行图逻辑
      const result = await this.executeGraphLogic(request, context, compilationResult);

      // 更新执行状态为已完成
      await this.contextManager.updateStatus(request.executionId, ExecutionStatus.COMPLETED);

      return result;
    } catch (error) {
      // 更新执行状态为失败
      await this.contextManager.updateStatus(request.executionId, ExecutionStatus.FAILED);
      
      return {
        executionId: request.executionId,
        graphId: request.graphId,
        status: ExecutionStatus.FAILED,
        startTime: context.startTime,
        endTime: new Date(),
        duration: new Date().getTime() - context.startTime.getTime(),
        output: {},
        error: error as Error,
        logs: [],
        statistics: {
          executedNodes: 0,
          totalNodes: 0,
          executedEdges: 0,
          totalEdges: 0,
          executionPath: []
        },
        metadata: {}
      };
    }
  }

  /**
   * 异步执行图
   */
  async executeAsync(request: ExecutionRequest): Promise<string> {
    // 异步启动执行
    this.execute(request).catch(error => {
      console.error(`异步执行失败 [${request.executionId}]:`, error);
    });

    return request.executionId;
  }

  /**
   * 流式执行图
   */
  async executeStream(
    request: ExecutionRequest,
    onProgress?: (progress: ExecutionProgress) => void,
    onNodeComplete?: (nodeId: ID, result: any) => void,
    onError?: (error: Error) => void
  ): Promise<ExecutionResult> {
    // 简化实现，实际中应该支持真正的流式执行
    try {
      const result = await this.execute(request);
      
      if (onProgress) {
        onProgress({
          executionId: request.executionId,
          graphId: request.graphId,
          status: result.status,
          progress: 100,
          executedNodes: result.statistics.executedNodes,
          totalNodes: result.statistics.totalNodes,
          executedEdges: result.statistics.executedEdges,
          totalEdges: result.statistics.totalEdges,
          startTime: result.startTime,
          currentTime: new Date()
        });
      }

      return result;
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * 批量执行图
   */
  async executeBatch(requests: ExecutionRequest[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    
    for (const request of requests) {
      try {
        const result = await this.execute(request);
        results.push(result);
      } catch (error) {
        results.push({
          executionId: request.executionId,
          graphId: request.graphId,
          status: ExecutionStatus.FAILED,
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          output: {},
          error: error as Error,
          logs: [],
          statistics: {
            executedNodes: 0,
            totalNodes: 0,
            executedEdges: 0,
            totalEdges: 0,
            executionPath: []
          },
          metadata: {}
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
    return context?.status || ExecutionStatus.PENDING;
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
      graphId: context.graphId,
      status: context.status,
      startTime: context.startTime,
      endTime: context.endTime,
      duration: context.duration,
      output: {}, // 实际实现中应该从上下文获取
      logs: context.logs.map(log => ({
        level: log.level,
        message: log.message,
        timestamp: log.timestamp,
        nodeId: log.nodeId,
        edgeId: log.edgeId
      })),
      statistics: {
        executedNodes: context.executedNodes.length,
        totalNodes: context.executedNodes.length + context.pendingNodes.length,
        executedEdges: 0, // 实际实现中应该从上下文获取
        totalEdges: 0,
        executionPath: context.executedNodes
      },
      metadata: context.metadata
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

    const progress = (context.executedNodes.length / (context.executedNodes.length + context.pendingNodes.length)) * 100;

    return {
      executionId: context.executionId,
      graphId: context.graphId,
      status: context.status,
      progress,
      currentNodeId: context.currentNodeId,
      executedNodes: context.executedNodes.length,
      totalNodes: context.executedNodes.length + context.pendingNodes.length,
      executedEdges: 0, // 实际实现中应该从上下文获取
      totalEdges: 0,
      startTime: context.startTime,
      currentTime: new Date()
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

    let logs = context.logs.map(log => ({
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
    const retryRequest: ExecutionRequest = {
      executionId: `${executionId}_retry_${Date.now()}`,
      graphId: context.graphId,
      mode: context.mode,
      priority: context.priority,
      config: context.config,
      inputData: {}, // 实际实现中应该从上下文获取
      parameters: {}
    };

    return await this.execute(retryRequest);
  }

  /**
   * 获取执行统计信息
   */
  async getExecutionStatistics(
    graphId?: ID,
    startTime?: Date,
    endTime?: Date
  ): Promise<ExecutionStatistics> {
    // 简化实现，实际中应该从数据库查询
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      maxExecutionTime: 0,
      minExecutionTime: 0,
      executionsByStatus: {} as any,
      executionsByMode: {} as any,
      executionsByPriority: {} as any,
      executionsByGraph: {} as any,
      successRate: 0,
      failureRate: 0
    };
  }

  /**
   * 清理执行历史
   */
  async cleanupExecutionHistory(maxAge: number): Promise<number> {
    return await this.contextManager.cleanupExpiredContexts(maxAge);
  }

  /**
   * 导出执行结果
   */
  async exportExecutionResult(executionId: string): Promise<string> {
    return await this.contextManager.exportContext(executionId);
  }

  /**
   * 导入执行结果
   */
  async importExecutionResult(data: string): Promise<string> {
    return await this.contextManager.importContext(data);
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
   * 执行图逻辑
   */
  private async executeGraphLogic(
    request: ExecutionRequest,
    context: ExecutionContext,
    compilationResult: CompilationResult
  ): Promise<ExecutionResult> {
    // 简化实现，实际中应该执行真正的图逻辑
    const endTime = new Date();
    const duration = endTime.getTime() - context.startTime.getTime();

    return {
      executionId: request.executionId,
      graphId: request.graphId,
      status: ExecutionStatus.COMPLETED,
      startTime: context.startTime,
      endTime,
      duration,
      output: request.inputData,
      logs: [],
      statistics: {
        executedNodes: 0,
        totalNodes: 0,
        executedEdges: 0,
        totalEdges: 0,
        executionPath: []
      },
      metadata: {}
    };
  }
}
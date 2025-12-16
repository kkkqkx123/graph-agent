import { injectable } from 'inversify';

/**
 * 执行模式映射器
 * 
 * 提供执行模式、优先级、状态的统一映射
 */
@injectable()
export class ExecutionModeMapper {
  /**
   * 映射执行模式
   */
  mapExecutionMode(mode: string): 'sequential' | 'parallel' | 'conditional' {
    switch (mode) {
      case 'sequential':
        return 'sequential';
      case 'parallel':
        return 'parallel';
      case 'conditional':
        return 'conditional';
      default:
        return 'sequential';
    }
  }

  /**
   * 映射执行优先级
   */
  mapExecutionPriority(priority: string): 'low' | 'normal' | 'high' | 'urgent' {
    switch (priority) {
      case 'low':
        return 'low';
      case 'normal':
        return 'normal';
      case 'high':
        return 'high';
      case 'urgent':
        return 'urgent';
      default:
        return 'normal';
    }
  }

  /**
   * 映射执行状态
   */
  mapExecutionStatus(status: any): 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused' {
    switch (status) {
      case 'PENDING':
        return 'pending';
      case 'RUNNING':
        return 'running';
      case 'COMPLETED':
        return 'completed';
      case 'FAILED':
        return 'failed';
      case 'CANCELLED':
        return 'cancelled';
      case 'PAUSED':
        return 'paused';
      default:
        return 'pending';
    }
  }

  /**
   * 构建执行请求
   */
  buildExecutionRequest(
    executionId: string,
    graphId: string,
    executionMode?: string,
    priority?: string,
    timeout?: number,
    retryConfig?: any,
    inputData?: Record<string, unknown>,
    parameters?: Record<string, unknown>
  ): any {
    return {
      executionId,
      graphId,
      mode: this.mapExecutionMode(executionMode || 'sequential'),
      priority: this.mapExecutionPriority(priority || 'normal'),
      config: {
        timeout: timeout || 300,
        debug: false,
        retryConfig
      },
      inputData: inputData || {},
      parameters: parameters || {}
    };
  }

  /**
   * 构建执行状态
   */
  buildExecutionStatus(
    executionResult: any,
    graphId: string,
    executionId: string
  ): any {
    const metadata = executionResult.metadata as any;
    
    return {
      graphId,
      executionId,
      status: this.mapExecutionStatus(executionResult.status),
      startTime: executionResult.startTime.toISOString(),
      endTime: executionResult.endTime?.toISOString(),
      duration: executionResult.duration,
      currentNodeId: metadata?.currentNodeId?.toString?.() || undefined,
      executedNodes: executionResult.statistics.executedNodes,
      totalNodes: executionResult.statistics.totalNodes,
      executedEdges: executionResult.statistics.executedEdges,
      totalEdges: executionResult.statistics.totalEdges,
      executionPath: executionResult.statistics.executionPath.map((id: any) => id.toString()),
      nodeStatuses: {},
      output: executionResult.output,
      error: executionResult.error?.message,
      statistics: {
        averageNodeExecutionTime: 0,
        maxNodeExecutionTime: 0,
        minNodeExecutionTime: 0,
        successRate: 0
      }
    };
  }
}
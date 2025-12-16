import { injectable, inject } from 'inversify';
import { Workflow } from '../../../domain/workflow/entities/workflow';
import { WorkflowRepository } from '../../../domain/workflow/repositories/workflow-repository';
import { WorkflowDomainService } from '../../../domain/workflow/services/workflow-domain-service';
import { WorkflowOrchestrator } from './workflow-orchestrator';
import { WorkflowValidator } from './workflow-validator';
import { ID } from '../../../domain/common/value-objects/id';
import { DomainError } from '../../../domain/common/errors/domain-error';
import { ILogger } from '@shared/types/logger';

/**
 * 执行管理请求
 */
export interface ExecutionManagementRequest {
  /** 工作流ID */
  workflowId: string;
  /** 输入数据 */
  inputData: Record<string, unknown>;
  /** 执行参数 */
  parameters?: Record<string, unknown>;
  /** 执行模式 */
  executionMode?: 'sequential' | 'parallel' | 'conditional';
  /** 执行优先级 */
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  /** 超时时间（秒） */
  timeout?: number;
  /** 是否异步执行 */
  async?: boolean;
  /** 操作用户ID */
  userId?: string;
  /** 回调URL */
  callbackUrl?: string;
  /** 重试配置 */
  retryConfig?: {
    /** 最大重试次数 */
    maxRetries: number;
    /** 重试间隔（秒） */
    retryInterval: number;
    /** 指数退避 */
    exponentialBackoff: boolean;
  };
  /** 是否跳过验证 */
  skipValidation?: boolean;
}

/**
 * 执行管理结果
 */
export interface ExecutionManagementResult {
  /** 执行ID */
  executionId: string;
  /** 工作流ID */
  workflowId: string;
  /** 执行状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  /** 开始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime?: Date;
  /** 执行持续时间（毫秒） */
  duration?: number;
  /** 执行输出 */
  output: Record<string, unknown>;
  /** 执行错误 */
  error?: string;
  /** 执行日志 */
  logs: Array<{
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    timestamp: Date;
    nodeId?: string;
    edgeId?: string;
  }>;
  /** 执行统计信息 */
  statistics: {
    /** 执行节点数 */
    executedNodes: number;
    /** 总节点数 */
    totalNodes: number;
    /** 执行边数 */
    executedEdges: number;
    /** 总边数 */
    totalEdges: number;
    /** 执行路径 */
    executionPath: string[];
  };
  /** 执行元数据 */
  metadata: Record<string, unknown>;
}

/**
 * 执行统计信息
 */
export interface ExecutionStatistics {
  /** 总执行数 */
  totalExecutions: number;
  /** 成功执行数 */
  successfulExecutions: number;
  /** 失败执行数 */
  failedExecutions: number;
  /** 平均执行时间（毫秒） */
  averageExecutionTime: number;
  /** 最长执行时间（毫秒） */
  maxExecutionTime: number;
  /** 最短执行时间（毫秒） */
  minExecutionTime: number;
  /** 按状态分组的执行数 */
  executionsByStatus: Record<string, number>;
  /** 按优先级分组的执行数 */
  executionsByPriority: Record<string, number>;
  /** 按工作流分组的执行数 */
  executionsByWorkflow: Record<string, number>;
  /** 成功率 */
  successRate: number;
  /** 失败率 */
  failureRate: number;
}

/**
 * 工作流执行管理器
 * 
 * 负责工作流执行的管理和协调
 */
@injectable()
export class ExecutionManager {
  private readonly activeExecutions = new Map<string, ExecutionManagementResult>();
  private readonly executionQueue: ExecutionManagementRequest[] = [];
  private isProcessingQueue = false;

  constructor(
    @inject('WorkflowRepository') private readonly workflowRepository: WorkflowRepository,
    @inject('WorkflowDomainService') private readonly workflowDomainService: WorkflowDomainService,
    @inject('WorkflowOrchestrator') private readonly workflowOrchestrator: WorkflowOrchestrator,
    @inject('WorkflowValidator') private readonly workflowValidator: WorkflowValidator,
    @inject('Logger') private readonly logger: ILogger
  ) {}

  /**
   * 执行工作流
   * @param request 执行管理请求
   * @returns 执行管理结果
   */
  async executeWorkflow(request: ExecutionManagementRequest): Promise<ExecutionManagementResult> {
    try {
      this.logger.info('开始管理工作流执行', {
        workflowId: request.workflowId,
        executionMode: request.executionMode,
        priority: request.priority,
        async: request.async
      });

      // 获取工作流
      const workflowId = ID.fromString(request.workflowId);
      const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

      // 验证工作流是否可以执行
      if (!request.skipValidation) {
        const validationResult = await this.workflowValidator.validateWorkflowForExecution(request.workflowId);
        if (!validationResult.isValid) {
          throw new DomainError(`工作流验证失败: ${validationResult.errors.join(', ')}`);
        }

        if (validationResult.warnings.length > 0) {
          this.logger.warn('工作流验证警告', {
            workflowId: request.workflowId,
            warnings: validationResult.warnings
          });
        }
      }

      // 生成执行ID
      const executionId = `exec_${workflowId.toString()}_${Date.now()}`;

      // 创建执行结果对象
      const executionResult: ExecutionManagementResult = {
        executionId,
        workflowId: request.workflowId,
        status: 'pending',
        startTime: new Date(),
        output: {},
        logs: [],
        statistics: {
          executedNodes: 0,
          totalNodes: 0,
          executedEdges: 0,
          totalEdges: 0,
          executionPath: []
        },
        metadata: {
          userId: request.userId,
          executionMode: request.executionMode,
          priority: request.priority,
          timeout: request.timeout,
          callbackUrl: request.callbackUrl,
          retryConfig: request.retryConfig
        }
      };

      // 记录执行开始
      this.activeExecutions.set(executionId, executionResult);

      // 根据优先级决定执行方式
      if (request.priority === 'urgent' || request.priority === 'high') {
        // 高优先级直接执行
        await this.executeWorkflowInternal(request, executionResult);
      } else {
        // 普通和低优先级加入队列
        this.executionQueue.push(request);
        this.processExecutionQueue();
      }

      this.logger.info('工作流执行管理完成', {
        executionId,
        workflowId: request.workflowId,
        status: executionResult.status
      });

      return executionResult;
    } catch (error) {
      this.logger.error('管理工作流执行失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取执行状态
   * @param executionId 执行ID
   * @returns 执行状态
   */
  async getExecutionStatus(executionId: string): Promise<string> {
    try {
      const execution = this.activeExecutions.get(executionId);
      if (!execution) {
        throw new DomainError(`执行不存在: ${executionId}`);
      }

      return execution.status;
    } catch (error) {
      this.logger.error('获取执行状态失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取执行结果
   * @param executionId 执行ID
   * @returns 执行结果
   */
  async getExecutionResult(executionId: string): Promise<ExecutionManagementResult | null> {
    try {
      return this.activeExecutions.get(executionId) || null;
    } catch (error) {
      this.logger.error('获取执行结果失败', error as Error);
      throw error;
    }
  }

  /**
   * 暂停执行
   * @param executionId 执行ID
   */
  async pauseExecution(executionId: string): Promise<void> {
    try {
      const execution = this.activeExecutions.get(executionId);
      if (!execution) {
        throw new DomainError(`执行不存在: ${executionId}`);
      }

      if (execution.status !== 'running') {
        throw new DomainError(`只能暂停运行中的执行，当前状态: ${execution.status}`);
      }

      // 调用编排器暂停执行
      await this.workflowOrchestrator.pauseOrchestration(executionId);
      
      // 更新执行状态
      execution.status = 'paused';
      
      this.logger.info('执行已暂停', { executionId });
    } catch (error) {
      this.logger.error('暂停执行失败', error as Error);
      throw error;
    }
  }

  /**
   * 恢复执行
   * @param executionId 执行ID
   */
  async resumeExecution(executionId: string): Promise<void> {
    try {
      const execution = this.activeExecutions.get(executionId);
      if (!execution) {
        throw new DomainError(`执行不存在: ${executionId}`);
      }

      if (execution.status !== 'paused') {
        throw new DomainError(`只能恢复暂停的执行，当前状态: ${execution.status}`);
      }

      // 调用编排器恢复执行
      await this.workflowOrchestrator.resumeOrchestration(executionId);
      
      // 更新执行状态
      execution.status = 'running';
      
      this.logger.info('执行已恢复', { executionId });
    } catch (error) {
      this.logger.error('恢复执行失败', error as Error);
      throw error;
    }
  }

  /**
   * 取消执行
   * @param executionId 执行ID
   */
  async cancelExecution(executionId: string): Promise<void> {
    try {
      const execution = this.activeExecutions.get(executionId);
      if (!execution) {
        throw new DomainError(`执行不存在: ${executionId}`);
      }

      if (['completed', 'failed', 'cancelled'].includes(execution.status)) {
        throw new DomainError(`无法取消已结束的执行，当前状态: ${execution.status}`);
      }

      // 调用编排器取消执行
      await this.workflowOrchestrator.cancelOrchestration(executionId);
      
      // 更新执行状态
      execution.status = 'cancelled';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      
      this.logger.info('执行已取消', { executionId });
    } catch (error) {
      this.logger.error('取消执行失败', error as Error);
      throw error;
    }
  }

  /**
   * 重试执行
   * @param executionId 执行ID
   * @returns 新的执行结果
   */
  async retryExecution(executionId: string): Promise<ExecutionManagementResult> {
    try {
      const execution = this.activeExecutions.get(executionId);
      if (!execution) {
        throw new DomainError(`执行不存在: ${executionId}`);
      }

      if (execution.status !== 'failed') {
        throw new DomainError(`只能重试失败的执行，当前状态: ${execution.status}`);
      }

      // 调用编排器重试执行
      const orchestrationResult = await this.workflowOrchestrator.retryOrchestration(executionId);
      
      // 创建新的执行结果
      const newExecutionResult: ExecutionManagementResult = {
        executionId: orchestrationResult.executionId,
        workflowId: execution.workflowId,
        status: orchestrationResult.status,
        startTime: orchestrationResult.startTime,
        endTime: orchestrationResult.endTime,
        duration: orchestrationResult.duration,
        output: orchestrationResult.output,
        error: orchestrationResult.error,
        logs: orchestrationResult.logs,
        statistics: orchestrationResult.statistics,
        metadata: {
          ...execution.metadata,
          originalExecutionId: executionId,
          isRetry: true
        }
      };

      // 记录新的执行
      this.activeExecutions.set(orchestrationResult.executionId, newExecutionResult);
      
      this.logger.info('执行重试完成', {
        originalExecutionId: executionId,
        newExecutionId: orchestrationResult.executionId
      });

      return newExecutionResult;
    } catch (error) {
      this.logger.error('重试执行失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取执行统计信息
   * @param workflowId 工作流ID（可选）
   * @returns 执行统计信息
   */
  async getExecutionStatistics(workflowId?: string): Promise<ExecutionStatistics> {
    try {
      let executions = Array.from(this.activeExecutions.values());
      
      if (workflowId) {
        executions = executions.filter(exec => exec.workflowId === workflowId);
      }

      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter(exec => exec.status === 'completed').length;
      const failedExecutions = executions.filter(exec => exec.status === 'failed').length;
      
      const completedExecutions = executions.filter(exec => 
        exec.status === 'completed' || exec.status === 'failed'
      );
      
      const executionTimes = completedExecutions
        .filter(exec => exec.duration !== undefined)
        .map(exec => exec.duration!);
      
      const averageExecutionTime = executionTimes.length > 0
        ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
        : 0;
      
      const maxExecutionTime = executionTimes.length > 0 ? Math.max(...executionTimes) : 0;
      const minExecutionTime = executionTimes.length > 0 ? Math.min(...executionTimes) : 0;
      
      // 按状态分组
      const executionsByStatus: Record<string, number> = {};
      executions.forEach(exec => {
        executionsByStatus[exec.status] = (executionsByStatus[exec.status] || 0) + 1;
      });
      
      // 按优先级分组
      const executionsByPriority: Record<string, number> = {};
      executions.forEach(exec => {
        const priority = (exec.metadata['priority'] as string) || 'normal';
        executionsByPriority[priority] = (executionsByPriority[priority] || 0) + 1;
      });
      
      // 按工作流分组
      const executionsByWorkflow: Record<string, number> = {};
      executions.forEach(exec => {
        executionsByWorkflow[exec.workflowId] = (executionsByWorkflow[exec.workflowId] || 0) + 1;
      });
      
      const successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 0;
      const failureRate = totalExecutions > 0 ? failedExecutions / totalExecutions : 0;

      return {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        averageExecutionTime,
        maxExecutionTime,
        minExecutionTime,
        executionsByStatus,
        executionsByPriority,
        executionsByWorkflow,
        successRate,
        failureRate
      };
    } catch (error) {
      this.logger.error('获取执行统计信息失败', error as Error);
      throw error;
    }
  }

  /**
   * 清理已完成的执行
   * @param maxAge 最大保留时间（毫秒）
   * @returns 清理的执行数量
   */
  async cleanupCompletedExecutions(maxAge: number): Promise<number> {
    try {
      const now = Date.now();
      const toDelete: string[] = [];
      
      this.activeExecutions.forEach((execution, executionId) => {
        if (['completed', 'failed', 'cancelled'].includes(execution.status)) {
          const endTime = execution.endTime?.getTime() || execution.startTime.getTime();
          if (now - endTime > maxAge) {
            toDelete.push(executionId);
          }
        }
      });
      
      toDelete.forEach(executionId => {
        this.activeExecutions.delete(executionId);
      });
      
      this.logger.info('清理已完成执行', {
        cleanedCount: toDelete.length,
        maxAge
      });
      
      return toDelete.length;
    } catch (error) {
      this.logger.error('清理已完成执行失败', error as Error);
      throw error;
    }
  }

  /**
   * 内部执行工作流
   * @param request 执行请求
   * @param executionResult 执行结果
   */
  private async executeWorkflowInternal(
    request: ExecutionManagementRequest,
    executionResult: ExecutionManagementResult
  ): Promise<void> {
    try {
      // 更新状态为运行中
      executionResult.status = 'running';
      
      // 构建编排请求
      const orchestrationRequest = {
        workflowId: request.workflowId,
        inputData: request.inputData,
        parameters: request.parameters,
        executionMode: request.executionMode,
        priority: request.priority,
        timeout: request.timeout,
        async: request.async,
        userId: request.userId,
        callbackUrl: request.callbackUrl,
        retryConfig: request.retryConfig
      };
      
      // 调用编排器执行
      const orchestrationResult = await this.workflowOrchestrator.orchestrate(orchestrationRequest);
      
      // 更新执行结果
      executionResult.status = orchestrationResult.status;
      executionResult.endTime = orchestrationResult.endTime;
      executionResult.duration = orchestrationResult.duration;
      executionResult.output = orchestrationResult.output;
      executionResult.error = orchestrationResult.error;
      executionResult.logs = orchestrationResult.logs;
      executionResult.statistics = orchestrationResult.statistics;
      
      // 记录工作流执行结果
      if (orchestrationResult.status === 'completed') {
        await this.workflowDomainService.recordWorkflowExecution(
          ID.fromString(request.workflowId),
          true,
          (orchestrationResult.duration || 0) / 1000
        );
      } else if (orchestrationResult.status === 'failed') {
        await this.workflowDomainService.recordWorkflowExecution(
          ID.fromString(request.workflowId),
          false,
          (orchestrationResult.duration || 0) / 1000
        );
      }
      
      // 如果有回调URL，发送回调
      if (request.callbackUrl) {
        this.sendCallback(request.callbackUrl, executionResult);
      }
    } catch (error) {
      // 更新执行状态为失败
      executionResult.status = 'failed';
      executionResult.endTime = new Date();
      executionResult.duration = executionResult.endTime.getTime() - executionResult.startTime.getTime();
      executionResult.error = error instanceof Error ? error.message : '未知错误';
      
      // 记录工作流执行失败
      try {
        await this.workflowDomainService.recordWorkflowExecution(
          ID.fromString(request.workflowId),
          false,
          executionResult.duration / 1000
        );
      } catch (recordError) {
        this.logger.error('记录工作流执行失败', recordError as Error);
      }
      
      throw error;
    }
  }

  /**
   * 处理执行队列
   */
  private async processExecutionQueue(): Promise<void> {
    if (this.isProcessingQueue || this.executionQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    try {
      // 按优先级排序队列
      this.executionQueue.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
        const aPriority = priorityOrder[a.priority || 'normal'];
        const bPriority = priorityOrder[b.priority || 'normal'];
        return bPriority - aPriority;
      });
      
      // 处理队列中的请求
      while (this.executionQueue.length > 0) {
        const request = this.executionQueue.shift()!;
        
        // 生成执行ID
        const executionId = `exec_${ID.fromString(request.workflowId).toString()}_${Date.now()}`;
        
        // 创建执行结果对象
        const executionResult: ExecutionManagementResult = {
          executionId,
          workflowId: request.workflowId,
          status: 'pending',
          startTime: new Date(),
          output: {},
          logs: [],
          statistics: {
            executedNodes: 0,
            totalNodes: 0,
            executedEdges: 0,
            totalEdges: 0,
            executionPath: []
          },
          metadata: {
            userId: request.userId,
            executionMode: request.executionMode,
            priority: request.priority,
            timeout: request.timeout,
            callbackUrl: request.callbackUrl,
            retryConfig: request.retryConfig
          }
        };
        
        // 记录执行开始
        this.activeExecutions.set(executionId, executionResult);
        
        // 异步执行
        this.executeWorkflowInternal(request, executionResult).catch(error => {
          this.logger.error('队列中的执行失败', error as Error);
        });
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * 发送回调
   * @param callbackUrl 回调URL
   * @param executionResult 执行结果
   */
  private sendCallback(callbackUrl: string, executionResult: ExecutionManagementResult): void {
    // 简化实现，实际应该使用HTTP客户端发送回调
    this.logger.info('发送执行回调', {
      callbackUrl,
      executionId: executionResult.executionId,
      status: executionResult.status
    });
  }
}
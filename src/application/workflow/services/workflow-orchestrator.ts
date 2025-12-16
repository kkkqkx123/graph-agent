import { injectable, inject } from 'inversify';
import { Workflow } from '../../../domain/workflow/entities/workflow';
import { WorkflowRepository } from '../../../domain/workflow/repositories/workflow-repository';
import { WorkflowGraphRepository } from '../../../domain/workflow/repositories/workflow-graph-repository';
import { IWorkflowExecutionService } from '../../../domain/workflow/services/workflow-execution-service';
import { ID } from '../../../domain/common/value-objects/id';
import { DomainError } from '../../../domain/common/errors/domain-error';
import { ILogger } from '@shared/types/logger';

/**
 * 工作流编排请求
 */
export interface WorkflowOrchestrationRequest {
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
}

/**
 * 工作流编排结果
 */
export interface WorkflowOrchestrationResult {
  /** 编排ID */
  orchestrationId: string;
  /** 工作流ID */
  workflowId: string;
  /** 执行ID */
  executionId: string;
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
 * 工作流编排器
 * 
 * 负责工作流的执行编排和协调
 */
@injectable()
export class WorkflowOrchestrator {
  constructor(
    @inject('WorkflowRepository') private readonly workflowRepository: WorkflowRepository,
    @inject('WorkflowGraphRepository') private readonly workflowGraphRepository: WorkflowGraphRepository,
    @inject('IWorkflowExecutionService') private readonly workflowExecutionService: IWorkflowExecutionService,
    @inject('Logger') private readonly logger: ILogger
  ) { }

  /**
   * 编排工作流执行
   * @param request 工作流编排请求
   * @returns 编排结果
   */
  async orchestrate(request: WorkflowOrchestrationRequest): Promise<WorkflowOrchestrationResult> {
    try {
      this.logger.info('开始编排工作流执行', {
        workflowId: request.workflowId,
        executionMode: request.executionMode,
        async: request.async
      });

      // 获取工作流
      const workflowId = ID.fromString(request.workflowId);
      const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

      // 验证工作流状态
      if (!workflow.status.isActive()) {
        throw new DomainError('只能执行活跃状态的工作流');
      }

      // 验证工作流结构
      const validationResult = await this.validateWorkflow(workflow);
      if (!validationResult.isValid) {
        throw new DomainError(`工作流结构验证失败: ${validationResult.errors.join(', ')}`);
      }

      // 生成编排ID和执行ID
      const orchestrationId = `orch_${workflowId.toString()}_${Date.now()}`;
      const executionId = `exec_${workflowId.toString()}_${Date.now()}`;

      // 构建执行请求
      const executionRequest = {
        executionId,
        workflowId: workflow.workflowId,
        mode: this.mapExecutionMode(request.executionMode || 'sequential'),
        priority: this.mapExecutionPriority(request.priority || 'normal'),
        config: {
          timeout: request.timeout || 300, // 默认5分钟超时
          debug: false,
          retryConfig: request.retryConfig
        },
        inputData: request.inputData,
        parameters: request.parameters || {}
      };

      // 执行工作流
      let executionResult;
      if (request.async) {
        // 异步执行
        await this.workflowExecutionService.executeAsync(executionRequest);

        // 返回异步执行结果
        executionResult = {
          executionId,
          workflowId: workflow.workflowId,
          status: 'running' as any,
          startTime: new Date(),
          output: {},
          logs: [],
          statistics: {
            executedNodes: 0,
            totalNodes: workflow.nodes.size,
            executedEdges: 0,
            totalEdges: workflow.edges.size,
            executionPath: []
          },
          metadata: {
            orchestrationId,
            workflowId: request.workflowId,
            userId: request.userId,
            callbackUrl: request.callbackUrl
          }
        };
      } else {
        // 同步执行
        executionResult = await this.workflowExecutionService.execute(executionRequest);
      }

      // 构建编排结果
      const result: WorkflowOrchestrationResult = {
        orchestrationId,
        workflowId: request.workflowId,
        executionId,
        status: this.mapExecutionStatus(executionResult.status),
        startTime: executionResult.startTime,
        endTime: executionResult.endTime,
        duration: executionResult.duration,
        output: executionResult.output,
        error: executionResult.error?.message,
        logs: executionResult.logs.map(log => ({
          level: log.level,
          message: log.message,
          timestamp: log.timestamp,
          nodeId: log.nodeId?.toString(),
          edgeId: log.edgeId?.toString()
        })),
        statistics: {
          executedNodes: executionResult.statistics.executedNodes,
          totalNodes: executionResult.statistics.totalNodes,
          executedEdges: executionResult.statistics.executedEdges,
          totalEdges: executionResult.statistics.totalEdges,
          executionPath: executionResult.statistics.executionPath.map(id => id.toString())
        },
        metadata: {
          ...executionResult.metadata,
          orchestrationId,
          workflowId: request.workflowId,
          userId: request.userId,
          callbackUrl: request.callbackUrl
        }
      };

      this.logger.info('工作流编排完成', {
        orchestrationId,
        workflowId: request.workflowId,
        executionId,
        status: result.status,
        duration: result.duration
      });

      return result;
    } catch (error) {
      this.logger.error('工作流编排失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取编排状态
   * @param orchestrationId 编排ID
   * @returns 编排状态
   */
  async getOrchestrationStatus(orchestrationId: string): Promise<string> {
    try {
      // 从编排ID中提取执行ID
      const executionId = this.extractExecutionId(orchestrationId);
      if (!executionId) {
        throw new DomainError('无效的编排ID');
      }

      const status = await this.workflowExecutionService.getExecutionStatus(executionId);
      return this.mapExecutionStatus(status);
    } catch (error) {
      this.logger.error('获取编排状态失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取编排结果
   * @param orchestrationId 编排ID
   * @returns 编排结果
   */
  async getOrchestrationResult(orchestrationId: string): Promise<WorkflowOrchestrationResult | null> {
    try {
      // 从编排ID中提取执行ID
      const executionId = this.extractExecutionId(orchestrationId);
      if (!executionId) {
        throw new DomainError('无效的编排ID');
      }

      const executionResult = await this.workflowExecutionService.getExecutionResult(executionId);
      if (!executionResult) {
        return null;
      }

      // 构建编排结果
      const result: WorkflowOrchestrationResult = {
        orchestrationId,
        workflowId: '', // 需要从元数据中获取
        executionId,
        status: this.mapExecutionStatus(executionResult.status),
        startTime: executionResult.startTime,
        endTime: executionResult.endTime,
        duration: executionResult.duration,
        output: executionResult.output,
        error: executionResult.error?.message,
        logs: executionResult.logs.map((log: { level: any; message: any; timestamp: any; nodeId: { toString: () => any; }; edgeId: { toString: () => any; }; }) => ({
          level: log.level,
          message: log.message,
          timestamp: log.timestamp,
          nodeId: log.nodeId?.toString(),
          edgeId: log.edgeId?.toString()
        })),
        statistics: {
          executedNodes: executionResult.statistics.executedNodes,
          totalNodes: executionResult.statistics.totalNodes,
          executedEdges: executionResult.statistics.executedEdges,
          totalEdges: executionResult.statistics.totalEdges,
          executionPath: executionResult.statistics.executionPath.map((id: { toString: () => any; }) => id.toString())
        },
        metadata: executionResult.metadata
      };

      return result;
    } catch (error) {
      this.logger.error('获取编排结果失败', error as Error);
      throw error;
    }
  }

  /**
   * 暂停编排
   * @param orchestrationId 编排ID
   */
  async pauseOrchestration(orchestrationId: string): Promise<void> {
    try {
      const executionId = this.extractExecutionId(orchestrationId);
      if (!executionId) {
        throw new DomainError('无效的编排ID');
      }

      await this.workflowExecutionService.pauseExecution(executionId);
      this.logger.info('编排已暂停', { orchestrationId });
    } catch (error) {
      this.logger.error('暂停编排失败', error as Error);
      throw error;
    }
  }

  /**
   * 恢复编排
   * @param orchestrationId 编排ID
   */
  async resumeOrchestration(orchestrationId: string): Promise<void> {
    try {
      const executionId = this.extractExecutionId(orchestrationId);
      if (!executionId) {
        throw new DomainError('无效的编排ID');
      }

      await this.workflowExecutionService.resumeExecution(executionId);
      this.logger.info('编排已恢复', { orchestrationId });
    } catch (error) {
      this.logger.error('恢复编排失败', error as Error);
      throw error;
    }
  }

  /**
   * 取消编排
   * @param orchestrationId 编排ID
   */
  async cancelOrchestration(orchestrationId: string): Promise<void> {
    try {
      const executionId = this.extractExecutionId(orchestrationId);
      if (!executionId) {
        throw new DomainError('无效的编排ID');
      }

      await this.workflowExecutionService.cancelExecution(executionId);
      this.logger.info('编排已取消', { orchestrationId });
    } catch (error) {
      this.logger.error('取消编排失败', error as Error);
      throw error;
    }
  }

  /**
   * 重试编排
   * @param orchestrationId 编排ID
   * @returns 新的编排结果
   */
  async retryOrchestration(orchestrationId: string): Promise<WorkflowOrchestrationResult> {
    try {
      const executionId = this.extractExecutionId(orchestrationId);
      if (!executionId) {
        throw new DomainError('无效的编排ID');
      }

      const executionResult = await this.workflowExecutionService.retryExecution(executionId);

      // 构建新的编排结果
      const result: WorkflowOrchestrationResult = {
        orchestrationId: `${orchestrationId}_retry_${Date.now()}`,
        workflowId: '', // 需要从元数据中获取
        executionId: executionResult.executionId,
        status: this.mapExecutionStatus(executionResult.status),
        startTime: executionResult.startTime,
        endTime: executionResult.endTime,
        duration: executionResult.duration,
        output: executionResult.output,
        error: executionResult.error?.message,
        logs: executionResult.logs.map((log: { level: any; message: any; timestamp: any; nodeId: { toString: () => any; }; edgeId: { toString: () => any; }; }) => ({
          level: log.level,
          message: log.message,
          timestamp: log.timestamp,
          nodeId: log.nodeId?.toString(),
          edgeId: log.edgeId?.toString()
        })),
        statistics: {
          executedNodes: executionResult.statistics.executedNodes,
          totalNodes: executionResult.statistics.totalNodes,
          executedEdges: executionResult.statistics.executedEdges,
          totalEdges: executionResult.statistics.totalEdges,
          executionPath: executionResult.statistics.executionPath.map((id: { toString: () => any; }) => id.toString())
        },
        metadata: executionResult.metadata
      };

      this.logger.info('编排重试完成', {
        originalOrchestrationId: orchestrationId,
        newOrchestrationId: result.orchestrationId,
        executionId: result.executionId
      });

      return result;
    } catch (error) {
      this.logger.error('重试编排失败', error as Error);
      throw error;
    }
  }

  /**
   * 验证工作流结构
   * @param workflow 工作流实体
   * @returns 验证结果
   */
  private async validateWorkflow(workflow: Workflow): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      // 基本验证
      if (workflow.nodes.size === 0) {
        return {
          isValid: false,
          errors: ['工作流必须包含至少一个节点'],
          warnings: []
        };
      }

      // 这里可以添加更多的验证逻辑
      return {
        isValid: true,
        errors: [],
        warnings: []
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : '未知错误'],
        warnings: []
      };
    }
  }

  /**
   * 映射执行模式
   * @param mode 执行模式字符串
   * @returns 执行模式枚举
   */
  private mapExecutionMode(mode: string): any {
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
   * @param priority 执行优先级字符串
   * @returns 执行优先级枚举
   */
  private mapExecutionPriority(priority: string): any {
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
   * @param status 执行状态枚举
   * @returns 执行状态字符串
   */
  private mapExecutionStatus(status: any): 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused' {
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
   * 从编排ID中提取执行ID
   * @param orchestrationId 编排ID
   * @returns 执行ID或null
   */
  private extractExecutionId(orchestrationId: string): string | null {
    // 编排ID格式: orch_${workflowId}_${timestamp}
    // 执行ID格式: exec_${workflowId}_${timestamp}
    // 这里简化处理，实际应该从存储中获取映射关系
    const parts = orchestrationId.split('_');
    if (parts.length >= 3 && parts[0] === 'orch') {
      return `exec_${parts.slice(1).join('_')}`;
    }
    return null;
  }
}
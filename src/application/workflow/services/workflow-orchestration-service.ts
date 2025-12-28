/**
 * 工作流编排服务
 *
 * 协调Thread和Session服务完成工作流执行
 * 专注于工作流级别的编排，不涉及单线程执行细节（由Thread层负责）
 */

import { injectable, inject } from 'inversify';
import { SessionOrchestrationService, ThreadAction } from '../../sessions/interfaces/session-orchestration-service.interface';
import { ThreadCoordinatorService } from '../../../domain/threads/services/thread-coordinator-service.interface';
import { GraphAlgorithmService } from '../../../domain/workflow/services/graph-algorithm-service.interface';
import { GraphValidationService } from '../../../domain/workflow/services/graph-validation-service.interface';
import { WorkflowRepository } from '../../../domain/workflow/repositories/workflow-repository';
import { WorkflowExecutionResultDto } from '../dtos';
import { ID } from '../../../domain/common/value-objects/id';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { TYPES } from '../../../di/service-keys';

/**
 * 工作流编排服务
 */
@injectable()
export class WorkflowOrchestrationService {
  constructor(
    @inject(TYPES.SessionOrchestrationService) private readonly sessionOrchestration: SessionOrchestrationService,
    @inject(TYPES.ThreadCoordinatorService) private readonly threadCoordinator: ThreadCoordinatorService,
    @inject(TYPES.GraphAlgorithmService) private readonly graphAlgorithm: GraphAlgorithmService,
    @inject(TYPES.GraphValidationService) private readonly graphValidation: GraphValidationService,
    @inject(TYPES.WorkflowRepository) private readonly workflowRepository: WorkflowRepository
  ) {}

  /**
   * 执行工作流
   * 委托给SessionOrchestrationService进行编排
   */
  async executeWorkflow(sessionId: ID, workflowId: ID, input: unknown): Promise<WorkflowExecutionResultDto> {
    // 1. 验证工作流存在
    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      throw new Error(`工作流不存在: ${workflowId.toString()}`);
    }

    // 2. 验证工作流图结构（如果需要）
    try {
      const validationResult = this.graphValidation.validateGraph(workflow);
      if (!validationResult) {
        throw new Error('工作流图结构验证失败');
      }
    } catch (error) {
      // 验证可能不支持，跳过或记录警告
      console.warn('工作流验证跳过:', error);
    }

    // 3. 创建执行上下文
    const context = this.createExecutionContext(sessionId, workflowId, input);

    // 4. 通过会话编排服务执行工作流
    return await this.sessionOrchestration.orchestrateWorkflowExecution(sessionId, workflowId, context);
  }

  /**
   * 并行执行多个工作流
   */
  async executeWorkflowsParallel(sessionId: ID, workflowIds: ID[], input: unknown): Promise<WorkflowExecutionResultDto[]> {
    // 1. 验证所有工作流存在
    for (const workflowId of workflowIds) {
      const workflow = await this.workflowRepository.findById(workflowId);
      if (!workflow) {
        throw new Error(`工作流不存在: ${workflowId.toString()}`);
      }
    }

    // 2. 创建执行上下文
    const context = this.createExecutionContext(sessionId, ID.empty(), input);

    // 3. 通过会话编排服务并行执行
    return await this.sessionOrchestration.orchestrateParallelExecution(sessionId, workflowIds, context);
  }

  /**
   * 获取工作流执行路径
   * 提供拓扑排序信息，用于调试和监控
   */
  async getExecutionPath(workflowId: ID): Promise<string[]> {
    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      throw new Error(`工作流不存在: ${workflowId.toString()}`);
    }

    try {
      const topologicalOrderNodes = this.graphAlgorithm.getTopologicalOrder(workflow);
      return topologicalOrderNodes.map(node => node.id.toString());
    } catch (error) {
      console.warn('获取拓扑排序失败:', error);
      return [];
    }
  }

  /**
   * 验证工作流可执行性
   */
  async validateWorkflowExecutable(workflowId: ID): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      return {
        valid: false,
        errors: [`工作流不存在: ${workflowId.toString()}`],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 验证图结构
      const validationResult = this.graphValidation.validateGraph(workflow);
      if (!validationResult) {
        errors.push('工作流图结构验证失败');
      }
    } catch (error) {
      warnings.push(`图验证失败: ${error}`);
    }

    try {
      // 检查循环
      const hasCycle = this.graphAlgorithm.hasCycle(workflow);
      if (hasCycle) {
        errors.push('工作流图存在循环，无法执行');
      }
    } catch (error) {
      warnings.push(`循环检测失败: ${error}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 创建执行上下文
   */
  private createExecutionContext(sessionId: ID, workflowId: ID, input: unknown): Record<string, unknown> {
    return {
      executionId: ID.generate().toString(),
      workflowId: workflowId.toString(),
      data: { input },
      sessionId: sessionId.toString(),
      startTime: Timestamp.now(),
      status: 'pending',
      getVariable: function(path: string) {
        const parts = path.split('.');
        let value: any = { input };
        for (const part of parts) {
          value = value?.[part];
        }
        return value;
      },
      setVariable: function() {},
      getAllVariables: function() { return { input }; },
      getAllMetadata: function() { return {}; },
      getInput: function() { return input; },
      getExecutedNodes: function() { return []; },
      getNodeResult: function() { return null; },
      getElapsedTime: function() { return 0; },
      getWorkflow: function() { return null; }
    };
  }

  /**
   * 创建工作流线程
   */
  async createWorkflowThread(sessionId: ID, workflowId?: ID): Promise<ID> {
    return await this.sessionOrchestration.createThread(sessionId, workflowId);
  }

  /**
   * 管理线程生命周期
   */
  async manageThreadLifecycle(sessionId: ID, threadId: ID, action: ThreadAction): Promise<void> {
    await this.sessionOrchestration.manageThreadLifecycle(sessionId, threadId, action);
  }

  /**
   * 同步会话状态
   */
  async syncSessionState(sessionId: ID): Promise<void> {
    await this.sessionOrchestration.syncSessionState(sessionId);
  }
}

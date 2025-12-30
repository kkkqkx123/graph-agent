/**
 * 工作流编排服务
 *
 * 负责工作流级别的编排和执行，包括：
 * - 工作流图操作（验证、拓扑排序、路径查找）
 * - 工作流执行编排
 * - 执行结果收集
 * - 业务规则验证
 * - 并行执行支持
 *
 * 属于应用层，负责业务流程编排
 */

import { injectable, inject } from 'inversify';
import { GraphAlgorithmService, GraphValidationService, WorkflowRepository } from '../../../domain/workflow';
import { ID, Timestamp, ILogger } from '../../../domain/common';
import { ExecutionContext } from '../../../domain/threads/value-objects/execution-context';
import { PromptContext } from '../../../domain/workflow/value-objects/context/prompt-context';
import { TYPES } from '../../../di/service-keys';
import { WorkflowExecutionEngine } from '../../../infrastructure/workflow/services/workflow-execution-engine';
import { BaseApplicationService } from '../../common/base-application-service';

/**
 * 线程动作类型
 */
export type ThreadAction = 'start' | 'pause' | 'resume' | 'complete' | 'fail' | 'cancel';

/**
 * 工作流执行结果
 */
export interface WorkflowExecutionResult {
  executionId: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime: string;
  duration: number;
  output: Record<string, unknown>;
  logs: Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
  }>;
  statistics: {
    executedNodes: number;
    totalNodes: number;
    executedEdges: number;
    totalEdges: number;
    executionPath: string[];
  };
  metadata: Record<string, unknown>;
}

/**
 * 工作流编排服务
 */
@injectable()
export class WorkflowOrchestrationService extends BaseApplicationService {
  constructor(
    @inject(TYPES.GraphAlgorithmService) private readonly graphAlgorithm: GraphAlgorithmService,
    @inject(TYPES.GraphValidationService) private readonly graphValidation: GraphValidationService,
    @inject(TYPES.WorkflowRepository) private readonly workflowRepository: WorkflowRepository,
    @inject(TYPES.WorkflowExecutionEngine) private readonly workflowExecutionEngine: WorkflowExecutionEngine,
    @inject(TYPES.Logger) logger: ILogger
  ) {
    super(logger);
  }

  /**
   * 获取服务名称
   */
  protected override getServiceName(): string {
    return '工作流编排服务';
  }

  /**
   * 执行工作流
   * 使用 WorkflowExecutionEngine 执行工作流
   */
  async executeWorkflow(sessionId: ID, workflowId: ID, input: unknown): Promise<WorkflowExecutionResult> {
    return this.executeBusinessOperation(
      '工作流执行',
      async () => {
        // 1. 验证工作流存在
        const workflow = await this.workflowRepository.findById(workflowId);
        if (!workflow) {
          throw new Error(`工作流不存在: ${workflowId.toString()}`);
        }

        // 2. 验证工作流可执行性（业务规则）
        this.validateWorkflowExecutionEligibility(workflow);

        // 3. 验证工作流图结构
        const validationResult = this.graphValidation.validateGraphDetailed(workflow);
        if (!validationResult.valid) {
          throw new Error(`工作流图结构验证失败: ${validationResult.errors.join(', ')}`);
        }

        // 4. 检查循环
        if (this.graphAlgorithm.hasCycle(workflow)) {
          throw new Error('工作流图存在循环，无法执行');
        }

        // 5. 创建执行上下文
        const context = this.createExecutionContext(sessionId, workflowId, input);

        // 6. 使用 WorkflowExecutionEngine 执行工作流
        const startTime = Timestamp.now();
        const result = await this.workflowExecutionEngine.execute(workflow, context);
        const endTime = Timestamp.now();

        // 7. 转换执行结果
        return this.convertToWorkflowExecutionResult(
          sessionId,
          workflowId,
          result,
          startTime,
          endTime
        );
      },
      { sessionId: sessionId.toString(), workflowId: workflowId.toString() }
    );
  }

  /**
   * 验证工作流执行资格（业务规则）
   */
  private validateWorkflowExecutionEligibility(workflow: any): void {
    // 验证状态
    if (!workflow.status.isActive()) {
      throw new Error(`工作流不是活跃状态，当前状态: ${workflow.status.toString()}`);
    }

    // 验证是否已删除
    if (workflow.isDeleted()) {
      throw new Error('工作流已删除，无法执行');
    }

    // 验证是否为空
    if (workflow.isEmpty()) {
      throw new Error('工作流为空，无法执行');
    }

    // 验证是否有节点
    if (workflow.getNodeCount() === 0) {
      throw new Error('工作流没有节点，无法执行');
    }

    // 验证是否有起始节点
    const topologicalOrder = this.graphAlgorithm.getTopologicalOrder(workflow);
    if (topologicalOrder.length === 0) {
      throw new Error('工作流没有起始节点，无法执行');
    }
  }

  /**
   * 并行执行多个工作流
   */
  async executeWorkflowsParallel(sessionId: ID, workflowIds: ID[], input: unknown): Promise<WorkflowExecutionResult[]> {
    // 1. 验证所有工作流存在
    const workflows: Map<ID, any> = new Map();
    for (const workflowId of workflowIds) {
      const workflow = await this.workflowRepository.findById(workflowId);
      if (!workflow) {
        throw new Error(`工作流不存在: ${workflowId.toString()}`);
      }
      workflows.set(workflowId, workflow);
    }

    // 2. 并行执行所有工作流
    const results = await Promise.all(
      workflowIds.map(async (workflowId) => {
        const workflow = workflows.get(workflowId);
        const context = this.createExecutionContext(sessionId, workflowId, input);
        const startTime = Timestamp.now();
        const result = await this.workflowExecutionEngine.execute(workflow!, context);
        const endTime = Timestamp.now();
        return this.convertToWorkflowExecutionResult(sessionId, workflowId, result, startTime, endTime);
      })
    );

    return results;
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
  private createExecutionContext(sessionId: ID, workflowId: ID, input: unknown): ExecutionContext {
    const promptContext = PromptContext.create('');
    return ExecutionContext.create(promptContext) as ExecutionContext;
  }

  /**
   * 转换执行结果
   */
  private convertToWorkflowExecutionResult(
    sessionId: ID,
    workflowId: ID,
    result: any,
    startTime: Timestamp,
    endTime: Timestamp
  ): WorkflowExecutionResult {
    return {
      executionId: result.executedNodes.length > 0 ? result.executedNodes[0].toString() : ID.generate().toString(),
      workflowId: workflowId.toString(),
      status: result.success ? 'completed' : 'failed',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: result.duration,
      output: result.results ? Object.fromEntries(result.results) : {},
      logs: [],
      statistics: {
        executedNodes: result.statistics.executedNodes,
        totalNodes: result.statistics.totalNodes,
        executedEdges: 0,
        totalEdges: 0,
        executionPath: result.executedNodes.map((node: any) => node.toString())
      },
      metadata: {
        sessionId: sessionId.toString(),
        error: result.error
      }
    };
  }
}

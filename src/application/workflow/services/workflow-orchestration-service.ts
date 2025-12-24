/**
 * 工作流编排服务
 * 协调Thread和Session服务完成工作流执行
 */

import { injectable } from 'inversify';
import { SessionOrchestrationService, ThreadAction } from '../../sessions/interfaces/session-orchestration-service.interface';
import { ThreadCoordinatorService } from '../../../domain/threads/interfaces/thread-coordinator-service.interface';
import { GraphAlgorithmService } from '../../../domain/workflow/interfaces/graph-algorithm-service.interface';
import { GraphValidationService } from '../../../domain/workflow/interfaces/graph-validation-service.interface';
import { ExecutionContext, IExecutionContext } from '../../../domain/workflow/execution/execution-context.interface';
import { ExecutionResult } from '../../../domain/workflow/execution/types';
import { ID } from '../../../domain/common/value-objects/id';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';

/**
 * 工作流编排服务
 */
@injectable()
export class WorkflowOrchestrationService {
  constructor(
    private readonly sessionOrchestration: SessionOrchestrationService,
    private readonly threadCoordinator: ThreadCoordinatorService,
    private readonly graphAlgorithm: GraphAlgorithmService,
    private readonly graphValidation: GraphValidationService
  ) {}

  /**
   * 执行工作流
   */
  async executeWorkflow(sessionId: ID, workflowId: ID, input: unknown): Promise<ExecutionResult> {
    // TODO: 需要先获取工作流图对象，然后进行验证
    // 1. 验证工作流图结构
    // const validationResult = await this.graphValidation.validateGraphStructure(workflowGraph);
    // if (!validationResult.valid) {
    //   throw new Error(`工作流验证失败: ${validationResult.errors.join(', ')}`);
    // }

    // 2. 生成拓扑排序
    // const topologicalOrder = await this.graphAlgorithm.getTopologicalOrder(workflowGraph);

    // 3. 创建执行上下文
    const context = this.createExecutionContext(sessionId, workflowId, input);

    // 4. 通过会话编排服务执行工作流
    return await this.sessionOrchestration.orchestrateWorkflowExecution(sessionId, workflowId, context);
  }

  /**
   * 并行执行多个工作流
   */
  async executeWorkflowsParallel(sessionId: ID, workflowIds: ID[], input: unknown): Promise<ExecutionResult[]> {
    const context = this.createExecutionContext(sessionId, ID.empty(), input);
    return await this.sessionOrchestration.orchestrateParallelExecution(sessionId, workflowIds, context);
  }

  /**
   * 创建执行上下文
   */
  private createExecutionContext(sessionId: ID, workflowId: ID, input: unknown): IExecutionContext {
    return {
      executionId: ID.generate(),
      workflowId: workflowId,
      data: { input },
      workflowState: {
        getVariable: (path: string) => {
          const parts = path.split('.');
          let value: any = { input };
          for (const part of parts) {
            value = value?.[part];
          }
          return value;
        },
        setVariable: () => {},
        getAllVariables: () => ({ input }),
        getAllMetadata: () => ({}),
        getInput: () => input,
        getExecutedNodes: () => [],
        getNodeResult: () => null,
        getElapsedTime: () => 0,
        getWorkflow: () => null
      } as any,
      executionHistory: [],
      metadata: { sessionId: sessionId.toString() },
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
}
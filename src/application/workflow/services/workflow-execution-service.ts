/**
 * 工作流执行服务
 * 
 * 负责工作流的执行和统计信息获取
 */

import { injectable, inject } from 'inversify';
import { Workflow, WorkflowRepository } from '../../../domain/workflow';
import { ID, Timestamp, ILogger } from '../../../domain/common';
import { BaseApplicationService } from '../../common/base-application-service';
import { WorkflowDTO, WorkflowConverter, WorkflowExecutionResultDTO, WorkflowStatisticsDTO } from '../dtos/workflow-dto';

/**
 * 执行工作流参数
 */
export interface ExecuteWorkflowParams {
  workflowId: string;
  inputData?: unknown;
  executionMode?: string;
  async?: boolean;
}

/**
 * 获取工作流统计信息参数
 */
export interface GetWorkflowStatisticsParams {
  // 可以添加过滤参数
}

/**
 * 工作流执行服务
 */
@injectable()
export class WorkflowExecutionService extends BaseApplicationService {
  constructor(
    @inject('WorkflowRepository') private readonly workflowRepository: WorkflowRepository,
    @inject('Logger') logger: ILogger
  ) {
    super(logger);
  }

  /**
   * 获取服务名称
   */
  protected override getServiceName(): string {
    return '工作流执行服务';
  }

  /**
   * 执行工作流
   * @param params 执行工作流参数
   * @returns 执行结果DTO
   */
  async executeWorkflow(params: ExecuteWorkflowParams): Promise<WorkflowExecutionResultDTO> {
    return this.executeBusinessOperation(
      '工作流',
      async () => {
        const workflowId = this.parseId(params.workflowId, '工作流ID');
        const workflow = await this.workflowRepository.findByIdOrFail(workflowId);

        // 验证执行条件
        this.validateExecutionEligibility(workflow);

        // 生成执行ID
        const executionId = `exec_${workflowId.toString()}_${Timestamp.now().getMilliseconds()}`;

        // 记录执行开始
        const startTime = Timestamp.now();

        // 这里应该调用工作流编排器来执行工作流
        // 简化实现，直接返回一个模拟的执行结果
        const endTime = Timestamp.now();
        const duration = endTime.getMilliseconds() - startTime.getMilliseconds();

        // 计算执行路径
        const executionPath = this.calculateExecutionPath(workflow);

        const result = new WorkflowExecutionResultDTO({
          executionId,
          workflowId: params.workflowId,
          status: 'completed',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration,
          output: params.inputData as Record<string, unknown>,
          logs: [],
          statistics: {
            executedNodes: executionPath.length,
            totalNodes: workflow.getNodeCount(),
            executedEdges: executionPath.length - 1,
            totalEdges: workflow.getEdgeCount(),
            executionPath: executionPath.map(nodeId => nodeId.toString())
          },
          metadata: {}
        });

        return result;
      },
      { workflowId: params.workflowId, executionMode: params.executionMode, async: params.async }
    );
  }

  /**
   * 获取工作流统计信息
   * @param params 获取工作流统计信息参数
   * @returns 工作流统计信息DTO
   */
  async getWorkflowStatistics(params: GetWorkflowStatisticsParams): Promise<WorkflowStatisticsDTO> {
    return this.executeQueryOperation(
      '工作流统计信息',
      async () => {
        // 获取所有工作流
        const allWorkflows = await this.workflowRepository.findAll();

        // 计算统计信息
        const stats = this.calculateWorkflowStatistics(allWorkflows);

        // 获取标签统计
        const tagStats = await this.workflowRepository.getWorkflowTagStats();

        return new WorkflowStatisticsDTO({
          ...stats,
          tagStatistics: tagStats
        });
      }
    );
  }

  /**
   * 计算工作流统计信息
   * @param workflows 工作流列表
   * @returns 统计信息
   */
  private calculateWorkflowStatistics(workflows: Workflow[]): {
    totalWorkflows: number;
    draftWorkflows: number;
    activeWorkflows: number;
    inactiveWorkflows: number;
    archivedWorkflows: number;
    totalExecutions: number;
    totalSuccesses: number;
    totalFailures: number;
    averageSuccessRate: number;
    averageExecutionTime: number;
    workflowsByStatus: Record<string, number>;
    workflowsByType: Record<string, number>;
  } {
    const stats = {
      totalWorkflows: workflows.length,
      draftWorkflows: workflows.filter(wf => wf.status.isDraft()).length,
      activeWorkflows: workflows.filter(wf => wf.status.isActive()).length,
      inactiveWorkflows: workflows.filter(wf => wf.status.isInactive()).length,
      archivedWorkflows: workflows.filter(wf => wf.status.isArchived()).length,
      totalExecutions: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      averageSuccessRate: 0,
      averageExecutionTime: 0,
      workflowsByStatus: {} as Record<string, number>,
      workflowsByType: {} as Record<string, number>
    };

    // 按状态统计
    workflows.forEach(workflow => {
      const status = workflow.status.toString();
      stats.workflowsByStatus[status] = (stats.workflowsByStatus[status] || 0) + 1;
    });

    // 按类型统计
    workflows.forEach(workflow => {
      const type = workflow.type.toString();
      stats.workflowsByType[type] = (stats.workflowsByType[type] || 0) + 1;
    });

    return stats;
  }

  /**
   * 计算执行路径
   * @param workflow 工作流
   * @returns 执行路径节点ID列表
   */
  private calculateExecutionPath(workflow: Workflow): ID[] {
    const executionPath: ID[] = [];
    const visited = new Set<string>();

    // 简化实现：从第一个节点开始，沿着出边遍历
    let currentNodeId: ID | null = null;

    // 获取第一个节点
    const nodes = workflow.getNodes();
    if (nodes.size === 0) {
      return executionPath;
    }

    const firstNode = Array.from(nodes.values())[0];
    if (!firstNode) {
      return executionPath;
    }

    currentNodeId = firstNode.id;

    // 遍历图直到没有出边或形成循环
    const maxIterations = workflow.getNodeCount();
    let iterations = 0;

    while (currentNodeId && iterations < maxIterations) {
      const nodeIdStr = currentNodeId.toString();

      if (visited.has(nodeIdStr)) {
        // 检测到循环，停止遍历
        break;
      }

      visited.add(nodeIdStr);
      executionPath.push(currentNodeId);

      // 获取下一个节点
      currentNodeId = this.getNextExecutionNode(workflow, currentNodeId);
      iterations++;
    }

    return executionPath;
  }

  /**
   * 验证工作流是否可以执行
   */
  private validateExecutionEligibility(workflow: Workflow): void {
    if (!workflow.status.isActive()) {
      throw new Error('只有活跃状态的工作流才能执行');
    }

    if (workflow.isDeleted()) {
      throw new Error('已删除的工作流不能执行');
    }

    if (workflow.isEmpty()) {
      throw new Error('空工作流不能执行');
    }
  }

  /**
   * 获取工作流的下一个执行节点
   */
  private getNextExecutionNode(workflow: Workflow, currentNodeId?: ID): ID | null {
    if (!currentNodeId) {
      // 返回第一个节点
      const nodes = workflow.getNodes();
      if (nodes.size === 0) return null;
      const firstNode = Array.from(nodes.values())[0];
      return firstNode ? firstNode.id : null;
    }

    // 获取当前节点的出边
    // 注意：getOutgoingEdges可能期望NodeId类型，这里需要类型转换
    const { NodeId } = require('../../../domain/workflow');
    const nodeId = NodeId.fromString(currentNodeId.toString());
    const outgoingEdges = workflow.getOutgoingEdges(nodeId);
    if (outgoingEdges.length === 0) return null;

    // 简单实现：返回第一个出边的目标节点
    if (outgoingEdges.length === 0) return null;
    const firstEdge = outgoingEdges[0];
    return firstEdge ? firstEdge.toNodeId : null;
  }
}
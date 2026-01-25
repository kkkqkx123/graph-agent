/**
 * 工作流结构验证器
 *
 * 负责验证业务工作流的结构完整性，包括：
 * - 检查是否包含 start 节点
 * - 检查是否包含 end 节点
 * - 验证 start 节点入度为0
 * - 验证 end 节点出度为0
 *
 * 注意：此验证器仅用于业务工作流（business/ 目录），
 * 子工作流（base/ 目录）不需要 start/end 节点
 */

import { injectable, inject } from 'inversify';
import { Workflow } from '../../../domain/workflow';
import { ILogger } from '../../../domain/common';

/**
 * 工作流结构验证结果
 */
export interface WorkflowStructureValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误列表 */
  errors: string[];
  /** 警告列表 */
  warnings: string[];
  /** 是否有 start 节点 */
  hasStartNode: boolean;
  /** 是否有 end 节点 */
  hasEndNode: boolean;
  /** start 节点ID */
  startNodeId?: string;
  /** end 节点ID */
  endNodeId?: string;
}

/**
 * 工作流结构验证器
 */
@injectable()
export class WorkflowStructureValidator {
  constructor(@inject('Logger') private readonly logger: ILogger) {}

  /**
   * 验证工作流结构
   * @param workflow 工作流实例
   * @returns 验证结果
   */
  async validate(workflow: Workflow): Promise<WorkflowStructureValidationResult> {
    this.logger.info('开始验证工作流结构', {
      workflowId: workflow.workflowId.toString(),
      workflowName: workflow.name,
    });

    const result: WorkflowStructureValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      hasStartNode: false,
      hasEndNode: false,
    };

    const graph = workflow.getGraph();
    const nodes = Array.from(graph.nodes.values());

    // 1. 检查是否有 start 节点
    const startNodes = nodes.filter((node) => node.type.toString() === 'start');
    if (startNodes.length === 0) {
      result.errors.push(
        '工作流缺少 start 节点。业务工作流必须包含 start 节点以正确初始化上下文和状态。' +
        'start 节点负责初始化：workflow_start_time、workflow_execution_id、execution_stats 等关键变量。'
      );
      result.isValid = false;
    } else {
      const firstStartNode = startNodes[0]!;
      if (startNodes.length > 1) {
        result.warnings.push(
          `工作流包含 ${startNodes.length} 个 start 节点，建议只保留一个。` +
          `找到的 start 节点：${startNodes.map((n) => n.nodeId.toString()).join(', ')}`
        );
      }
      result.hasStartNode = true;
      result.startNodeId = firstStartNode.nodeId.toString();
    }

    // 2. 检查是否有 end 节点
    const endNodes = nodes.filter((node) => node.type.toString() === 'end');
    if (endNodes.length === 0) {
      result.errors.push(
        '工作流缺少 end 节点。业务工作流必须包含 end 节点以正确收集结果和清理资源。' +
        'end 节点负责：记录结束时间、更新执行统计、收集执行结果、清理临时资源。'
      );
      result.isValid = false;
    } else {
      const firstEndNode = endNodes[0]!;
      if (endNodes.length > 1) {
        result.warnings.push(
          `工作流包含 ${endNodes.length} 个 end 节点，建议只保留一个。` +
          `找到的 end 节点：${endNodes.map((n) => n.nodeId.toString()).join(', ')}`
        );
      }
      result.hasEndNode = true;
      result.endNodeId = firstEndNode.nodeId.toString();
    }

    // 3. 检查 start 节点是否为入口节点（入度为0）
    if (result.hasStartNode) {
      const startNode = startNodes[0]!;
      const inDegree = this.calculateInDegree(startNode.nodeId.toString(), graph);
      if (inDegree > 0) {
        result.errors.push(
          `start 节点 (${startNode.nodeId.toString()}) 的入度为 ${inDegree}，应该为 0。` +
          'start 节点应该是工作流的入口点，不应该有输入边。'
        );
        result.isValid = false;
      }
    }

    // 4. 检查 end 节点是否为出口节点（出度为0）
    if (result.hasEndNode) {
      const endNode = endNodes[0]!;
      const outDegree = this.calculateOutDegree(endNode.nodeId.toString(), graph);
      if (outDegree > 0) {
        result.errors.push(
          `end 节点 (${endNode.nodeId.toString()}) 的出度为 ${outDegree}，应该为 0。` +
          'end 节点应该是工作流的出口点，不应该有输出边。'
        );
        result.isValid = false;
      }
    }

    // 5. 检查是否有孤立的节点（既没有入边也没有出边，且不是 start/end 节点）
    const isolatedNodes = nodes.filter((node) => {
      const nodeType = node.type.toString();
      if (nodeType === 'start' || nodeType === 'end') {
        return false;
      }
      const inDegree = this.calculateInDegree(node.nodeId.toString(), graph);
      const outDegree = this.calculateOutDegree(node.nodeId.toString(), graph);
      return inDegree === 0 && outDegree === 0;
    });

    if (isolatedNodes.length > 0) {
      result.warnings.push(
        `发现 ${isolatedNodes.length} 个孤立节点（既没有入边也没有出边）：${isolatedNodes
          .map((n) => n.nodeId.toString())
          .join(', ')}。这些节点可能无法被执行。`
      );
    }

    this.logger.info('工作流结构验证完成', {
      workflowId: workflow.workflowId.toString(),
      isValid: result.isValid,
      hasStartNode: result.hasStartNode,
      hasEndNode: result.hasEndNode,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
    });

    return result;
  }

  /**
   * 计算节点的入度
   * @param nodeId 节点ID
   * @param graph 工作流图
   * @returns 入度
   */
  private calculateInDegree(nodeId: string, graph: any): number {
    return graph.edges.filter((edge: any) => edge.toNodeId.toString() === nodeId).length;
  }

  /**
   * 计算节点的出度
   * @param nodeId 节点ID
   * @param graph 工作流图
   * @returns 出度
   */
  private calculateOutDegree(nodeId: string, graph: any): number {
    return graph.edges.filter((edge: any) => edge.fromNodeId.toString() === nodeId).length;
  }
}
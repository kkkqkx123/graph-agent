/**
 * 子工作流验证器
 *
 * 负责验证子工作流是否符合标准，包括：
 * - 入度/出度检查（基于图结构计算）
 * - 入口/出口节点类型检查
 * - 状态检查（无状态、无外部依赖）
 *
 * 设计原则：
 * - 完全基于图结构计算，不依赖配置文件中的标准声明
 * - 静态分析，在加载时进行验证
 * - 自动确定工作流类型
 */

import { injectable, inject } from 'inversify';
import { Workflow } from '../../../domain/workflow';
import { ILogger } from '../../../domain/common';

/**
 * 子工作流类型
 * - start: 起始子工作流（入度0，出度1）
 * - middle: 中间子工作流（入度1，出度1）
 * - end: 结束子工作流（入度1，出度0）
 * - independent: 独立工作流（入度0，出度0），不能作为子工作流引用
 * - invalid: 无效工作流（入度或出度超过1）
 */
export type SubWorkflowType = 'start' | 'middle' | 'end' | 'independent' | 'invalid';

/**
 * 节点信息
 */
export interface NodeInfo {
  /** 节点ID */
  nodeId: string;
  /** 节点类型 */
  nodeType: string;
  /** 入度 */
  inDegree: number;
  /** 出度 */
  outDegree: number;
}

/**
 * 度标准
 */
export interface DegreeStandards {
  /** 最大入度/出度 */
  maxDegree: number;
  /** 最小入度/出度 */
  minDegree: number;
  /** 节点类型列表 */
  nodeTypes: string[];
}

/**
 * 子工作流验证结果
 */
export interface SubWorkflowValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误列表 */
  errors: string[];
  /** 警告列表 */
  warnings: string[];
  /** 子工作流类型 */
  workflowType: SubWorkflowType;
  /** 入口节点信息 */
  entryNodes: NodeInfo[];
  /** 出口节点信息 */
  exitNodes: NodeInfo[];
  /** 入度标准 */
  entryStandards: DegreeStandards;
  /** 出度标准 */
  exitStandards: DegreeStandards;
}

/**
 * 子工作流验证器
 */
@injectable()
export class SubWorkflowValidator {
  constructor(@inject('Logger') private readonly logger: ILogger) {}

  /**
   * 验证子工作流
   * @param workflow 工作流实例
   * @returns 验证结果
   */
  async validateSubWorkflow(workflow: Workflow): Promise<SubWorkflowValidationResult> {
    this.logger.info('开始验证子工作流', {
      workflowId: workflow.workflowId.toString(),
      workflowName: workflow.name,
    });

    const result: SubWorkflowValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      workflowType: 'invalid',
      entryNodes: [],
      exitNodes: [],
      entryStandards: { maxDegree: 0, minDegree: 0, nodeTypes: [] },
      exitStandards: { maxDegree: 0, minDegree: 0, nodeTypes: [] },
    };

    // 1. 计算所有节点的入度和出度
    const nodeDegrees = this.calculateNodeDegrees(workflow);

    // 2. 找到入口节点（入度为0的节点）
    result.entryNodes = this.findEntryNodes(workflow, nodeDegrees);

    // 3. 找到出口节点（出度为0的节点）
    result.exitNodes = this.findExitNodes(workflow, nodeDegrees);

    // 4. 计算入口标准
    result.entryStandards = this.calculateEntryStandards(result.entryNodes);

    // 5. 计算出口标准
    result.exitStandards = this.calculateExitStandards(result.exitNodes);

    // 6. 验证入度标准（子工作流入口节点的入度必须<=1）
    this.validateEntryDegreeStandards(result);

    // 7. 验证出度标准（子工作流出口节点的出度必须<=1）
    this.validateExitDegreeStandards(result);

    // 8. 验证状态标准
    this.validateStateStandards(workflow, result);

    // 9. 确定子工作流类型
    result.workflowType = this.determineWorkflowType(result);

    // 10. 检查是否可以作为子工作流
    this.checkSubWorkflowEligibility(result);

    this.logger.info('子工作流验证完成', {
      workflowId: workflow.workflowId.toString(),
      isValid: result.isValid,
      workflowType: result.workflowType,
      entryNodeCount: result.entryNodes.length,
      exitNodeCount: result.exitNodes.length,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
    });

    return result;
  }

  /**
   * 计算所有节点的入度和出度
   * @param workflow 工作流
   * @returns 节点度数映射
   */
  private calculateNodeDegrees(workflow: Workflow): Map<string, NodeInfo> {
    const graph = workflow.getGraph();
    const nodes = Array.from(graph.nodes.values());
    const nodeDegrees = new Map<string, NodeInfo>();

    // 初始化所有节点的度数
    nodes.forEach((node) => {
      nodeDegrees.set(node.nodeId.toString(), {
        nodeId: node.nodeId.toString(),
        nodeType: node.type.toString(),
        inDegree: 0,
        outDegree: 0,
      });
    });

    // 计算入度
    graph.edges.forEach((edge) => {
      const targetId = edge.toNodeId.toString();
      const degrees = nodeDegrees.get(targetId);
      if (degrees) {
        degrees.inDegree++;
      }
    });

    // 计算出度
    graph.edges.forEach((edge) => {
      const sourceId = edge.fromNodeId.toString();
      const degrees = nodeDegrees.get(sourceId);
      if (degrees) {
        degrees.outDegree++;
      }
    });

    return nodeDegrees;
  }

  /**
   * 找到入口节点（入度为0的节点）
   * @param workflow 工作流
   * @param nodeDegrees 节点度数映射
   * @returns 入口节点列表
   */
  private findEntryNodes(
    workflow: Workflow,
    nodeDegrees: Map<string, NodeInfo>
  ): NodeInfo[] {
    const graph = workflow.getGraph();
    const nodes = Array.from(graph.nodes.values());

    // 入口节点：入度为0的节点
    const entryNodes = nodes
      .map((node) => nodeDegrees.get(node.nodeId.toString())!)
      .filter((nodeInfo) => nodeInfo.inDegree === 0);

    return entryNodes;
  }

  /**
   * 找到出口节点（出度为0的节点）
   * @param workflow 工作流
   * @param nodeDegrees 节点度数映射
   * @returns 出口节点列表
   */
  private findExitNodes(
    workflow: Workflow,
    nodeDegrees: Map<string, NodeInfo>
  ): NodeInfo[] {
    const graph = workflow.getGraph();
    const nodes = Array.from(graph.nodes.values());

    // 出口节点：出度为0的节点
    const exitNodes = nodes
      .map((node) => nodeDegrees.get(node.nodeId.toString())!)
      .filter((nodeInfo) => nodeInfo.outDegree === 0);

    return exitNodes;
  }

  /**
   * 计算入口标准
   * @param entryNodes 入口节点列表
   * @returns 入口标准
   */
  private calculateEntryStandards(entryNodes: NodeInfo[]): DegreeStandards {
    if (entryNodes.length === 0) {
      return { maxDegree: 0, minDegree: 0, nodeTypes: [] };
    }

    const inDegrees = entryNodes.map((node) => node.inDegree);
    const nodeTypes = entryNodes.map((node) => node.nodeType);

    return {
      maxDegree: Math.max(...inDegrees),
      minDegree: Math.min(...inDegrees),
      nodeTypes: [...new Set(nodeTypes)], // 去重
    };
  }

  /**
   * 计算出口标准
   * @param exitNodes 出口节点列表
   * @returns 出口标准
   */
  private calculateExitStandards(exitNodes: NodeInfo[]): DegreeStandards {
    if (exitNodes.length === 0) {
      return { maxDegree: 0, minDegree: 0, nodeTypes: [] };
    }

    const outDegrees = exitNodes.map((node) => node.outDegree);
    const nodeTypes = exitNodes.map((node) => node.nodeType);

    return {
      maxDegree: Math.max(...outDegrees),
      minDegree: Math.min(...outDegrees),
      nodeTypes: [...new Set(nodeTypes)], // 去重
    };
  }

  /**
   * 验证入度标准
   * 子工作流入口节点的入度必须<=1
   * @param result 验证结果
   */
  private validateEntryDegreeStandards(result: SubWorkflowValidationResult): void {
    // 检查是否有入口节点
    if (result.entryNodes.length === 0) {
      result.errors.push('工作流没有入口节点（入度为0的节点）');
      return;
    }

    // 检查入口节点数量
    if (result.entryNodes.length > 1) {
      result.warnings.push(
        `找到${result.entryNodes.length}个入口节点，建议使用单一入口节点`
      );
    }

    // 验证入口节点的入度（必须<=1）
    const invalidEntryNodes = result.entryNodes.filter((node) => node.inDegree > 1);
    if (invalidEntryNodes.length > 0) {
      result.errors.push(
        `入口节点的入度不能超过1。节点：${invalidEntryNodes.map((n) => n.nodeId).join(', ')}`
      );
    }
  }

  /**
   * 验证出度标准
   * 子工作流出口节点的出度必须<=1
   * @param result 验证结果
   */
  private validateExitDegreeStandards(result: SubWorkflowValidationResult): void {
    // 检查是否有出口节点
    if (result.exitNodes.length === 0) {
      result.errors.push('工作流没有出口节点（出度为0的节点）');
      return;
    }

    // 检查出口节点数量
    if (result.exitNodes.length > 1) {
      result.warnings.push(
        `找到${result.exitNodes.length}个出口节点，建议使用单一出口节点`
      );
    }

    // 验证出口节点的出度（必须<=1）
    const invalidExitNodes = result.exitNodes.filter((node) => node.outDegree > 1);
    if (invalidExitNodes.length > 0) {
      result.errors.push(
        `出口节点的出度不能超过1。节点：${invalidExitNodes.map((n) => n.nodeId).join(', ')}`
      );
    }
  }

  /**
   * 验证状态标准
   * @param workflow 工作流
   * @param result 验证结果
   */
  private validateStateStandards(workflow: Workflow, result: SubWorkflowValidationResult): void {
    const graph = workflow.getGraph();
    const nodes = Array.from(graph.nodes.values());

    // 检查是否有状态相关的节点类型
    const statefulNodeTypes = ['state', 'checkpoint', 'memory'];
    const statefulNodes = nodes.filter((node) => statefulNodeTypes.includes(node.type.toString()));

    if (statefulNodes.length > 0) {
      result.errors.push(
        `子工作流包含状态节点（${statefulNodes.map((n) => n.nodeId.toString()).join(', ')}），不符合无状态标准`
      );
    }

    // 检查是否有外部依赖
    // 这里可以添加更复杂的外部依赖检查逻辑
    // 例如检查节点配置中是否包含外部服务引用
    const nodesWithExternalDeps = nodes.filter((node) => {
      const config = node.properties;
      // 检查配置中是否包含外部服务引用
      return this.hasExternalDependencies(config);
    });

    if (nodesWithExternalDeps.length > 0) {
      result.warnings.push(
        `子工作流可能包含外部依赖（${nodesWithExternalDeps.map((n) => n.nodeId.toString()).join(', ')}）`
      );
    }
  }

  /**
   * 检查节点配置是否有外部依赖
   * @param config 节点配置
   * @returns 是否有外部依赖
   */
  private hasExternalDependencies(config: Record<string, any>): boolean {
    // 检查常见的外部依赖模式
    const externalPatterns = ['http://', 'https://', 'ws://', 'wss://', 'tcp://', 'udp://'];
    const configStr = JSON.stringify(config);

    return externalPatterns.some((pattern) => configStr.includes(pattern));
  }

  /**
   * 确定子工作流类型
   * @param result 验证结果
   * @returns 工作流类型
   */
  private determineWorkflowType(result: SubWorkflowValidationResult): SubWorkflowType {
    const entryMaxDegree = result.entryStandards.maxDegree;
    const exitMaxDegree = result.exitStandards.maxDegree;

    // 独立工作流：入度0，出度0
    if (entryMaxDegree === 0 && exitMaxDegree === 0) {
      return 'independent';
    }

    // 起始子工作流：入度0，出度1
    if (entryMaxDegree === 0 && exitMaxDegree === 1) {
      return 'start';
    }

    // 结束子工作流：入度1，出度0
    if (entryMaxDegree === 1 && exitMaxDegree === 0) {
      return 'end';
    }

    // 中间子工作流：入度1，出度1
    if (entryMaxDegree === 1 && exitMaxDegree === 1) {
      return 'middle';
    }

    // 其他情况（入度或出度超过1）为无效工作流
    return 'invalid';
  }

  /**
   * 检查是否可以作为子工作流
   * @param result 验证结果
   */
  private checkSubWorkflowEligibility(result: SubWorkflowValidationResult): void {
    // 独立工作流不能作为子工作流引用
    if (result.workflowType === 'independent') {
      result.isValid = false;
      result.errors.push('独立工作流（入度0，出度0）不能作为子工作流引用');
    }

    // 无效工作流不能作为子工作流引用
    if (result.workflowType === 'invalid') {
      result.isValid = false;
      result.errors.push(
        `工作流不符合子工作流标准（入口入度：${result.entryStandards.maxDegree}，出口出度：${result.exitStandards.maxDegree}）`
      );
    }

    // 如果有错误，标记为无效
    if (result.errors.length > 0) {
      result.isValid = false;
    }
  }
}
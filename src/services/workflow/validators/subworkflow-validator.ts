/**
 * 子工作流验证器
 *
 * 负责验证子工作流是否符合标准，包括：
 * - 入度/出度检查（基于图结构计算）
 * - 入口/出口节点类型检查（仅对feature子工作流）
 * - 状态检查（无状态、无外部依赖）
 *
 * 设计原则：
 * - 完全基于图结构计算，不依赖配置文件中的标准声明
 * - 静态分析，在加载时进行验证
 * - 自动确定工作流类型
 * - 使用domain层的SubWorkflowStandard值对象进行验证
 */

import { injectable, inject } from 'inversify';
import { Workflow, NodeTypeValue } from '../../../domain/workflow';
import { ILogger } from '../../../domain/common';
import { SubWorkflowStandard } from '../../../domain/workflow/value-objects/subworkflow-standard';
import { SubWorkflowType } from '../../../domain/workflow/value-objects/subworkflow-type';

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
  subWorkflowType?: SubWorkflowType;
  /** 子工作流标准 */
  standard?: SubWorkflowStandard;
  /** 入口节点信息 */
  entryNode?: NodeInfo;
  /** 出口节点信息 */
  exitNode?: NodeInfo;
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
  async validate(workflow: Workflow): Promise<SubWorkflowValidationResult> {
    this.logger.info('开始验证子工作流', {
      workflowId: workflow.workflowId.toString(),
      workflowName: workflow.name,
    });

    const result: SubWorkflowValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // 1. 确定子工作流类型
    const subWorkflowType = workflow.getSubWorkflowType();
    if (!subWorkflowType) {
      result.errors.push('工作流未指定子工作流类型');
      result.isValid = false;
      return result;
    }

    result.subWorkflowType = subWorkflowType;

    // 2. 计算所有节点的入度和出度
    const nodeDegrees = this.calculateNodeDegrees(workflow);

    // 3. 查找入口和出口节点
    const entryNodes = this.findEntryNodes(workflow, nodeDegrees);
    const exitNodes = this.findExitNodes(workflow, nodeDegrees);

    if (entryNodes.length === 0) {
      result.errors.push('工作流没有入口节点（入度为0的节点）');
      result.isValid = false;
      return result;
    }

    if (exitNodes.length === 0) {
      result.errors.push('工作流没有出口节点（出度为0的节点）');
      result.isValid = false;
      return result;
    }

    if (entryNodes.length > 1) {
      result.warnings.push(`找到${entryNodes.length}个入口节点，建议使用单一入口节点`);
    }

    if (exitNodes.length > 1) {
      result.warnings.push(`找到${exitNodes.length}个出口节点，建议使用单一出口节点`);
    }

    const entryNode = entryNodes[0];
    const exitNode = exitNodes[exitNodes.length - 1];

    result.entryNode = entryNode;
    result.exitNode = exitNode;

    // 4. 检查是否有start/end节点
    const hasStartNode = this.hasNodeType(workflow, NodeTypeValue.START);
    const hasEndNode = this.hasNodeType(workflow, NodeTypeValue.END);

    // 5. 创建子工作流标准
    const standard = this.createStandard(
      subWorkflowType,
      entryNode!.inDegree,
      entryNode!.outDegree,
      exitNode!.inDegree,
      exitNode!.outDegree
    );

    result.standard = standard;

    // 6. 验证是否符合标准
    const validationResult = standard.validate(
      entryNode!.inDegree,
      entryNode!.outDegree,
      exitNode!.inDegree,
      exitNode!.outDegree,
      hasStartNode,
      hasEndNode
    );

    if (!validationResult.valid) {
      result.errors.push(...validationResult.errors);
      result.isValid = false;
    }

    // 7. 验证入口/出口节点类型（仅对feature子工作流）
    if (subWorkflowType.isFeature()) {
      if (entryNode && !entryNode.nodeType.includes('start')) {
        result.warnings.push(
          `功能子工作流的入口节点不是start节点，当前类型: ${entryNode.nodeType}`
        );
      }
      if (exitNode && !exitNode.nodeType.includes('end')) {
        result.warnings.push(
          `功能子工作流的出口节点不是end节点，当前类型: ${exitNode.nodeType}`
        );
      }
    }

    // 8. 验证状态标准
    this.validateStateStandards(workflow, result);

    this.logger.info('子工作流验证完成', {
      workflowId: workflow.workflowId.toString(),
      isValid: result.isValid,
      subWorkflowType: subWorkflowType.toString(),
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
   * 查找入口节点（入度为0的节点）
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
   * 查找出口节点（出度为0的节点）
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
   * 检查是否有指定类型的节点
   * @param workflow 工作流
   * @param nodeType 节点类型
   * @returns 是否存在
   */
  private hasNodeType(workflow: Workflow, nodeType: string): boolean {
    const graph = workflow.getGraph();
    const nodes = Array.from(graph.nodes.values());
    return nodes.some((node) => node.type.toString() === nodeType);
  }

  /**
   * 创建子工作流标准
   * @param type 子工作流类型
   * @param entryInDegree 入口节点入度
   * @param entryOutDegree 入口节点出度
   * @param exitInDegree 出口节点入度
   * @param exitOutDegree 出口节点出度
   * @returns 子工作流标准
   */
  private createStandard(
    type: SubWorkflowType,
    entryInDegree: number,
    entryOutDegree: number,
    exitInDegree: number,
    exitOutDegree: number
  ): SubWorkflowStandard {
    if (type.isBase()) {
      // 基础子工作流：根据入度/出度确定标准
      if (entryInDegree === 0 && exitOutDegree === 1) {
        // 起始子工作流
        return SubWorkflowStandard.base(0, 0, 1, 1);
      } else if (entryInDegree === 1 && exitOutDegree === 0) {
        // 结束子工作流
        return SubWorkflowStandard.base(1, 1, 0, 0);
      } else {
        // 中间子工作流
        return SubWorkflowStandard.base(1, 1, 1, 1);
      }
    } else {
      // 功能子工作流：根据入度/出度确定标准
      if (entryInDegree === 0 && exitOutDegree === 1) {
        // 起始子工作流
        return SubWorkflowStandard.feature(0, 0, 1, 1);
      } else if (entryInDegree === 1 && exitOutDegree === 0) {
        // 结束子工作流
        return SubWorkflowStandard.feature(1, 1, 0, 0);
      } else {
        // 中间子工作流
        return SubWorkflowStandard.feature(1, 1, 1, 1);
      }
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
      result.isValid = false;
    }

    // 检查是否有外部依赖
    const nodesWithExternalDeps = nodes.filter((node) => {
      const config = node.properties;
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
}
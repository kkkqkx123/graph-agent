import { injectable, inject } from 'inversify';
import { Graph } from '../../../../../domain/workflow/graph/entities/graph';
import { ID } from '../../../../../domain/common/value-objects/id';
import { ILogger } from '@shared/types/logger';
import { PathAnalyzer } from './path-analyzer';

/**
 * 并行分析器
 * 
 * 专门负责分析图中可以并行执行的节点
 */
@injectable()
export class ParallelAnalyzer {
  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject('PathAnalyzer') private readonly pathAnalyzer: PathAnalyzer
  ) {}

  /**
   * 识别可并行执行的节点组
   * @param graph 图
   * @param nodeLevels 节点层级
   * @returns 并行节点组
   */
  identifyParallelGroups(
    graph: Graph,
    nodeLevels: Map<string, number>
  ): string[][] {
    this.logger.debug('正在识别并行节点组', {
      graphId: graph.graphId.toString()
    });

    const levelGroups = new Map<number, string[]>();
    
    // 按层级分组节点
    for (const [nodeId, level] of nodeLevels.entries()) {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(nodeId);
    }
    
    // 过滤出有多个节点的层级（可并行执行）
    const parallelGroups: string[][] = [];
    for (const [level, nodes] of levelGroups.entries()) {
      if (nodes.length > 1 && this.canExecuteInParallel(graph, nodes)) {
        parallelGroups.push(nodes);
      }
    }

    this.logger.debug('并行节点组识别完成', {
      graphId: graph.graphId.toString(),
      groupCount: parallelGroups.length
    });

    return parallelGroups;
  }

  /**
   * 检查节点是否可以并行执行
   * @param graph 图
   * @param nodeIds 节点ID列表
   * @returns 是否可以并行执行
   */
  canExecuteInParallel(graph: Graph, nodeIds: string[]): boolean {
    // 检查节点之间是否有依赖关系
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const nodeId1 = ID.fromString(nodeIds[i]);
        const nodeId2 = ID.fromString(nodeIds[j]);
        
        // 检查是否存在从一个节点到另一个节点的路径
        if (this.pathAnalyzer.hasPath(graph, nodeId1, nodeId2) || 
            this.pathAnalyzer.hasPath(graph, nodeId2, nodeId1)) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * 获取最大并行度
   * @param graph 图
   * @param nodeLevels 节点层级
   * @returns 最大并行度
   */
  getMaxParallelism(
    graph: Graph,
    nodeLevels: Map<string, number>
  ): number {
    const parallelGroups = this.identifyParallelGroups(graph, nodeLevels);
    
    if (parallelGroups.length === 0) {
      return 1;
    }
    
    // 找到最大的并行组大小
    return Math.max(...parallelGroups.map(group => group.length));
  }

  /**
   * 获取每个层级的并行度
   * @param graph 图
   * @param nodeLevels 节点层级
   * @returns 每个层级的并行度映射
   */
  getParallelismByLevel(
    graph: Graph,
    nodeLevels: Map<string, number>
  ): Map<number, number> {
    const levelGroups = new Map<number, string[]>();
    
    // 按层级分组节点
    for (const [nodeId, level] of nodeLevels.entries()) {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(nodeId);
    }
    
    // 计算每个层级的并行度
    const parallelismByLevel = new Map<number, number>();
    for (const [level, nodes] of levelGroups.entries()) {
      const parallelism = this.canExecuteInParallel(graph, nodes) ? nodes.length : 1;
      parallelismByLevel.set(level, parallelism);
    }
    
    return parallelismByLevel;
  }

  /**
   * 识别并行执行的机会
   * @param graph 图
   * @returns 并行执行机会列表
   */
  identifyParallelOpportunities(graph: Graph): Array<{
    level: number;
    nodes: string[];
    potentialSpeedup: number;
    resourceRequirements: Map<string, number>;
  }> {
    this.logger.debug('正在识别并行执行机会', {
      graphId: graph.graphId.toString()
    });

    // 首先计算节点层级
    const startNode = this.findStartNode(graph);
    if (!startNode) {
      return [];
    }

    const nodeLevels = this.calculateNodeLevels(graph, startNode);
    const parallelGroups = this.identifyParallelGroups(graph, nodeLevels);
    
    const opportunities = parallelGroups.map((nodes, index) => {
      const level = this.getLevelForNodes(nodeLevels, nodes[0]);
      const potentialSpeedup = this.calculatePotentialSpeedup(graph, nodes);
      const resourceRequirements = this.calculateResourceRequirements(graph, nodes);
      
      return {
        level,
        nodes,
        potentialSpeedup,
        resourceRequirements
      };
    });

    this.logger.debug('并行执行机会识别完成', {
      graphId: graph.graphId.toString(),
      opportunityCount: opportunities.length
    });

    return opportunities;
  }

  /**
   * 计算节点层级
   * @param graph 图
   * @param startNodeId 起始节点ID
   * @returns 节点层级映射
   */
  private calculateNodeLevels(graph: Graph, startNodeId: ID): Map<string, number> {
    const nodeLevels = new Map<string, number>();
    const visited = new Set<string>();
    const queue: Array<{ nodeId: ID; level: number }> = [
      { nodeId: startNodeId, level: 0 }
    ];

    while (queue.length > 0) {
      const { nodeId, level } = queue.shift()!;
      const nodeIdStr = nodeId.toString();

      if (visited.has(nodeIdStr)) {
        continue;
      }

      visited.add(nodeIdStr);
      nodeLevels.set(nodeIdStr, level);

      // 获取后续节点
      const outgoingEdges = graph.getOutgoingEdges(nodeId);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.toNodeId.toString())) {
          queue.push({ nodeId: edge.toNodeId, level: level + 1 });
        }
      }
    }

    return nodeLevels;
  }

  /**
   * 获取节点所在的层级
   * @param nodeLevels 节点层级映射
   * @param nodeId 节点ID
   * @returns 层级
   */
  private getLevelForNodes(nodeLevels: Map<string, number>, nodeId: string): number {
    return nodeLevels.get(nodeId) || 0;
  }

  /**
   * 计算潜在加速比
   * @param graph 图
   * @param nodeIds 节点ID列表
   * @returns 潜在加速比
   */
  private calculatePotentialSpeedup(graph: Graph, nodeIds: string[]): number {
    // 简化实现：假设完全并行，加速比等于节点数量
    // 实际应该考虑节点间的通信开销和资源竞争
    return nodeIds.length;
  }

  /**
   * 计算资源需求
   * @param graph 图
   * @param nodeIds 节点ID列表
   * @returns 资源需求映射
   */
  private calculateResourceRequirements(
    graph: Graph,
    nodeIds: string[]
  ): Map<string, number> {
    const resourceRequirements = new Map<string, number>();
    
    // 简化实现：根据节点类型计算资源需求
    for (const nodeId of nodeIds) {
      const node = graph.getNode(ID.fromString(nodeId));
      if (node) {
        const nodeType = node.type.toString();
        const resourceCost = this.getResourceCostByNodeType(nodeType);
        
        resourceRequirements.set(
          nodeType,
          (resourceRequirements.get(nodeType) || 0) + resourceCost
        );
      }
    }
    
    return resourceRequirements;
  }

  /**
   * 根据节点类型获取资源成本
   * @param nodeType 节点类型
   * @returns 资源成本
   */
  private getResourceCostByNodeType(nodeType: string): number {
    const resourceCosts: Record<string, number> = {
      'llm': 10,
      'tool': 5,
      'condition': 1,
      'wait': 1,
      'data': 2
    };
    
    return resourceCosts[nodeType] || 1;
  }

  /**
   * 找到起始节点
   * @param graph 图
   * @returns 起始节点ID
   */
  private findStartNode(graph: Graph): ID | null {
    // 找到没有入边的节点作为起始节点
    for (const node of graph.nodes.values()) {
      const incomingEdges = graph.getIncomingEdges(node.nodeId);
      if (incomingEdges.length === 0) {
        return node.nodeId;
      }
    }
    
    // 如果没有找到，返回第一个节点
    if (graph.nodes.size > 0) {
      return graph.nodes.values().next().value.nodeId;
    }
    
    return null;
  }

  /**
   * 优化并行执行计划
   * @param graph 图
   * @param maxParallelNodes 最大并行节点数
   * @returns 优化后的并行组
   */
  optimizeParallelExecution(
    graph: Graph,
    maxParallelNodes: number = 4
  ): string[][] {
    this.logger.debug('正在优化并行执行计划', {
      graphId: graph.graphId.toString(),
      maxParallelNodes
    });

    const startNode = this.findStartNode(graph);
    if (!startNode) {
      return [];
    }

    const nodeLevels = this.calculateNodeLevels(graph, startNode);
    const parallelGroups = this.identifyParallelGroups(graph, nodeLevels);
    
    // 如果并行组大小超过限制，进行拆分
    const optimizedGroups: string[][] = [];
    
    for (const group of parallelGroups) {
      if (group.length <= maxParallelNodes) {
        optimizedGroups.push(group);
      } else {
        // 拆分大组为多个小组
        const subGroups = this.splitParallelGroup(group, maxParallelNodes);
        optimizedGroups.push(...subGroups);
      }
    }

    this.logger.debug('并行执行计划优化完成', {
      graphId: graph.graphId.toString(),
      originalGroupCount: parallelGroups.length,
      optimizedGroupCount: optimizedGroups.length
    });

    return optimizedGroups;
  }

  /**
   * 拆分并行组
   * @param group 原始并行组
   * @param maxSize 最大组大小
   * @returns 拆分后的组列表
   */
  private splitParallelGroup(group: string[], maxSize: number): string[][] {
    const subGroups: string[][] = [];
    
    for (let i = 0; i < group.length; i += maxSize) {
      subGroups.push(group.slice(i, i + maxSize));
    }
    
    return subGroups;
  }
}
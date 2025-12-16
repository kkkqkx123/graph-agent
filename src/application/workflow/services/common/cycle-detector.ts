import { injectable, inject } from 'inversify';
import { Graph } from '@domain/workflow/entities/graph';
import { ID } from '@domain/common/value-objects/id';
import { ILogger } from '@shared/types/logger';

/**
 * 循环检测器
 * 
 * 专门负责检测图中的循环和强连通分量
 */
@injectable()
export class CycleDetector {
  constructor(@inject('Logger') private readonly logger: ILogger) {}

  /**
   * 检测循环数量
   * @param graph 图
   * @returns 循环数量
   */
  detectCycles(graph: Graph): number {
    this.logger.debug('正在检测循环', {
      graphId: graph.graphId.toString(),
      nodeCount: graph.getNodeCount()
    });

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    let cycleCount = 0;
    
    const dfs = (nodeId: ID): boolean => {
      const nodeIdStr = nodeId.toString();
      
      if (recursionStack.has(nodeIdStr)) {
        cycleCount++;
        return true;
      }
      
      if (visited.has(nodeIdStr)) {
        return false;
      }
      
      visited.add(nodeIdStr);
      recursionStack.add(nodeIdStr);
      
      const outgoingEdges = graph.getOutgoingEdges(nodeId);
      for (const edge of outgoingEdges) {
        if (dfs(edge.toNodeId)) {
          return true;
        }
      }
      
      recursionStack.delete(nodeIdStr);
      return false;
    };
    
    for (const node of graph.nodes.values()) {
      if (!visited.has(node.nodeId.toString())) {
        dfs(node.nodeId);
      }
    }

    this.logger.debug('循环检测完成', {
      graphId: graph.graphId.toString(),
      cycleCount
    });

    return cycleCount;
  }

  /**
   * 检查图中是否存在循环
   * @param graph 图
   * @returns 是否存在循环
   */
  hasCycle(graph: Graph): boolean {
    return this.detectCycles(graph) > 0;
  }

  /**
   * 找到所有循环
   * @param graph 图
   * @returns 所有循环的列表
   */
  findAllCycles(graph: Graph): string[][] {
    this.logger.debug('正在查找所有循环', {
      graphId: graph.graphId.toString()
    });

    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];
    
    const dfs = (nodeId: ID): boolean => {
      const nodeIdStr = nodeId.toString();
      
      if (recursionStack.has(nodeIdStr)) {
        // 找到循环，提取循环路径
        const cycleStartIndex = path.indexOf(nodeIdStr);
        if (cycleStartIndex !== -1) {
          const cycle = path.slice(cycleStartIndex);
          cycles.push([...cycle, nodeIdStr]);
        }
        return true;
      }
      
      if (visited.has(nodeIdStr)) {
        return false;
      }
      
      visited.add(nodeIdStr);
      recursionStack.add(nodeIdStr);
      path.push(nodeIdStr);
      
      const outgoingEdges = graph.getOutgoingEdges(nodeId);
      for (const edge of outgoingEdges) {
        dfs(edge.toNodeId);
      }
      
      recursionStack.delete(nodeIdStr);
      path.pop();
      return false;
    };
    
    for (const node of graph.nodes.values()) {
      if (!visited.has(node.nodeId.toString())) {
        dfs(node.nodeId);
      }
    }

    this.logger.debug('所有循环查找完成', {
      graphId: graph.graphId.toString(),
      cycleCount: cycles.length
    });

    return cycles;
  }

  /**
   * 找到强连通分量
   * @param graph 图
   * @returns 强连通分量列表
   */
  findStronglyConnectedComponents(graph: Graph): string[][] {
    this.logger.debug('正在查找强连通分量', {
      graphId: graph.graphId.toString()
    });

    // 使用Kosaraju算法找强连通分量
    const visited = new Set<string>();
    const order: string[] = [];
    
    // 第一次DFS，记录节点完成顺序
    const dfs1 = (nodeId: ID) => {
      const nodeIdStr = nodeId.toString();
      
      if (visited.has(nodeIdStr)) {
        return;
      }
      
      visited.add(nodeIdStr);
      
      const outgoingEdges = graph.getOutgoingEdges(nodeId);
      for (const edge of outgoingEdges) {
        dfs1(edge.toNodeId);
      }
      
      order.push(nodeIdStr);
    };
    
    for (const node of graph.nodes.values()) {
      if (!visited.has(node.nodeId.toString())) {
        dfs1(node.nodeId);
      }
    }
    
    // 构建反向图
    const reverseGraph = this.buildReverseGraph(graph);
    
    // 第二次DFS，按逆序访问节点，找到强连通分量
    visited.clear();
    const components: string[][] = [];
    
    const dfs2 = (nodeId: ID, component: string[]) => {
      const nodeIdStr = nodeId.toString();
      
      if (visited.has(nodeIdStr)) {
        return;
      }
      
      visited.add(nodeIdStr);
      component.push(nodeIdStr);
      
      const incomingEdges = reverseGraph.get(nodeIdStr) || [];
      for (const incomingNodeId of incomingEdges) {
        dfs2(ID.fromString(incomingNodeId), component);
      }
    };
    
    for (let i = order.length - 1; i >= 0; i--) {
      const nodeIdStr = order[i];
      if (nodeIdStr && !visited.has(nodeIdStr)) {
        const component: string[] = [];
        dfs2(ID.fromString(nodeIdStr), component);
        components.push(component);
      }
    }

    this.logger.debug('强连通分量查找完成', {
      graphId: graph.graphId.toString(),
      componentCount: components.length
    });

    return components;
  }

  /**
   * 构建反向图
   * @param graph 原图
   * @returns 反向图的邻接表
   */
  private buildReverseGraph(graph: Graph): Map<string, string[]> {
    const reverseGraph = new Map<string, string[]>();
    
    // 初始化所有节点的邻接表
    for (const node of graph.nodes.values()) {
      reverseGraph.set(node.nodeId.toString(), []);
    }
    
    // 添加反向边
    for (const edge of graph.edges.values()) {
      const fromNodeIdStr = edge.fromNodeId.toString();
      const toNodeIdStr = edge.toNodeId.toString();
      
      if (!reverseGraph.has(toNodeIdStr)) {
        reverseGraph.set(toNodeIdStr, []);
      }
      
      reverseGraph.get(toNodeIdStr)!.push(fromNodeIdStr);
    }
    
    return reverseGraph;
  }

  /**
   * 检查特定节点是否在循环中
   * @param graph 图
   * @param nodeId 节点ID
   * @returns 是否在循环中
   */
  isNodeInCycle(graph: Graph, nodeId: ID): boolean {
    const nodeIdStr = nodeId.toString();
    const cycles = this.findAllCycles(graph);
    
    for (const cycle of cycles) {
      if (cycle.includes(nodeIdStr)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 获取包含特定节点的循环
   * @param graph 图
   * @param nodeId 节点ID
   * @returns 包含该节点的循环列表
   */
  getCyclesContainingNode(graph: Graph, nodeId: ID): string[][] {
    const nodeIdStr = nodeId.toString();
    const cycles = this.findAllCycles(graph);
    
    return cycles.filter(cycle => cycle.includes(nodeIdStr));
  }
}
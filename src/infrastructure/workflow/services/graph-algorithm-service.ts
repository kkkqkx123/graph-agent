import { injectable } from 'inversify';
import { GraphAlgorithmService, GraphComplexity } from '../interfaces/graph-algorithm-service.interface';
import { Workflow } from '../../../domain/workflow/entities/workflow';
import { NodeValueObject } from '../../../domain/workflow/value-objects/node-value-object';
import { EdgeValueObject } from '../../../domain/workflow/value-objects/edge-value-object';
import { ID } from '../../../domain/common/value-objects/id';
import { NodeId } from '../../../domain/workflow/value-objects/node-id';

/**
 * 图算法服务实现
 * 
 * 基础设施层实现，提供具体的图算法功能：
 * 1. 拓扑排序
 * 2. 循环检测
 * 3. 连通分量分析
 * 4. 路径查找
 * 5. 图复杂度分析
 * 
 * 此实现可以替换为其他算法实现（如性能优化版本、并行版本等）。
 */
@injectable()
export class GraphAlgorithmServiceImpl implements GraphAlgorithmService {
  /**
   * 获取图的拓扑排序
   * @param workflow 工作流
   * @returns 拓扑排序的节点列表
   */
  getTopologicalOrder(workflow: Workflow): NodeValueObject[] {
    const visited = new Set<string>();
    const result: NodeValueObject[] = [];
    const graph = workflow.getGraph();

    const visit = (nodeId: ID) => {
      const nodeIdStr = nodeId.toString();
      if (visited.has(nodeIdStr)) return;
      visited.add(nodeIdStr);

      // 先访问所有依赖节点
      const incomingEdges = graph.getIncomingEdges(NodeId.fromString(nodeId.value));
      for (const edge of incomingEdges) {
        visit(edge.fromNodeId);
      }

      // 然后访问当前节点
      const node = graph.nodes.get(nodeIdStr);
      if (node) {
        result.push(node);
      }
    };

    // 从所有节点开始
    for (const node of graph.nodes.values()) {
      visit(node.id);
    }

    return result;
  }

  /**
   * 检查图是否包含循环
   * @param workflow 工作流
   * @returns 是否包含循环
   */
  hasCycle(workflow: Workflow): boolean {
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const graph = workflow.getGraph();

    const visit = (nodeId: ID): boolean => {
      const nodeIdStr = nodeId.toString();
      
      if (visiting.has(nodeIdStr)) {
        return true; // 发现循环
      }
      
      if (visited.has(nodeIdStr)) {
        return false; // 已访问过，无循环
      }

      visiting.add(nodeIdStr);

      // 访问所有相邻节点
      const outgoingEdges = graph.getOutgoingEdges(NodeId.fromString(nodeId.value));
      for (const edge of outgoingEdges) {
        if (visit(edge.toNodeId)) {
          return true;
        }
      }

      visiting.delete(nodeIdStr);
      visited.add(nodeIdStr);
      
      return false;
    };

    // 从所有节点开始检查
    for (const node of graph.nodes.values()) {
      if (visit(node.id)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取图的连通分量
   * @param workflow 工作流
   * @returns 连通分量列表
   */
  getConnectedComponents(workflow: Workflow): NodeValueObject[][] {
    const visited = new Set<string>();
    const components: NodeValueObject[][] = [];
    const graph = workflow.getGraph();

    const dfs = (nodeId: ID, component: NodeValueObject[]): void => {
      const nodeIdStr = nodeId.toString();
      if (visited.has(nodeIdStr)) return;
      
      visited.add(nodeIdStr);
      const node = graph.nodes.get(nodeIdStr);
      if (node) {
        component.push(node);
      }

      // 访问所有相邻节点
      const outgoingEdges = graph.getOutgoingEdges(NodeId.fromString(nodeId.value));
      for (const edge of outgoingEdges) {
        dfs(edge.toNodeId, component);
      }

      const incomingEdges = graph.getIncomingEdges(NodeId.fromString(nodeId.value));
      for (const edge of incomingEdges) {
        dfs(edge.fromNodeId, component);
      }
    };

    // 从所有未访问的节点开始DFS
    for (const node of graph.nodes.values()) {
      if (!visited.has(node.id.toString())) {
        const component: NodeValueObject[] = [];
        dfs(node.id, component);
        components.push(component);
      }
    }

    return components;
  }

  /**
   * 查找两个节点之间的路径
   * @param workflow 工作流
   * @param startNodeId 起始节点ID
   * @param endNodeId 结束节点ID
   * @returns 路径节点列表，如果不存在路径则返回空数组
   */
  findPath(workflow: Workflow, startNodeId: ID, endNodeId: ID): NodeValueObject[] {
    const visited = new Set<string>();
    const path: NodeValueObject[] = [];
    const graph = workflow.getGraph();

    const dfs = (nodeId: ID): boolean => {
      const nodeIdStr = nodeId.toString();
      
      if (visited.has(nodeIdStr)) return false;
      visited.add(nodeIdStr);

      const node = graph.nodes.get(nodeIdStr);
      if (!node) return false;

      path.push(node);

      if (nodeId.equals(endNodeId)) {
        return true;
      }

      // 访问所有相邻节点
      const outgoingEdges = graph.getOutgoingEdges(NodeId.fromString(nodeId.value));
      for (const edge of outgoingEdges) {
        if (dfs(edge.toNodeId)) {
          return true;
        }
      }

      path.pop();
      return false;
    };

    if (dfs(startNodeId)) {
      return path;
    }

    return [];
  }

  /**
   * 查找两个节点之间的所有路径
   * @param workflow 工作流
   * @param startNodeId 起始节点ID
   * @param endNodeId 结束节点ID
   * @returns 所有路径的列表
   */
  findAllPaths(workflow: Workflow, startNodeId: ID, endNodeId: ID): NodeValueObject[][] {
    const allPaths: NodeValueObject[][] = [];
    const currentPath: NodeValueObject[] = [];
    const visited = new Set<string>();
    const graph = workflow.getGraph();

    const dfs = (nodeId: ID): void => {
      const nodeIdStr = nodeId.toString();
      
      if (visited.has(nodeIdStr)) return;
      visited.add(nodeIdStr);

      const node = graph.nodes.get(nodeIdStr);
      if (!node) return;

      currentPath.push(node);

      if (nodeId.equals(endNodeId)) {
        allPaths.push([...currentPath]);
      } else {
        // 访问所有相邻节点
        const outgoingEdges = graph.getOutgoingEdges(NodeId.fromString(nodeId.value));
        for (const edge of outgoingEdges) {
          dfs(edge.toNodeId);
        }
      }

      currentPath.pop();
      visited.delete(nodeIdStr);
    };

    dfs(startNodeId);
    return allPaths;
  }

  /**
   * 计算图的复杂度
   * @param workflow 工作流
   * @returns 图复杂度指标
   */
  calculateComplexity(workflow: Workflow): GraphComplexity {
    const graph = workflow.getGraph();
    const nodeCount = graph.nodes.size;
    const edgeCount = graph.edges.size;
    
    // 检测循环
    const cycleCount = this.hasCycle(workflow) ? 1 : 0;
    
    // 计算连通分量
    const componentCount = this.getConnectedComponents(workflow).length;
    
    // 计算最大路径长度（简化版）
    let maxPathLength = 0;
    for (const startNode of graph.nodes.values()) {
      for (const endNode of graph.nodes.values()) {
        if (!startNode.id.equals(endNode.id)) {
          const path = this.findPath(workflow, startNode.id, endNode.id);
          maxPathLength = Math.max(maxPathLength, path.length);
        }
      }
    }

    return {
      nodeCount,
      edgeCount,
      maxPathLength,
      cycleCount,
      componentCount
    };
  }
}
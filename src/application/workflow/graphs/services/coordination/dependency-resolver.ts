import { injectable, inject } from 'inversify';
import { Graph } from '../../../../../domain/workflow/graph/entities/graph';
import { Node } from '../../../../../domain/workflow/graph/entities/nodes';
import { Edge } from '../../../../../domain/workflow/graph/entities/edges';
import { ID } from '../../../../../domain/common/value-objects/id';
import { IEdgeEvaluator } from '../../../../../domain/workflow/graph/interfaces/edge-evaluator.interface';
import { DomainError } from '../../../../../domain/common/errors/domain-error';
import { ILogger } from '@shared/types/logger';

/**
 * 依赖关系
 */
interface Dependency {
  fromNodeId: string;
  toNodeId: string;
  edgeType: string;
  condition?: any;
  weight?: number;
}

/**
 * 依赖解析器
 * 
 * 负责解析和管理节点间的依赖关系
 */
@injectable()
export class DependencyResolver {
  private graph: Graph | null = null;
  private dependencies: Map<string, Dependency[]> = new Map();
  private reverseDependencies: Map<string, Dependency[]> = new Map();

  constructor(
    @inject('EdgeEvaluatorFactory') private readonly edgeEvaluatorFactory: (edgeType: string) => IEdgeEvaluator,
    @inject('Logger') private readonly logger: ILogger
  ) {}

  /**
   * 初始化依赖解析器
   * @param graph 图
   */
  async initialize(graph: Graph): Promise<void> {
    this.logger.debug('正在初始化依赖解析器', {
      graphId: graph.graphId.toString(),
      nodeCount: graph.getNodeCount(),
      edgeCount: graph.getEdgeCount()
    });

    this.graph = graph;
    this.dependencies.clear();
    this.reverseDependencies.clear();
    
    // 构建依赖关系映射
    await this.buildDependencyMappings();
    
    this.logger.debug('依赖解析器初始化完成', {
      graphId: graph.graphId.toString(),
      dependencyCount: this.getTotalDependencyCount()
    });
  }

  /**
   * 构建依赖关系映射
   */
  private async buildDependencyMappings(): Promise<void> {
    if (!this.graph) {
      return;
    }

    // 为每个节点初始化依赖数组
    for (const node of this.graph.nodes.values()) {
      const nodeIdStr = node.nodeId.toString();
      this.dependencies.set(nodeIdStr, []);
      this.reverseDependencies.set(nodeIdStr, []);
    }

    // 构建依赖关系
    for (const edge of this.graph.edges.values()) {
      const fromNodeIdStr = edge.fromNodeId.toString();
      const toNodeIdStr = edge.toNodeId.toString();
      
      const dependency: Dependency = {
        fromNodeId: fromNodeIdStr,
        toNodeId: toNodeIdStr,
        edgeType: edge.type.toString(),
        condition: edge.condition,
        weight: edge.weight
      };

      // 添加正向依赖
      const forwardDeps = this.dependencies.get(fromNodeIdStr) || [];
      forwardDeps.push(dependency);
      this.dependencies.set(fromNodeIdStr, forwardDeps);

      // 添加反向依赖
      const reverseDeps = this.reverseDependencies.get(toNodeIdStr) || [];
      reverseDeps.push(dependency);
      this.reverseDependencies.set(toNodeIdStr, reverseDeps);
    }
  }

  /**
   * 获取节点的直接依赖（该节点依赖的其他节点）
   * @param nodeId 节点ID
   * @returns 直接依赖列表
   */
  getDirectDependencies(nodeId: ID): Dependency[] {
    const nodeIdStr = nodeId.toString();
    return this.dependencies.get(nodeIdStr) || [];
  }

  /**
   * 获取节点的反向依赖（依赖该节点的其他节点）
   * @param nodeId 节点ID
   * @returns 反向依赖列表
   */
  getReverseDependencies(nodeId: ID): Dependency[] {
    const nodeIdStr = nodeId.toString();
    return this.reverseDependencies.get(nodeIdStr) || [];
  }

  /**
   * 获取节点的所有依赖（包括传递依赖）
   * @param nodeId 节点ID
   * @returns 所有依赖列表
   */
  getAllDependencies(nodeId: ID): Dependency[] {
    const nodeIdStr = nodeId.toString();
    const allDeps: Dependency[] = [];
    const visited = new Set<string>();
    
    const collectDependencies = (currentNodeId: string) => {
      if (visited.has(currentNodeId)) {
        return;
      }
      
      visited.add(currentNodeId);
      const directDeps = this.dependencies.get(currentNodeId) || [];
      
      for (const dep of directDeps) {
        allDeps.push(dep);
        collectDependencies(dep.fromNodeId);
      }
    };
    
    collectDependencies(nodeIdStr);
    return allDeps;
  }

  /**
   * 获取节点的所有反向依赖（包括传递依赖）
   * @param nodeId 节点ID
   * @returns 所有反向依赖列表
   */
  getAllReverseDependencies(nodeId: ID): Dependency[] {
    const nodeIdStr = nodeId.toString();
    const allReverseDeps: Dependency[] = [];
    const visited = new Set<string>();
    
    const collectReverseDependencies = (currentNodeId: string) => {
      if (visited.has(currentNodeId)) {
        return;
      }
      
      visited.add(currentNodeId);
      const reverseDeps = this.reverseDependencies.get(currentNodeId) || [];
      
      for (const dep of reverseDeps) {
        allReverseDeps.push(dep);
        collectReverseDependencies(dep.toNodeId);
      }
    };
    
    collectReverseDependencies(nodeIdStr);
    return allReverseDeps;
  }

  /**
   * 检查节点是否依赖另一个节点
   * @param fromNodeId 起始节点ID
   * @param toNodeId 目标节点ID
   * @returns 是否存在依赖关系
   */
  hasDependency(fromNodeId: ID, toNodeId: ID): boolean {
    const fromNodeIdStr = fromNodeId.toString();
    const toNodeIdStr = toNodeId.toString();
    
    const directDeps = this.dependencies.get(fromNodeIdStr) || [];
    return directDeps.some(dep => dep.toNodeId === toNodeIdStr);
  }

  /**
   * 检查节点是否存在传递依赖
   * @param fromNodeId 起始节点ID
   * @param toNodeId 目标节点ID
   * @returns 是否存在传递依赖关系
   */
  hasTransitiveDependency(fromNodeId: ID, toNodeId: ID): boolean {
    const allDeps = this.getAllDependencies(fromNodeId);
    const toNodeIdStr = toNodeId.toString();
    
    return allDeps.some(dep => dep.toNodeId === toNodeIdStr);
  }

  /**
   * 检查是否存在循环依赖
   * @param nodeId 节点ID
   * @returns 是否存在循环依赖
   */
  hasCyclicDependency(nodeId: ID): boolean {
    const nodeIdStr = nodeId.toString();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (currentNodeId: string): boolean => {
      if (recursionStack.has(currentNodeId)) {
        return true;
      }
      
      if (visited.has(currentNodeId)) {
        return false;
      }
      
      visited.add(currentNodeId);
      recursionStack.add(currentNodeId);
      
      const directDeps = this.dependencies.get(currentNodeId) || [];
      for (const dep of directDeps) {
        if (hasCycle(dep.fromNodeId)) {
          return true;
        }
      }
      
      recursionStack.delete(currentNodeId);
      return false;
    };
    
    return hasCycle(nodeIdStr);
  }

  /**
   * 检查图中是否存在任何循环依赖
   * @returns 是否存在循环依赖
   */
  hasAnyCyclicDependency(): boolean {
    if (!this.graph) {
      return false;
    }

    for (const node of this.graph.nodes.values()) {
      if (this.hasCyclicDependency(node.nodeId)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 获取循环依赖
   * @param nodeId 节点ID
   * @returns 循环依赖路径
   */
  getCyclicDependency(nodeId: ID): string[] | null {
    const nodeIdStr = nodeId.toString();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];
    
    const findCycle = (currentNodeId: string): string[] | null => {
      if (recursionStack.has(currentNodeId)) {
        // 找到循环，提取循环路径
        const cycleStartIndex = path.indexOf(currentNodeId);
        if (cycleStartIndex !== -1) {
          return [...path.slice(cycleStartIndex), currentNodeId];
        }
        return null;
      }
      
      if (visited.has(currentNodeId)) {
        return null;
      }
      
      visited.add(currentNodeId);
      recursionStack.add(currentNodeId);
      path.push(currentNodeId);
      
      const directDeps = this.dependencies.get(currentNodeId) || [];
      for (const dep of directDeps) {
        const cycle = findCycle(dep.fromNodeId);
        if (cycle) {
          return cycle;
        }
      }
      
      recursionStack.delete(currentNodeId);
      path.pop();
      return null;
    };
    
    return findCycle(nodeIdStr);
  }

  /**
   * 获取所有循环依赖
   * @returns 所有循环依赖列表
   */
  getAllCyclicDependencies(): string[][] {
    if (!this.graph) {
      return [];
    }

    const cycles: string[][] = [];
    const processedNodes = new Set<string>();
    
    for (const node of this.graph.nodes.values()) {
      const nodeIdStr = node.nodeId.toString();
      
      if (!processedNodes.has(nodeIdStr)) {
        const cycle = this.getCyclicDependency(node.nodeId);
        if (cycle) {
          cycles.push(cycle);
          // 标记循环中的所有节点为已处理
          for (const cycleNodeId of cycle) {
            processedNodes.add(cycleNodeId);
          }
        }
      }
    }
    
    return cycles;
  }

  /**
   * 评估边的条件
   * @param fromNodeId 起始节点ID
   * @param toNodeId 目标节点ID
   * @param context 评估上下文
   * @returns 是否满足条件
   */
  async evaluateEdgeCondition(
    fromNodeId: ID,
    toNodeId: ID,
    context: any
  ): Promise<boolean> {
    const fromNodeIdStr = fromNodeId.toString();
    const toNodeIdStr = toNodeId.toString();
    
    const directDeps = this.dependencies.get(fromNodeIdStr) || [];
    const dependency = directDeps.find(dep => dep.toNodeId === toNodeIdStr);
    
    if (!dependency) {
      return false;
    }
    
    try {
      const edgeEvaluator = this.edgeEvaluatorFactory(dependency.edgeType);
      
      // 创建边对象用于评估
      const edge = {
        fromNodeId,
        toNodeId,
        type: dependency.edgeType,
        condition: dependency.condition,
        weight: dependency.weight
      } as Edge;
      
      return await edgeEvaluator.evaluate(edge, context);
    } catch (error) {
      this.logger.error('评估边条件失败', {
        fromNodeId: fromNodeIdStr,
        toNodeId: toNodeIdStr,
        error: (error as Error).message
      });
      
      return false;
    }
  }

  /**
   * 获取节点的拓扑层级
   * @param nodeId 节点ID
   * @returns 拓扑层级
   */
  getTopologicalLevel(nodeId: ID): number {
    const nodeIdStr = nodeId.toString();
    const visited = new Set<string>();
    
    const calculateLevel = (currentNodeId: string): number => {
      if (visited.has(currentNodeId)) {
        return 0;
      }
      
      visited.add(currentNodeId);
      
      const reverseDeps = this.reverseDependencies.get(currentNodeId) || [];
      if (reverseDeps.length === 0) {
        return 0;
      }
      
      let maxLevel = 0;
      for (const dep of reverseDeps) {
        const level = calculateLevel(dep.fromNodeId);
        maxLevel = Math.max(maxLevel, level);
      }
      
      return maxLevel + 1;
    };
    
    return calculateLevel(nodeIdStr);
  }

  /**
   * 获取拓扑排序
   * @returns 拓扑排序结果
   */
  getTopologicalOrder(): string[] {
    if (!this.graph) {
      return [];
    }

    const inDegree = new Map<string, number>();
    const result: string[] = [];
    const queue: string[] = [];
    
    // 计算每个节点的入度
    for (const node of this.graph.nodes.values()) {
      const nodeIdStr = node.nodeId.toString();
      inDegree.set(nodeIdStr, 0);
    }
    
    for (const deps of this.dependencies.values()) {
      for (const dep of deps) {
        inDegree.set(dep.toNodeId, (inDegree.get(dep.toNodeId) || 0) + 1);
      }
    }
    
    // 找到入度为0的节点
    for (const [nodeIdStr, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeIdStr);
      }
    }
    
    // 拓扑排序
    while (queue.length > 0) {
      const nodeIdStr = queue.shift()!;
      result.push(nodeIdStr);
      
      const directDeps = this.dependencies.get(nodeIdStr) || [];
      for (const dep of directDeps) {
        const newInDegree = (inDegree.get(dep.toNodeId) || 0) - 1;
        inDegree.set(dep.toNodeId, newInDegree);
        
        if (newInDegree === 0) {
          queue.push(dep.toNodeId);
        }
      }
    }
    
    // 检查是否有环
    if (result.length !== this.graph.nodes.size) {
      throw new DomainError('图中存在循环依赖，无法进行拓扑排序');
    }
    
    return result;
  }

  /**
   * 获取依赖统计信息
   * @returns 依赖统计信息
   */
  getDependencyStatistics(): {
    totalDependencies: number;
    averageDependenciesPerNode: number;
    maxDependencies: number;
    minDependencies: number;
    nodesWithNoDependencies: number;
    cyclicDependencies: number;
  } {
    if (!this.graph) {
      return {
        totalDependencies: 0,
        averageDependenciesPerNode: 0,
        maxDependencies: 0,
        minDependencies: 0,
        nodesWithNoDependencies: 0,
        cyclicDependencies: 0
      };
    }

    let totalDependencies = 0;
    let maxDependencies = 0;
    let minDependencies = Number.MAX_SAFE_INTEGER;
    let nodesWithNoDependencies = 0;
    
    for (const node of this.graph.nodes.values()) {
      const nodeIdStr = node.nodeId.toString();
      const directDeps = this.dependencies.get(nodeIdStr) || [];
      const depCount = directDeps.length;
      
      totalDependencies += depCount;
      maxDependencies = Math.max(maxDependencies, depCount);
      minDependencies = Math.min(minDependencies, depCount);
      
      if (depCount === 0) {
        nodesWithNoDependencies++;
      }
    }
    
    const averageDependencies = this.graph.nodes.size > 0 
      ? totalDependencies / this.graph.nodes.size 
      : 0;
    
    const cyclicDependencies = this.getAllCyclicDependencies().length;
    
    return {
      totalDependencies,
      averageDependenciesPerNode: averageDependencies,
      maxDependencies,
      minDependencies: minDependencies === Number.MAX_SAFE_INTEGER ? 0 : minDependencies,
      nodesWithNoDependencies,
      cyclicDependencies
    };
  }

  /**
   * 获取总依赖数量
   * @returns 总依赖数量
   */
  private getTotalDependencyCount(): number {
    let count = 0;
    
    for (const deps of this.dependencies.values()) {
      count += deps.length;
    }
    
    return count;
  }

  /**
   * 添加依赖关系
   * @param fromNodeId 起始节点ID
   * @param toNodeId 目标节点ID
   * @param edgeType 边类型
   * @param condition 条件
   * @param weight 权重
   */
  addDependency(
    fromNodeId: ID,
    toNodeId: ID,
    edgeType: string,
    condition?: any,
    weight?: number
  ): void {
    const fromNodeIdStr = fromNodeId.toString();
    const toNodeIdStr = toNodeId.toString();
    
    const dependency: Dependency = {
      fromNodeId: fromNodeIdStr,
      toNodeId: toNodeIdStr,
      edgeType,
      condition,
      weight
    };

    // 添加正向依赖
    const forwardDeps = this.dependencies.get(fromNodeIdStr) || [];
    forwardDeps.push(dependency);
    this.dependencies.set(fromNodeIdStr, forwardDeps);

    // 添加反向依赖
    const reverseDeps = this.reverseDependencies.get(toNodeIdStr) || [];
    reverseDeps.push(dependency);
    this.reverseDependencies.set(toNodeIdStr, reverseDeps);
  }

  /**
   * 移除依赖关系
   * @param fromNodeId 起始节点ID
   * @param toNodeId 目标节点ID
   */
  removeDependency(fromNodeId: ID, toNodeId: ID): void {
    const fromNodeIdStr = fromNodeId.toString();
    const toNodeIdStr = toNodeId.toString();
    
    // 从正向依赖中移除
    const forwardDeps = this.dependencies.get(fromNodeIdStr) || [];
    const filteredForwardDeps = forwardDeps.filter(dep => dep.toNodeId !== toNodeIdStr);
    this.dependencies.set(fromNodeIdStr, filteredForwardDeps);

    // 从反向依赖中移除
    const reverseDeps = this.reverseDependencies.get(toNodeIdStr) || [];
    const filteredReverseDeps = reverseDeps.filter(dep => dep.fromNodeId !== fromNodeIdStr);
    this.reverseDependencies.set(toNodeIdStr, filteredReverseDeps);
  }
}
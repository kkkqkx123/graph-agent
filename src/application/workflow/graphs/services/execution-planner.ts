import { injectable, inject } from 'inversify';
import { Graph } from '../../../../domain/workflow/graph/entities/graph';
import { Node } from '../../../../domain/workflow/graph/entities/nodes';
import { Edge } from '../../../../domain/workflow/graph/entities/edges';
import { GraphRepository } from '../../../../domain/workflow/graph/repositories/graph-repository';
import { GraphDomainService } from '../../../../domain/workflow/graph/services/graph-domain-service';
import { ID } from '../../../../domain/common/value-objects/id';
import { NodeType } from '../../../../domain/workflow/graph/value-objects/node-type';
import { EdgeType } from '../../../../domain/workflow/graph/value-objects/edge-type';
import { ExecutionMode } from '../../../../domain/workflow/graph/value-objects/execution-mode';
import { DomainError } from '../../../../domain/common/errors/domain-error';
import { ILogger } from '@shared/types/logger';

// DTOs
import {
  ExecutionPlanDto,
  ExecutionStepDto,
  ExecutionDependencyDto,
  GraphDto
} from '../dtos/graph.dto';

/**
 * 执行计划器
 * 
 * 负责分析图结构并生成最优的执行计划
 */
@injectable()
export class ExecutionPlanner {
  constructor(
    @inject('GraphRepository') private readonly graphRepository: GraphRepository,
    @inject('GraphDomainService') private readonly graphDomainService: GraphDomainService,
    @inject('Logger') private readonly logger: ILogger
  ) {}

  /**
   * 创建执行计划
   * @param graphId 图ID
   * @param options 执行选项
   * @returns 执行计划DTO
   */
  async createExecutionPlan(
    graphId: string,
    options: {
      executionMode?: 'sequential' | 'parallel' | 'conditional';
      startNodeId?: string;
      optimizationStrategy?: 'speed' | 'resource' | 'reliability';
      constraints?: {
        maxParallelNodes?: number;
        timeout?: number;
        resourceLimits?: Record<string, number>;
      };
    } = {}
  ): Promise<ExecutionPlanDto> {
    try {
      this.logger.info('正在创建执行计划', {
        graphId,
        executionMode: options.executionMode,
        optimizationStrategy: options.optimizationStrategy
      });

      const graphIdObj = ID.fromString(graphId);
      const graph = await this.graphRepository.findByIdOrFail(graphIdObj);

      // 验证图结构
      const validationResult = await this.graphDomainService.validateGraphStructure(graphIdObj);
      if (!validationResult.isValid) {
        throw new DomainError(`图结构验证失败: ${validationResult.errors.join(', ')}`);
      }

      // 确定起始节点
      const startNodeId = options.startNodeId 
        ? ID.fromString(options.startNodeId)
        : this.findStartNode(graph);

      if (!startNodeId) {
        throw new DomainError('无法确定起始节点');
      }

      // 分析图结构
      const graphAnalysis = this.analyzeGraphStructure(graph, startNodeId);
      
      // 生成执行步骤
      const executionSteps = this.generateExecutionSteps(
        graph,
        startNodeId,
        options.executionMode || 'sequential',
        graphAnalysis
      );

      // 生成执行依赖关系
      const executionDependencies = this.generateExecutionDependencies(
        executionSteps,
        graph
      );

      // 优化执行计划
      const optimizedSteps = this.optimizeExecutionPlan(
        executionSteps,
        executionDependencies,
        options.optimizationStrategy || 'speed',
        options.constraints
      );

      // 估算执行时间
      const estimatedDuration = this.estimateExecutionDuration(optimizedSteps);

      const executionPlan: ExecutionPlanDto = {
        id: `plan_${graphId}_${Date.now()}`,
        graphId,
        executionMode: options.executionMode || 'sequential',
        steps: optimizedSteps,
        dependencies: executionDependencies,
        estimatedDuration,
        createdAt: new Date().toISOString(),
        metadata: {
          optimizationStrategy: options.optimizationStrategy || 'speed',
          constraints: options.constraints || {},
          graphAnalysis
        }
      };

      this.logger.info('执行计划创建成功', {
        graphId,
        planId: executionPlan.id,
        stepCount: executionPlan.steps.length,
        estimatedDuration
      });

      return executionPlan;
    } catch (error) {
      this.logger.error('创建执行计划失败', error as Error);
      throw error;
    }
  }

  /**
   * 分析图结构
   * @param graph 图
   * @param startNodeId 起始节点ID
   * @returns 图分析结果
   */
  private analyzeGraphStructure(
    graph: Graph,
    startNodeId: ID
  ): {
    nodeLevels: Map<string, number>;
    criticalPath: string[];
    parallelGroups: string[][];
    conditionalPaths: string[][];
    cycleCount: number;
  } {
    // 计算节点层级
    const nodeLevels = this.calculateNodeLevels(graph, startNodeId);
    
    // 找到关键路径
    const criticalPath = this.findCriticalPath(graph, startNodeId, nodeLevels);
    
    // 识别可并行执行的节点组
    const parallelGroups = this.identifyParallelGroups(graph, nodeLevels);
    
    // 识别条件路径
    const conditionalPaths = this.identifyConditionalPaths(graph);
    
    // 检测循环
    const cycleCount = this.detectCycles(graph);

    return {
      nodeLevels,
      criticalPath,
      parallelGroups,
      conditionalPaths,
      cycleCount
    };
  }

  /**
   * 计算节点层级
   * @param graph 图
   * @param startNodeId 起始节点ID
   * @returns 节点层级映射
   */
  private calculateNodeLevels(
    graph: Graph,
    startNodeId: ID
  ): Map<string, number> {
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
   * 找到关键路径
   * @param graph 图
   * @param startNodeId 起始节点ID
   * @param nodeLevels 节点层级
   * @returns 关键路径
   */
  private findCriticalPath(
    graph: Graph,
    startNodeId: ID,
    nodeLevels: Map<string, number>
  ): string[] {
    // 简化实现：找到最长路径
    const longestPath: string[] = [];
    const visited = new Set<string>();
    
    const dfs = (nodeId: ID, currentPath: string[]): string[] => {
      const nodeIdStr = nodeId.toString();
      
      if (visited.has(nodeIdStr)) {
        return currentPath;
      }
      
      visited.add(nodeIdStr);
      currentPath.push(nodeIdStr);
      
      let longestSubPath = currentPath;
      const outgoingEdges = graph.getOutgoingEdges(nodeId);
      
      for (const edge of outgoingEdges) {
        const subPath = dfs(edge.toNodeId, [...currentPath]);
        if (subPath.length > longestSubPath.length) {
          longestSubPath = subPath;
        }
      }
      
      return longestSubPath;
    };
    
    return dfs(startNodeId, []);
  }

  /**
   * 识别可并行执行的节点组
   * @param graph 图
   * @param nodeLevels 节点层级
   * @returns 并行节点组
   */
  private identifyParallelGroups(
    graph: Graph,
    nodeLevels: Map<string, number>
  ): string[][] {
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
    
    return parallelGroups;
  }

  /**
   * 检查节点是否可以并行执行
   * @param graph 图
   * @param nodeIds 节点ID列表
   * @returns 是否可以并行执行
   */
  private canExecuteInParallel(graph: Graph, nodeIds: string[]): boolean {
    // 检查节点之间是否有依赖关系
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const nodeId1 = ID.fromString(nodeIds[i]);
        const nodeId2 = ID.fromString(nodeIds[j]);
        
        // 检查是否存在从一个节点到另一个节点的路径
        if (this.hasPath(graph, nodeId1, nodeId2) || this.hasPath(graph, nodeId2, nodeId1)) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * 检查是否存在从一个节点到另一个节点的路径
   * @param graph 图
   * @param fromNodeId 起始节点ID
   * @param toNodeId 目标节点ID
   * @returns 是否存在路径
   */
  private hasPath(graph: Graph, fromNodeId: ID, toNodeId: ID): boolean {
    const visited = new Set<string>();
    const queue = [fromNodeId];
    
    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      const currentNodeIdStr = currentNodeId.toString();
      
      if (currentNodeId.equals(toNodeId)) {
        return true;
      }
      
      if (visited.has(currentNodeIdStr)) {
        continue;
      }
      
      visited.add(currentNodeIdStr);
      
      const outgoingEdges = graph.getOutgoingEdges(currentNodeId);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.toNodeId.toString())) {
          queue.push(edge.toNodeId);
        }
      }
    }
    
    return false;
  }

  /**
   * 识别条件路径
   * @param graph 图
   * @returns 条件路径列表
   */
  private identifyConditionalPaths(graph: Graph): string[][] {
    const conditionalPaths: string[][] = [];
    const conditionalEdges = Array.from(graph.edges.values()).filter(
      edge => edge.type.toString() === 'conditional'
    );
    
    for (const edge of conditionalEdges) {
      // 找到从条件边出发的所有路径
      const path = this.findPathFromEdge(graph, edge);
      if (path.length > 0) {
        conditionalPaths.push(path);
      }
    }
    
    return conditionalPaths;
  }

  /**
   * 从边出发找到路径
   * @param graph 图
   * @param startEdge 起始边
   * @returns 路径
   */
  private findPathFromEdge(graph: Graph, startEdge: Edge): string[] {
    const path: string[] = [];
    const visited = new Set<string>();
    const queue = [startEdge.toNodeId];
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const nodeIdStr = nodeId.toString();
      
      if (visited.has(nodeIdStr)) {
        continue;
      }
      
      visited.add(nodeIdStr);
      path.push(nodeIdStr);
      
      const outgoingEdges = graph.getOutgoingEdges(nodeId);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.toNodeId.toString())) {
          queue.push(edge.toNodeId);
        }
      }
    }
    
    return path;
  }

  /**
   * 检测循环
   * @param graph 图
   * @returns 循环数量
   */
  private detectCycles(graph: Graph): number {
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
    
    return cycleCount;
  }

  /**
   * 生成执行步骤
   * @param graph 图
   * @param startNodeId 起始节点ID
   * @param executionMode 执行模式
   * @param graphAnalysis 图分析结果
   * @returns 执行步骤列表
   */
  private generateExecutionSteps(
    graph: Graph,
    startNodeId: ID,
    executionMode: 'sequential' | 'parallel' | 'conditional',
    graphAnalysis: any
  ): ExecutionStepDto[] {
    const steps: ExecutionStepDto[] = [];
    const visited = new Set<string>();
    let stepOrder = 0;
    
    if (executionMode === 'sequential') {
      // 顺序执行模式
      const queue = [startNodeId];
      
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        const nodeIdStr = nodeId.toString();
        
        if (visited.has(nodeIdStr)) {
          continue;
        }
        
        visited.add(nodeIdStr);
        const node = graph.getNode(nodeId);
        
        if (node) {
          steps.push({
            id: `step_${nodeIdStr}`,
            nodeId: nodeIdStr,
            name: node.name,
            type: node.type.toString(),
            order: stepOrder++,
            prerequisites: this.getPrerequisites(graph, nodeId, visited),
            inputMapping: {},
            outputMapping: {},
            estimatedDuration: this.estimateNodeDuration(node),
            retryConfig: {
              maxRetries: 3,
              retryDelay: 1000
            }
          });
          
          // 添加后续节点
          const outgoingEdges = graph.getOutgoingEdges(nodeId);
          for (const edge of outgoingEdges) {
            if (!visited.has(edge.toNodeId.toString())) {
              queue.push(edge.toNodeId);
            }
          }
        }
      }
    } else if (executionMode === 'parallel') {
      // 并行执行模式
      for (const [level, nodeIds] of Object.entries(
        this.groupNodesByLevel(graphAnalysis.nodeLevels)
      )) {
        for (const nodeId of nodeIds) {
          const node = graph.getNode(ID.fromString(nodeId));
          if (node) {
            steps.push({
              id: `step_${nodeId}`,
              nodeId,
              name: node.name,
              type: node.type.toString(),
              order: stepOrder++,
              prerequisites: this.getPrerequisites(graph, ID.fromString(nodeId), visited),
              inputMapping: {},
              outputMapping: {},
              estimatedDuration: this.estimateNodeDuration(node),
              retryConfig: {
                maxRetries: 3,
                retryDelay: 1000
              }
            });
          }
        }
      }
    } else if (executionMode === 'conditional') {
      // 条件执行模式
      // 简化实现，基于关键路径生成步骤
      for (const nodeId of graphAnalysis.criticalPath) {
        const node = graph.getNode(ID.fromString(nodeId));
        if (node) {
          steps.push({
            id: `step_${nodeId}`,
            nodeId,
            name: node.name,
            type: node.type.toString(),
            order: stepOrder++,
            prerequisites: this.getPrerequisites(graph, ID.fromString(nodeId), visited),
            inputMapping: {},
            outputMapping: {},
            estimatedDuration: this.estimateNodeDuration(node),
            retryConfig: {
              maxRetries: 3,
              retryDelay: 1000
            }
          });
        }
      }
    }
    
    return steps;
  }

  /**
   * 按层级分组节点
   * @param nodeLevels 节点层级映射
   * @returns 按层级分组的节点
   */
  private groupNodesByLevel(nodeLevels: Map<string, number>): Record<number, string[]> {
    const groups: Record<number, string[]> = {};
    
    for (const [nodeId, level] of nodeLevels.entries()) {
      if (!groups[level]) {
        groups[level] = [];
      }
      groups[level].push(nodeId);
    }
    
    return groups;
  }

  /**
   * 获取节点的前置条件
   * @param graph 图
   * @param nodeId 节点ID
   * @param visited 已访问节点集合
   * @returns 前置条件列表
   */
  private getPrerequisites(
    graph: Graph,
    nodeId: ID,
    visited: Set<string>
  ): string[] {
    const incomingEdges = graph.getIncomingEdges(nodeId);
    return incomingEdges
      .filter(edge => visited.has(edge.fromNodeId.toString()))
      .map(edge => `step_${edge.fromNodeId.toString()}`);
  }

  /**
   * 估算节点执行时间
   * @param node 节点
   * @returns 估算执行时间（毫秒）
   */
  private estimateNodeDuration(node: Node): number {
    // 基于节点类型和历史数据估算执行时间
    const baseDurations: Record<string, number> = {
      'llm': 5000,
      'tool': 2000,
      'condition': 500,
      'wait': 1000,
      'data': 1000
    };
    
    const nodeType = node.type.toString();
    const baseDuration = baseDurations[nodeType] || 1000;
    
    // 根据节点属性调整估算时间
    const complexityFactor = node.properties.complexity || 1.0;
    return Math.round(baseDuration * complexityFactor);
  }

  /**
   * 生成执行依赖关系
   * @param steps 执行步骤
   * @param graph 图
   * @returns 执行依赖关系列表
   */
  private generateExecutionDependencies(
    steps: ExecutionStepDto[],
    graph: Graph
  ): ExecutionDependencyDto[] {
    const dependencies: ExecutionDependencyDto[] = [];
    
    for (const step of steps) {
      for (const prerequisite of step.prerequisites) {
        dependencies.push({
          fromStepId: prerequisite,
          toStepId: step.id,
          type: 'success',
          condition: null
        });
      }
    }
    
    return dependencies;
  }

  /**
   * 优化执行计划
   * @param steps 执行步骤
   * @param dependencies 执行依赖关系
   * @param optimizationStrategy 优化策略
   * @param constraints 约束条件
   * @returns 优化后的执行步骤
   */
  private optimizeExecutionPlan(
    steps: ExecutionStepDto[],
    dependencies: ExecutionDependencyDto[],
    optimizationStrategy: 'speed' | 'resource' | 'reliability',
    constraints?: {
      maxParallelNodes?: number;
      timeout?: number;
      resourceLimits?: Record<string, number>;
    }
  ): ExecutionStepDto[] {
    // 简化实现，根据优化策略调整步骤顺序
    const optimizedSteps = [...steps];
    
    if (optimizationStrategy === 'speed') {
      // 速度优化：优先执行关键路径上的节点
      optimizedSteps.sort((a, b) => {
        const aOnCriticalPath = this.isOnCriticalPath(a.nodeId);
        const bOnCriticalPath = this.isOnCriticalPath(b.nodeId);
        
        if (aOnCriticalPath && !bOnCriticalPath) {
          return -1;
        } else if (!aOnCriticalPath && bOnCriticalPath) {
          return 1;
        } else {
          return a.estimatedDuration - b.estimatedDuration;
        }
      });
    } else if (optimizationStrategy === 'resource') {
      // 资源优化：优先执行资源消耗少的节点
      optimizedSteps.sort((a, b) => {
        const aResourceCost = this.calculateResourceCost(a);
        const bResourceCost = this.calculateResourceCost(b);
        return aResourceCost - bResourceCost;
      });
    } else if (optimizationStrategy === 'reliability') {
      // 可靠性优化：优先执行失败率低的节点
      optimizedSteps.sort((a, b) => {
        const aFailureRate = this.getFailureRate(a);
        const bFailureRate = this.getFailureRate(b);
        return aFailureRate - bFailureRate;
      });
    }
    
    // 重新分配步骤顺序
    optimizedSteps.forEach((step, index) => {
      step.order = index;
    });
    
    return optimizedSteps;
  }

  /**
   * 检查节点是否在关键路径上
   * @param nodeId 节点ID
   * @returns 是否在关键路径上
   */
  private isOnCriticalPath(nodeId: string): boolean {
    // 简化实现，实际应该基于之前计算的关键路径
    return Math.random() > 0.5;
  }

  /**
   * 计算资源成本
   * @param step 执行步骤
   * @returns 资源成本
   */
  private calculateResourceCost(step: ExecutionStepDto): number {
    // 简化实现，基于节点类型和估算时间计算资源成本
    const typeCosts: Record<string, number> = {
      'llm': 10,
      'tool': 5,
      'condition': 1,
      'wait': 1,
      'data': 2
    };
    
    const baseCost = typeCosts[step.type] || 1;
    return baseCost * (step.estimatedDuration / 1000);
  }

  /**
   * 获取失败率
   * @param step 执行步骤
   * @returns 失败率
   */
  private getFailureRate(step: ExecutionStepDto): number {
    // 简化实现，基于节点类型返回失败率
    const failureRates: Record<string, number> = {
      'llm': 0.1,
      'tool': 0.05,
      'condition': 0.01,
      'wait': 0.01,
      'data': 0.02
    };
    
    return failureRates[step.type] || 0.05;
  }

  /**
   * 估算执行时间
   * @param steps 执行步骤
   * @returns 估算执行时间（毫秒）
   */
  private estimateExecutionDuration(steps: ExecutionStepDto[]): number {
    // 简化实现，累加所有步骤的估算时间
    return steps.reduce((total, step) => total + step.estimatedDuration, 0);
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
   * 更新执行计划
   * @param planId 计划ID
   * @param updates 更新内容
   * @returns 更新后的执行计划
   */
  async updateExecutionPlan(
    planId: string,
    updates: Partial<ExecutionPlanDto>
  ): Promise<ExecutionPlanDto> {
    try {
      this.logger.info('正在更新执行计划', { planId });

      // 简化实现，实际应该从存储中获取计划并更新
      const updatedPlan: ExecutionPlanDto = {
        id: planId,
        graphId: updates.graphId || '',
        executionMode: updates.executionMode || 'sequential',
        steps: updates.steps || [],
        dependencies: updates.dependencies || [],
        estimatedDuration: updates.estimatedDuration || 0,
        createdAt: updates.createdAt || new Date().toISOString(),
        metadata: updates.metadata || {}
      };

      this.logger.info('执行计划更新成功', { planId });

      return updatedPlan;
    } catch (error) {
      this.logger.error('更新执行计划失败', error as Error);
      throw error;
    }
  }

  /**
   * 删除执行计划
   * @param planId 计划ID
   * @returns 是否成功删除
   */
  async deleteExecutionPlan(planId: string): Promise<boolean> {
    try {
      this.logger.info('正在删除执行计划', { planId });

      // 简化实现，实际应该从存储中删除计划
      // 这里只是记录日志

      this.logger.info('执行计划删除成功', { planId });

      return true;
    } catch (error) {
      this.logger.error('删除执行计划失败', error as Error);
      throw error;
    }
  }
}
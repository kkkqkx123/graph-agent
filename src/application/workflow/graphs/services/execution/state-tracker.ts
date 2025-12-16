import { injectable, inject } from 'inversify';
import { Graph } from '../../../../../domain/workflow/graph/entities/graph';
import { Node } from '../../../../../domain/workflow/graph/entities/nodes';
import { Edge } from '../../../../../domain/workflow/graph/entities/edges';
import { GraphRepository, NodeRepository, EdgeRepository } from '../../../../../domain/workflow/graph/repositories/graph-repository';
import { ID } from '../../../../../domain/common/value-objects/id';
import { DomainError } from '../../../../../domain/common/errors/domain-error';
import { ILogger } from '@shared/types/logger';

// DTOs
// Note: These DTOs may not exist yet, we'll need to create them or use alternatives

/**
 * 节点执行状态
 */
interface NodeExecutionState {
  nodeId: string;
  graphId: string;
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
  logs: string[];
  metadata: Record<string, any>;
  retryCount: number;
  maxRetries: number;
  resourceUsage?: {
    cpu?: number;
    memory?: number;
    network?: number;
  };
}

/**
 * 图执行状态
 */
interface GraphExecutionState {
  graphId: string;
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  currentNodeId?: string;
  executedNodes: number;
  totalNodes: number;
  executedEdges: number;
  totalEdges: number;
  executionPath: string[];
  nodeStatuses: Record<string, NodeExecutionState>;
  output?: any;
  error?: string;
  statistics: {
    averageNodeExecutionTime: number;
    maxNodeExecutionTime: number;
    minNodeExecutionTime: number;
    successRate: number;
    totalResourceUsage: {
      cpu: number;
      memory: number;
      network: number;
    };
  };
}

/**
 * 状态跟踪器
 * 
 * 负责跟踪图和节点的执行状态
 */
@injectable()
export class StateTracker {
  private graphStates: Map<string, GraphExecutionState> = new Map();
  private nodeStates: Map<string, NodeExecutionState> = new Map();

  constructor(
    @inject('GraphRepository') private readonly graphRepository: GraphRepository,
    @inject('NodeRepository') private readonly nodeRepository: NodeRepository,
    @inject('EdgeRepository') private readonly edgeRepository: EdgeRepository,
    @inject('Logger') private readonly logger: ILogger
  ) {}

  /**
   * 开始跟踪图执行
   * @param graphId 图ID
   * @param executionId 执行ID
   * @returns 是否成功开始跟踪
   */
  async startTrackingGraphExecution(
    graphId: string,
    executionId: string
  ): Promise<boolean> {
    try {
      this.logger.info('开始跟踪图执行', {
        graphId,
        executionId
      });

      const graphIdObj = ID.fromString(graphId);
      const graph = await this.graphRepository.findByIdOrFail(graphIdObj);

      // 创建图执行状态
      const graphState: GraphExecutionState = {
        graphId,
        executionId,
        status: 'running',
        startTime: new Date(),
        executedNodes: 0,
        totalNodes: graph.getNodeCount(),
        executedEdges: 0,
        totalEdges: graph.getEdgeCount(),
        executionPath: [],
        nodeStatuses: {},
        statistics: {
          averageNodeExecutionTime: 0,
          maxNodeExecutionTime: 0,
          minNodeExecutionTime: Number.MAX_SAFE_INTEGER,
          successRate: 0,
          totalResourceUsage: {
            cpu: 0,
            memory: 0,
            network: 0
          }
        }
      };

      this.graphStates.set(executionId, graphState);

      this.logger.info('图执行跟踪已开始', {
        graphId,
        executionId,
        totalNodes: graphState.totalNodes,
        totalEdges: graphState.totalEdges
      });

      return true;
    } catch (error) {
      this.logger.error('开始跟踪图执行失败', error as Error);
      return false;
    }
  }

  /**
   * 开始跟踪节点执行
   * @param graphId 图ID
   * @param nodeId 节点ID
   * @param executionId 执行ID
   * @param input 输入数据
   * @returns 是否成功开始跟踪
   */
  async startTrackingNodeExecution(
    graphId: string,
    nodeId: string,
    executionId: string,
    input?: any
  ): Promise<boolean> {
    try {
      this.logger.debug('开始跟踪节点执行', {
        graphId,
        nodeId,
        executionId
      });

      const nodeIdObj = ID.fromString(nodeId);
      const node = await this.nodeRepository.findByIdOrFail(nodeIdObj);

      // 创建节点执行状态
      const nodeState: NodeExecutionState = {
        nodeId,
        graphId,
        executionId,
        status: 'running',
        startTime: new Date(),
        logs: [],
        metadata: {},
        retryCount: 0,
        maxRetries: (node.properties['maxRetries'] as number) || 3,
        input
      };

      this.nodeStates.set(`${executionId}:${nodeId}`, nodeState);

      // 更新图执行状态
      const graphState = this.graphStates.get(executionId);
      if (graphState) {
        graphState.currentNodeId = nodeId;
        graphState.nodeStatuses[nodeId] = nodeState;
      }

      this.logger.debug('节点执行跟踪已开始', {
        graphId,
        nodeId,
        executionId
      });

      return true;
    } catch (error) {
      this.logger.error('开始跟踪节点执行失败', error as Error);
      return false;
    }
  }

  /**
   * 更新节点执行状态
   * @param executionId 执行ID
   * @param nodeId 节点ID
   * @param status 状态
   * @param output 输出数据
   * @param error 错误信息
   * @param logs 日志
   * @param metadata 元数据
   * @returns 是否成功更新
   */
  async updateNodeExecutionStatus(
    executionId: string,
    nodeId: string,
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused',
    output?: any,
    error?: string,
    logs?: string[],
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const nodeKey = `${executionId}:${nodeId}`;
      const nodeState = this.nodeStates.get(nodeKey);
      
      if (!nodeState) {
        throw new DomainError(`节点执行状态不存在: ${nodeKey}`);
      }

      // 更新节点状态
      nodeState.status = status;
      nodeState.output = output;
      nodeState.error = error;
      
      if (logs) {
        nodeState.logs.push(...logs);
      }
      
      if (metadata) {
        nodeState.metadata = { ...nodeState.metadata, ...metadata };
      }

      // 如果是完成或失败状态，设置结束时间和持续时间
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        nodeState.endTime = new Date();
        if (nodeState.startTime) {
          nodeState.duration = nodeState.endTime.getTime() - nodeState.startTime.getTime();
        }
      }

      // 更新图执行状态
      const graphState = this.graphStates.get(executionId);
      if (graphState) {
        graphState.nodeStatuses[nodeId] = nodeState;
        
        // 更新统计信息
        this.updateGraphStatistics(graphState);
        
        // 如果节点完成，更新执行路径
        if (status === 'completed') {
          graphState.executionPath.push(nodeId);
        }
      }

      this.logger.debug('节点执行状态已更新', {
        executionId,
        nodeId,
        status,
        duration: nodeState.duration
      });

      return true;
    } catch (error) {
      this.logger.error('更新节点执行状态失败', error as Error);
      return false;
    }
  }

  /**
   * 更新图执行状态
   * @param executionId 执行ID
   * @param status 状态
   * @param error 错误信息
   * @param output 输出数据
   * @returns 是否成功更新
   */
  async updateGraphExecutionStatus(
    executionId: string,
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused',
    error?: string,
    output?: any
  ): Promise<boolean> {
    try {
      const graphState = this.graphStates.get(executionId);
      
      if (!graphState) {
        throw new DomainError(`图执行状态不存在: ${executionId}`);
      }

      // 更新图状态
      graphState.status = status;
      graphState.error = error;
      graphState.output = output;

      // 如果是完成或失败状态，设置结束时间和持续时间
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        graphState.endTime = new Date();
        if (graphState.startTime) {
          graphState.duration = graphState.endTime.getTime() - graphState.startTime.getTime();
        }
      }

      this.logger.debug('图执行状态已更新', {
        executionId,
        status,
        duration: graphState.duration
      });

      return true;
    } catch (error) {
      this.logger.error('更新图执行状态失败', error as Error);
      return false;
    }
  }

  /**
   * 获取节点执行状态
   * @param executionId 执行ID
   * @param nodeId 节点ID
   * @returns 节点执行状态DTO
   */
  async getNodeExecutionStatus(
    executionId: string,
    nodeId: string
  ): Promise<any | null> {
    const nodeKey = `${executionId}:${nodeId}`;
    const nodeState = this.nodeStates.get(nodeKey);
    
    if (!nodeState) {
      return null;
    }

    return {
      nodeId: nodeState.nodeId,
      graphId: nodeState.graphId,
      executionId: nodeState.executionId,
      status: nodeState.status,
      startTime: nodeState.startTime?.toISOString() || new Date().toISOString(),
      endTime: nodeState.endTime?.toISOString() || null,
      duration: nodeState.duration || 0,
      input: nodeState.input || {},
      output: nodeState.output || {},
      error: nodeState.error || null,
      logs: nodeState.logs,
      metadata: {
        retryCount: nodeState.retryCount,
        maxRetries: nodeState.maxRetries,
        ...nodeState.metadata
      }
    };
  }

  /**
   * 获取图执行状态
   * @param executionId 执行ID
   * @returns 图执行状态DTO
   */
  async getGraphExecutionStatus(executionId: string): Promise<any | null> {
    const graphState = this.graphStates.get(executionId);
    
    if (!graphState) {
      return null;
    }

    // 构建节点状态映射
    const nodeStatuses: Record<string, any> = {};
    for (const [nodeId, nodeState] of Object.entries(graphState.nodeStatuses)) {
      nodeStatuses[nodeId] = {
        status: nodeState.status,
        startTime: nodeState.startTime?.toISOString(),
        endTime: nodeState.endTime?.toISOString(),
        duration: nodeState.duration,
        error: nodeState.error
      };
    }

    return {
      graphId: graphState.graphId,
      executionId: graphState.executionId,
      status: graphState.status,
      startTime: graphState.startTime?.toISOString() || new Date().toISOString(),
      endTime: graphState.endTime?.toISOString() || null,
      duration: graphState.duration || 0,
      currentNodeId: graphState.currentNodeId || null,
      executedNodes: graphState.executedNodes,
      totalNodes: graphState.totalNodes,
      executedEdges: graphState.executedEdges,
      totalEdges: graphState.totalEdges,
      executionPath: graphState.executionPath,
      nodeStatuses,
      output: graphState.output || {},
      error: graphState.error || null,
      statistics: graphState.statistics
    };
  }

  /**
   * 获取图统计信息
   * @param graphId 图ID
   * @returns 图统计信息DTO
   */
  async getGraphStatistics(graphId: string): Promise<any | null> {
    try {
      const graphIdObj = ID.fromString(graphId);
      const graph = await this.graphRepository.findByIdOrFail(graphIdObj);

      // 获取所有执行历史
      const executionHistory = Array.from(this.graphStates.values())
        .filter(state => state.graphId === graphId);

      // 计算统计信息
      const totalExecutions = executionHistory.length;
      const successfulExecutions = executionHistory
        .filter(state => state.status === 'completed').length;
      const failedExecutions = executionHistory
        .filter(state => state.status === 'failed').length;

      const completedExecutions = executionHistory
        .filter(state => state.status === 'completed' && state.duration);

      const averageExecutionTime = completedExecutions.length > 0
        ? completedExecutions.reduce((sum, state) => sum + (state.duration || 0), 0) / completedExecutions.length
        : 0;

      const maxExecutionTime = completedExecutions.length > 0
        ? Math.max(...completedExecutions.map(state => state.duration || 0))
        : 0;

      const minExecutionTime = completedExecutions.length > 0
        ? Math.min(...completedExecutions.map(state => state.duration || 0))
        : 0;

      const successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 0;

      return {
        graphId,
        nodeStatistics: {
          total: graph.getNodeCount(),
          byType: this.getNodeTypeStatistics(graph),
          byStatus: this.getNodeStatusStatistics(graphId)
        },
        edgeStatistics: {
          total: graph.getEdgeCount(),
          byType: this.getEdgeTypeStatistics(graph),
          byCondition: this.getEdgeConditionStatistics(graph)
        },
        executionStatistics: {
          totalExecutions,
          successfulExecutions,
          failedExecutions,
          averageExecutionTime,
          maxExecutionTime,
          minExecutionTime
        },
        pathStatistics: {
          totalPaths: this.calculateTotalPaths(graph),
          shortestPathLength: this.calculateShortestPathLength(graph),
          longestPathLength: this.calculateLongestPathLength(graph),
          averagePathLength: this.calculateAveragePathLength(graph)
        },
        complexityMetrics: {
          cyclomaticComplexity: this.calculateCyclomaticComplexity(graph),
          nodeConnectivity: this.calculateNodeConnectivity(graph),
          graphDensity: this.calculateGraphDensity(graph)
        }
      };
    } catch (error) {
      this.logger.error('获取图统计信息失败', error as Error);
      return null;
    }
  }

  /**
   * 更新图统计信息
   * @param graphState 图执行状态
   */
  private updateGraphStatistics(graphState: GraphExecutionState): void {
    const completedNodes = Object.values(graphState.nodeStatuses)
      .filter(state => state.status === 'completed' && state.duration);

    if (completedNodes.length === 0) {
      return;
    }

    const durations = completedNodes.map(state => state.duration!);
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    
    graphState.statistics.averageNodeExecutionTime = totalDuration / completedNodes.length;
    graphState.statistics.maxNodeExecutionTime = Math.max(...durations);
    graphState.statistics.minNodeExecutionTime = Math.min(...durations);
    
    const successCount = Object.values(graphState.nodeStatuses)
      .filter(state => state.status === 'completed').length;
    
    const nodeStatusesLength = Object.keys(graphState.nodeStatuses).length;
    graphState.statistics.successRate = nodeStatusesLength > 0
      ? successCount / nodeStatusesLength
      : 0;
  }

  /**
   * 获取节点类型统计
   * @param graph 图
   * @returns 节点类型统计
   */
  private getNodeTypeStatistics(graph: Graph): Record<string, number> {
    const typeStats: Record<string, number> = {};
    
    for (const node of graph.nodes.values()) {
      const nodeType = node.type.toString();
      typeStats[nodeType] = (typeStats[nodeType] || 0) + 1;
    }
    
    return typeStats;
  }

  /**
   * 获取节点状态统计
   * @param graphId 图ID
   * @returns 节点状态统计
   */
  private getNodeStatusStatistics(graphId: string): Record<string, number> {
    const statusStats: Record<string, number> = {};
    
    for (const nodeState of this.nodeStates.values()) {
      if (nodeState.graphId === graphId) {
        statusStats[nodeState.status] = (statusStats[nodeState.status] || 0) + 1;
      }
    }
    
    return statusStats;
  }

  /**
   * 获取边类型统计
   * @param graph 图
   * @returns 边类型统计
   */
  private getEdgeTypeStatistics(graph: Graph): Record<string, number> {
    const typeStats: Record<string, number> = {};
    
    for (const edge of graph.edges.values()) {
      const edgeType = edge.type.toString();
      typeStats[edgeType] = (typeStats[edgeType] || 0) + 1;
    }
    
    return typeStats;
  }

  /**
   * 获取边条件统计
   * @param graph 图
   * @returns 边条件统计
   */
  private getEdgeConditionStatistics(graph: Graph): Record<string, number> {
    const conditionStats: Record<string, number> = {
      'with_condition': 0,
      'without_condition': 0
    };
    
    for (const edge of graph.edges.values()) {
      if (edge.condition) {
        conditionStats['with_condition'] = (conditionStats['with_condition'] || 0) + 1;
      } else {
        conditionStats['without_condition'] = (conditionStats['without_condition'] || 0) + 1;
      }
    }
    
    return conditionStats;
  }

  /**
   * 计算总路径数
   * @param graph 图
   * @returns 总路径数
   */
  private calculateTotalPaths(graph: Graph): number {
    // 简化实现
    return graph.edges.size;
  }

  /**
   * 计算最短路径长度
   * @param graph 图
   * @returns 最短路径长度
   */
  private calculateShortestPathLength(graph: Graph): number {
    // 简化实现
    return 1;
  }

  /**
   * 计算最长路径长度
   * @param graph 图
   * @returns 最长路径长度
   */
  private calculateLongestPathLength(graph: Graph): number {
    // 简化实现
    return graph.nodes.size;
  }

  /**
   * 计算平均路径长度
   * @param graph 图
   * @returns 平均路径长度
   */
  private calculateAveragePathLength(graph: Graph): number {
    // 简化实现
    return graph.nodes.size / 2;
  }

  /**
   * 计算圈复杂度
   * @param graph 图
   * @returns 圈复杂度
   */
  private calculateCyclomaticComplexity(graph: Graph): number {
    // 圈复杂度 = 边数 - 节点数 + 2
    return graph.edges.size - graph.nodes.size + 2;
  }

  /**
   * 计算节点连通性
   * @param graph 图
   * @returns 节点连通性
   */
  private calculateNodeConnectivity(graph: Graph): number {
    // 简化实现
    return 0.8;
  }

  /**
   * 计算图密度
   * @param graph 图
   * @returns 图密度
   */
  private calculateGraphDensity(graph: Graph): number {
    const nodeCount = graph.nodes.size;
    const edgeCount = graph.edges.size;
    
    if (nodeCount < 2) {
      return 0;
    }
    
    const maxPossibleEdges = nodeCount * (nodeCount - 1);
    return edgeCount / maxPossibleEdges;
  }

  /**
   * 清理过期的执行状态
   * @param maxAge 最大保留时间（毫秒）
   */
  async cleanupExpiredStates(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    const now = new Date();
    const expiredExecutionIds: string[] = [];
    
    // 找出过期的图执行状态
    for (const [executionId, graphState] of this.graphStates.entries()) {
      if (graphState.startTime && (now.getTime() - graphState.startTime.getTime()) > maxAge) {
        expiredExecutionIds.push(executionId);
      }
    }
    
    // 清理过期状态
    for (const executionId of expiredExecutionIds) {
      this.graphStates.delete(executionId);
      
      // 清理相关的节点状态
      const nodeKeysToDelete: string[] = [];
      for (const nodeKey of this.nodeStates.keys()) {
        if (nodeKey.startsWith(`${executionId}:`)) {
          nodeKeysToDelete.push(nodeKey);
        }
      }
      
      for (const nodeKey of nodeKeysToDelete) {
        this.nodeStates.delete(nodeKey);
      }
    }
    
    if (expiredExecutionIds.length > 0) {
      this.logger.info('清理过期执行状态', {
        expiredCount: expiredExecutionIds.length,
        maxAge
      });
    }
  }

  /**
   * 添加节点日志
   * @param executionId 执行ID
   * @param nodeId 节点ID
   * @param log 日志内容
   */
  async addNodeLog(executionId: string, nodeId: string, log: string): Promise<void> {
    const nodeKey = `${executionId}:${nodeId}`;
    const nodeState = this.nodeStates.get(nodeKey);
    
    if (nodeState) {
      nodeState.logs.push(log);
    }
  }

  /**
   * 更新节点资源使用情况
   * @param executionId 执行ID
   * @param nodeId 节点ID
   * @param resourceUsage 资源使用情况
   */
  async updateNodeResourceUsage(
    executionId: string,
    nodeId: string,
    resourceUsage: {
      cpu?: number;
      memory?: number;
      network?: number;
    }
  ): Promise<void> {
    const nodeKey = `${executionId}:${nodeId}`;
    const nodeState = this.nodeStates.get(nodeKey);
    
    if (nodeState) {
      nodeState.resourceUsage = {
        ...nodeState.resourceUsage,
        ...resourceUsage
      };
    }
  }
}
import { injectable, inject } from 'inversify';
import { Node } from '../../../../../domain/workflow/graph/entities/nodes';
import { Edge } from '../../../../../domain/workflow/graph/entities/edges';
import { Graph } from '../../../../../domain/workflow/graph/entities/graph';
import { INodeExecutor } from '../../../../domain/workflow/interfaces/node-executor.interface';
import { IEdgeEvaluator } from '../../../../domain/workflow/interfaces/edge-evaluator.interface';
import { ID } from '../../../../domain/common/value-objects/id';
import { NodeExecutionResultValue } from '../../../../domain/workflow/value-objects/node-execution-result';
import { DomainError } from '../../../../domain/common/errors/domain-error';
import { ILogger } from '@shared/types/logger';

// DTOs
// Note: These DTOs may not exist yet, we'll need to create them or use alternatives

/**
 * 节点执行状态
 */
interface NodeExecutionState {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  input?: any;
  output?: any;
  error?: Error;
  logs: string[];
  retryCount: number;
  maxRetries: number;
}

/**
 * 节点执行编排器
 * 
 * 负责编排节点的实际执行，管理并发执行和状态跟踪
 */
@injectable()
export class NodeExecutionOrchestrator {
  private executionId: string | null = null;
  private executionContext: any = null;
  private nodeStates: Map<string, NodeExecutionState> = new Map();
  private runningExecutions: Map<string, Promise<NodeExecutionResultValue>> = new Map();
  private graph: Graph | null = null;

  constructor(
    @inject('EdgeEvaluatorFactory') private readonly edgeEvaluatorFactory: (edgeType: string) => IEdgeEvaluator,
    @inject('Logger') private readonly logger: ILogger
  ) { }

  /**
   * 初始化编排器
   * @param executionId 执行ID
   * @param executionContext 执行上下文
   */
  async initialize(executionId: string, executionContext: any): Promise<void> {
    this.logger.debug('正在初始化节点执行编排器', {
      executionId
    });

    this.executionId = executionId;
    this.executionContext = executionContext;
    this.nodeStates.clear();
    this.runningExecutions.clear();

    this.logger.debug('节点执行编排器初始化完成', {
      executionId
    });
  }

  /**
   * 批量执行节点
   * @param nodes 节点列表
   * @param nodeExecutorFactory 节点执行器工厂
   * @returns 执行结果映射
   */
  async executeBatch(
    nodes: Node[],
    nodeExecutorFactory: (nodeType: string) => INodeExecutor
  ): Promise<Map<string, NodeExecutionResultValue>> {
    if (!this.executionId) {
      throw new DomainError('编排器未初始化');
    }

    this.logger.debug('开始批量执行节点', {
      executionId: this.executionId,
      nodeCount: nodes.length
    });

    const results = new Map<string, NodeExecutionResultValue>();
    const executionPromises: Promise<void>[] = [];

    // 为每个节点创建执行任务
    for (const node of nodes) {
      const nodeIdStr = node.nodeId.toString();

      // 初始化节点状态
      this.nodeStates.set(nodeIdStr, {
        nodeId: nodeIdStr,
        status: 'pending',
        logs: [],
        retryCount: 0,
        maxRetries: (node.properties['maxRetries'] as number) || 3
      });

      // 创建执行Promise
      const executionPromise = this.executeNode(node, nodeExecutorFactory)
        .then(result => {
          results.set(nodeIdStr, result);
        })
        .catch(error => {
          this.logger.error('节点执行失败', error as Error, {
            nodeId: nodeIdStr
          });

          const failureResult = NodeExecutionResultValue.failure(
            node.nodeId,
            error as Error,
            0,
            this.executionContext
          );
          results.set(nodeIdStr, failureResult);
        });

      executionPromises.push(executionPromise);
    }

    // 等待所有节点执行完成
    await Promise.all(executionPromises);

    this.logger.debug('批量节点执行完成', {
      executionId: this.executionId,
      successCount: Array.from(results.values()).filter(r => r.success).length,
      failureCount: Array.from(results.values()).filter(r => !r.success).length
    });

    return results;
  }

  /**
   * 执行单个节点
   * @param node 节点
   * @param nodeExecutorFactory 节点执行器工厂
   * @returns 执行结果
   */
  private async executeNode(
    node: Node,
    nodeExecutorFactory: (nodeType: string) => INodeExecutor
  ): Promise<NodeExecutionResultValue> {
    const nodeIdStr = node.nodeId.toString();
    const nodeState = this.nodeStates.get(nodeIdStr)!;

    try {
      // 更新状态为运行中
      nodeState.status = 'running';
      nodeState.startTime = new Date();

      this.logger.debug('开始执行节点', {
        nodeId: nodeIdStr,
        nodeType: node.type.toString()
      });

      // 获取节点执行器
      const nodeExecutor = nodeExecutorFactory(node.type.toString());

      // 准备执行上下文
      const nodeExecutionContext = {
        ...this.executionContext,
        nodeId: nodeIdStr,
        nodeType: node.type.toString(),
        nodeProperties: node.properties,
        startTime: nodeState.startTime,
        executionId: this.executionId
      };

      // 获取输入数据
      const inputData = nodeState.input || {};

      // 执行节点
      const output = await nodeExecutor.execute(node, inputData);

      // 计算执行时间
      const endTime = new Date();
      const duration = endTime.getTime() - nodeState.startTime!.getTime();

      // 更新状态
      nodeState.status = 'completed';
      nodeState.endTime = endTime;
      nodeState.duration = duration;
      nodeState.output = output;

      this.logger.debug('节点执行成功', {
        nodeId: nodeIdStr,
        duration
      });

      return NodeExecutionResultValue.success(
        node.nodeId,
        output,
        duration,
        nodeExecutionContext
      );
    } catch (error) {
      // 计算执行时间
      const endTime = new Date();
      const duration = nodeState.startTime ? endTime.getTime() - nodeState.startTime.getTime() : 0;

      // 更新状态
      nodeState.status = 'failed';
      nodeState.endTime = endTime;
      nodeState.duration = duration;
      nodeState.error = error as Error;

      this.logger.error('节点执行失败', error as Error, {
        nodeId: nodeIdStr,
        duration
      });

      return NodeExecutionResultValue.failure(
        node.nodeId,
        error as Error,
        duration,
        this.executionContext
      );
    }
  }

  /**
   * 等待正在运行的节点完成
   */
  async waitForRunningNodes(): Promise<void> {
    if (this.runningExecutions.size === 0) {
      return;
    }

    this.logger.debug('等待正在运行的节点完成', {
      executionId: this.executionId,
      runningCount: this.runningExecutions.size
    });

    // 等待所有正在运行的执行完成
    const executionPromises = Array.from(this.runningExecutions.values());
    await Promise.all(executionPromises);

    this.runningExecutions.clear();

    this.logger.debug('所有运行节点已完成', {
      executionId: this.executionId
    });
  }

  /**
   * 获取正在运行的节点
   * @returns 正在运行的节点ID列表
   */
  async getRunningNodes(): Promise<string[]> {
    const runningNodes: string[] = [];

    for (const [nodeId, state] of this.nodeStates.entries()) {
      if (state.status === 'running') {
        runningNodes.push(nodeId);
      }
    }

    return runningNodes;
  }

  /**
   * 取消所有正在执行的节点
   */
  async cancelAll(): Promise<void> {
    this.logger.debug('正在取消所有正在执行的节点', {
      executionId: this.executionId,
      runningCount: this.runningExecutions.size
    });

    // 标记所有运行中的节点为已取消
    for (const [nodeId, state] of this.nodeStates.entries()) {
      if (state.status === 'running') {
        state.status = 'cancelled';
        state.endTime = new Date();
      }
    }

    // 清空运行中的执行
    this.runningExecutions.clear();

    this.logger.debug('所有节点已取消', {
      executionId: this.executionId
    });
  }

  /**
   * 暂停节点执行
   * @param nodeId 节点ID
   * @param executionId 执行ID
   * @returns 是否成功暂停
   */
  async pauseNodeExecution(nodeId: ID, executionId: string): Promise<boolean> {
    if (this.executionId !== executionId) {
      return false;
    }

    const nodeIdStr = nodeId.toString();
    const nodeState = this.nodeStates.get(nodeIdStr);

    if (!nodeState || nodeState.status !== 'running') {
      return false;
    }

    nodeState.status = 'paused';

    this.logger.debug('节点执行已暂停', {
      executionId,
      nodeId: nodeIdStr
    });

    return true;
  }

  /**
   * 恢复节点执行
   * @param nodeId 节点ID
   * @param executionId 执行ID
   * @returns 是否成功恢复
   */
  async resumeNodeExecution(nodeId: ID, executionId: string): Promise<boolean> {
    if (this.executionId !== executionId) {
      return false;
    }

    const nodeIdStr = nodeId.toString();
    const nodeState = this.nodeStates.get(nodeIdStr);

    if (!nodeState || nodeState.status !== 'paused') {
      return false;
    }

    nodeState.status = 'running';

    this.logger.debug('节点执行已恢复', {
      executionId,
      nodeId: nodeIdStr
    });

    return true;
  }

  /**
   * 取消节点执行
   * @param nodeId 节点ID
   * @param executionId 执行ID
   * @returns 是否成功取消
   */
  async cancelNodeExecution(nodeId: ID, executionId: string): Promise<boolean> {
    if (this.executionId !== executionId) {
      return false;
    }

    const nodeIdStr = nodeId.toString();
    const nodeState = this.nodeStates.get(nodeIdStr);

    if (!nodeState || (nodeState.status !== 'running' && nodeState.status !== 'paused')) {
      return false;
    }

    nodeState.status = 'cancelled';
    nodeState.endTime = new Date();

    // 从运行中的执行中移除
    this.runningExecutions.delete(nodeIdStr);

    this.logger.debug('节点执行已取消', {
      executionId,
      nodeId: nodeIdStr
    });

    return true;
  }

  /**
   * 获取节点执行状态
   * @param nodeId 节点ID
   * @param executionId 执行ID
   * @returns 节点执行状态DTO
   */
  async getNodeExecutionStatus(
    nodeId: ID,
    executionId: string
  ): Promise<any | null> {
    if (this.executionId !== executionId) {
      return null;
    }

    const nodeIdStr = nodeId.toString();
    const nodeState = this.nodeStates.get(nodeIdStr);

    if (!nodeState) {
      return null;
    }

    return {
      nodeId: nodeIdStr,
      graphId: this.graph?.graphId.toString() || '',
      executionId,
      status: nodeState.status,
      startTime: nodeState.startTime?.toISOString() || new Date().toISOString(),
      endTime: nodeState.endTime?.toISOString() || null,
      duration: nodeState.duration || 0,
      input: nodeState.input || {},
      output: nodeState.output || {},
      error: nodeState.error?.message || null,
      logs: nodeState.logs,
      metadata: {
        retryCount: nodeState.retryCount,
        maxRetries: nodeState.maxRetries
      }
    };
  }

  /**
   * 获取图执行状态
   * @param graphId 图ID
   * @param executionId 执行ID
   * @returns 图执行状态DTO
   */
  async getGraphExecutionStatus(
    graphId: ID,
    executionId: string
  ): Promise<any | null> {
    if (this.executionId !== executionId) {
      return null;
    }

    const nodeStatuses: Record<string, any> = {};
    let executedNodes = 0;
    let totalDuration = 0;
    let maxDuration = 0;
    let minDuration = Number.MAX_SAFE_INTEGER;
    let successCount = 0;

    // 统计节点执行状态
    for (const [nodeId, state] of this.nodeStates.entries()) {
      nodeStatuses[nodeId] = {
        status: state.status,
        startTime: state.startTime?.toISOString(),
        endTime: state.endTime?.toISOString(),
        duration: state.duration
      };

      if (state.status === 'completed') {
        executedNodes++;
        totalDuration += state.duration || 0;
        maxDuration = Math.max(maxDuration, state.duration || 0);
        minDuration = Math.min(minDuration, state.duration || 0);
        successCount++;
      }
    }

    const averageDuration = executedNodes > 0 ? totalDuration / executedNodes : 0;
    const successRate = this.nodeStates.size > 0 ? successCount / this.nodeStates.size : 0;

    return {
      graphId: graphId.toString(),
      executionId,
      status: this.calculateOverallStatus(),
      startTime: this.getEarliestStartTime(),
      endTime: this.getLatestEndTime(),
      duration: this.calculateTotalDuration(),
      currentNodeId: this.getCurrentNodeId(),
      executedNodes,
      totalNodes: this.nodeStates.size,
      executedEdges: 0, // 简化实现
      totalEdges: 0, // 简化实现
      executionPath: this.getExecutionPath(),
      nodeStatuses,
      output: {}, // 简化实现
      error: null, // 简化实现
      statistics: {
        averageNodeExecutionTime: averageDuration,
        maxNodeExecutionTime: maxDuration === Number.MAX_SAFE_INTEGER ? 0 : maxDuration,
        minNodeExecutionTime: minDuration === Number.MAX_SAFE_INTEGER ? 0 : minDuration,
        successRate
      }
    };
  }

  /**
   * 计算整体状态
   * @returns 整体状态
   */
  private calculateOverallStatus(): 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused' {
    let hasRunning = false;
    let hasFailed = false;
    let hasCancelled = false;
    let hasPaused = false;
    let allCompleted = true;

    for (const state of this.nodeStates.values()) {
      switch (state.status) {
        case 'running':
          hasRunning = true;
          allCompleted = false;
          break;
        case 'failed':
          hasFailed = true;
          allCompleted = false;
          break;
        case 'cancelled':
          hasCancelled = true;
          allCompleted = false;
          break;
        case 'paused':
          hasPaused = true;
          allCompleted = false;
          break;
        case 'pending':
          allCompleted = false;
          break;
      }
    }

    if (hasCancelled) {
      return 'cancelled';
    } else if (hasPaused) {
      return 'paused';
    } else if (hasFailed) {
      return 'failed';
    } else if (hasRunning) {
      return 'running';
    } else if (allCompleted && this.nodeStates.size > 0) {
      return 'completed';
    } else {
      return 'pending';
    }
  }

  /**
   * 获取最早开始时间
   * @returns 最早开始时间
   */
  private getEarliestStartTime(): string {
    let earliestTime: Date | null = null;

    for (const state of this.nodeStates.values()) {
      if (state.startTime && (!earliestTime || state.startTime < earliestTime)) {
        earliestTime = state.startTime;
      }
    }

    return earliestTime?.toISOString() || new Date().toISOString();
  }

  /**
   * 获取最晚结束时间
   * @returns 最晚结束时间
   */
  private getLatestEndTime(): string | null {
    let latestTime: Date | null = null;

    for (const state of this.nodeStates.values()) {
      if (state.endTime && (!latestTime || state.endTime > latestTime)) {
        latestTime = state.endTime;
      }
    }

    return latestTime?.toISOString() || null;
  }

  /**
   * 计算总执行时间
   * @returns 总执行时间
   */
  private calculateTotalDuration(): number {
    const earliestTime = this.getEarliestStartTime();
    const latestTime = this.getLatestEndTime();

    if (!earliestTime || !latestTime) {
      return 0;
    }

    return new Date(latestTime).getTime() - new Date(earliestTime).getTime();
  }

  /**
   * 获取当前节点ID
   * @returns 当前节点ID
   */
  private getCurrentNodeId(): string | null {
    for (const [nodeId, state] of this.nodeStates.entries()) {
      if (state.status === 'running') {
        return nodeId;
      }
    }

    return null;
  }

  /**
   * 获取执行路径
   * @returns 执行路径
   */
  private getExecutionPath(): string[] {
    const path: string[] = [];

    for (const [nodeId, state] of this.nodeStates.entries()) {
      if (state.status === 'completed' || state.status === 'running') {
        path.push(nodeId);
      }
    }

    return path;
  }

  /**
   * 设置节点输入数据
   * @param nodeId 节点ID
   * @param inputData 输入数据
   */
  setNodeInputData(nodeId: ID, inputData: any): void {
    const nodeIdStr = nodeId.toString();
    const nodeState = this.nodeStates.get(nodeIdStr);

    if (nodeState) {
      nodeState.input = inputData;
    }
  }

  /**
   * 设置图实例
   * @param graph 图实例
   */
  setGraph(graph: Graph): void {
    this.graph = graph;
  }
}
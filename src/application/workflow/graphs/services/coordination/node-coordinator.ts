import { injectable, inject } from 'inversify';
import { Node } from '../../../../../domain/workflow/graph/entities/nodes';
import { Edge } from '../../../../../domain/workflow/graph/entities/edges';
import { Graph } from '../../../../../domain/workflow/graph/entities/graph';
import { GraphRepository, NodeRepository, EdgeRepository } from '../../../../../domain/workflow/graph/repositories/graph-repository';
import { INodeExecutor } from '../../../../../domain/workflow/graph/interfaces/node-executor.interface';
import { IEdgeEvaluator } from '../../../../../domain/workflow/graph/interfaces/edge-evaluator.interface';
import { ID } from '../../../../../domain/common/value-objects/id';
import { NodeExecutionResultValue } from '../../../../../domain/workflow/graph/value-objects/node-execution-result';
import { DomainError } from '../../../../../domain/common/errors/domain-error';
import { ILogger } from '@shared/types/logger';

// Coordination services
import { ExecutionQueueManager } from './execution-queue-manager';
import { NodeExecutionOrchestrator } from './node-execution-orchestrator';
import { DependencyResolver } from './dependency-resolver';

// DTOs
// Note: These DTOs may not exist yet, we'll need to create them or use alternatives

/**
 * 节点协调器
 * 
 * 负责协调节点的执行，管理节点间的依赖关系和执行顺序
 */
@injectable()
export class NodeCoordinator {
  constructor(
    @inject('GraphRepository') private readonly graphRepository: GraphRepository,
    @inject('NodeRepository') private readonly nodeRepository: NodeRepository,
    @inject('EdgeRepository') private readonly edgeRepository: EdgeRepository,
    @inject('NodeExecutorFactory') private readonly nodeExecutorFactory: (nodeType: string) => INodeExecutor,
    @inject('EdgeEvaluatorFactory') private readonly edgeEvaluatorFactory: (edgeType: string) => IEdgeEvaluator,
    @inject('ExecutionQueueManager') private readonly executionQueueManager: ExecutionQueueManager,
    @inject('NodeExecutionOrchestrator') private readonly nodeExecutionOrchestrator: NodeExecutionOrchestrator,
    @inject('DependencyResolver') private readonly dependencyResolver: DependencyResolver,
    @inject('Logger') private readonly logger: ILogger
  ) {}

  /**
   * 协调节点执行
   * @param graphId 图ID
   * @param startNodeId 起始节点ID
   * @param inputData 输入数据
   * @param executionContext 执行上下文
   * @returns 执行结果
   */
  async coordinateNodeExecution(
    graphId: ID,
    startNodeId: ID,
    inputData: any,
    executionContext: any
  ): Promise<{
    executionId: string;
    results: Map<string, NodeExecutionResultValue>;
    executionPath: string[];
    status: 'completed' | 'failed' | 'cancelled';
    error?: string;
  }> {
    try {
      this.logger.info('开始协调节点执行', {
        graphId: graphId.toString(),
        startNodeId: startNodeId.toString()
      });

      const graph = await this.graphRepository.findByIdOrFail(graphId);
      const executionId = `exec_${graphId.toString()}_${Date.now()}`;
      
      // 初始化执行队列管理器
      await this.executionQueueManager.initialize(graphId, startNodeId, inputData);
      
      // 初始化节点执行编排器
      await this.nodeExecutionOrchestrator.initialize(executionId, executionContext);
      
      // 执行节点协调
      const coordinationResult = await this.performCoordination(graph, executionId);
      
      this.logger.info('节点协调执行完成', {
        executionId,
        status: coordinationResult.status,
        completedNodes: coordinationResult.results.size,
        executionPathLength: coordinationResult.executionPath.length
      });

      return coordinationResult;
    } catch (error) {
      this.logger.error('节点协调执行失败', error as Error);
      throw error;
    }
  }

  /**
   * 执行节点协调
   * @param graph 图
   * @param executionId 执行ID
   * @returns 协调结果
   */
  private async performCoordination(
    graph: Graph,
    executionId: string
  ): Promise<{
    executionId: string;
    results: Map<string, NodeExecutionResultValue>;
    executionPath: string[];
    status: 'completed' | 'failed' | 'cancelled';
    error?: string;
  }> {
    const executionResults = new Map<string, NodeExecutionResultValue>();
    const executionPath: string[] = [];
    let status: 'completed' | 'failed' | 'cancelled' = 'completed';
    let error: string | undefined;

    try {
      // 主协调循环
      while (await this.executionQueueManager.hasPendingNodes()) {
        // 获取可执行的节点
        const executableNodes = await this.executionQueueManager.getExecutableNodes();
        
        if (executableNodes.length === 0) {
          // 检查是否有死锁
          if (await this.executionQueueManager.hasDeadlock()) {
            throw new DomainError('检测到执行死锁');
          }
          
          // 等待正在执行的节点完成
          await this.nodeExecutionOrchestrator.waitForRunningNodes();
          continue;
        }

        // 并行执行可执行的节点
        const batchResults = await this.nodeExecutionOrchestrator.executeBatch(
          executableNodes,
          this.nodeExecutorFactory
        );

        // 处理执行结果
        for (const [nodeId, result] of batchResults.entries()) {
          executionResults.set(nodeId, result);
          executionPath.push(nodeId);

          if (result.success) {
            // 更新队列管理器，标记节点为已完成
            await this.executionQueueManager.markNodeCompleted(
              ID.fromString(nodeId),
              result.value
            );
          } else {
            // 处理执行失败
            const shouldStop = await this.handleNodeFailure(
              ID.fromString(nodeId),
              result
            );
            
            if (shouldStop) {
              status = 'failed';
              error = `节点 ${nodeId} 执行失败: ${result.error?.message}`;
              break;
            }
          }
        }

        // 如果状态为失败，退出循环
        if (status === 'failed') {
          break;
        }
      }

      // 检查是否有正在执行的节点
      const runningNodes = await this.nodeExecutionOrchestrator.getRunningNodes();
      if (runningNodes.length > 0) {
        status = 'cancelled';
        error = '执行被取消，仍有节点在执行中';
        
        // 取消正在执行的节点
        await this.nodeExecutionOrchestrator.cancelAll();
      }

    } catch (err) {
      status = 'failed';
      error = (err as Error).message;
      
      // 取消所有正在执行的节点
      await this.nodeExecutionOrchestrator.cancelAll();
    }

    return {
      executionId,
      results: executionResults,
      executionPath,
      status,
      error
    };
  }

  /**
   * 处理节点执行失败
   * @param nodeId 节点ID
   * @param result 执行结果
   * @returns 是否应该停止执行
   */
  private async handleNodeFailure(
    nodeId: ID,
    result: NodeExecutionResultValue
  ): Promise<boolean> {
    const node = await this.nodeRepository.findById(nodeId);
    if (!node) {
      return true;
    }

    // 检查节点的错误处理策略
    const errorHandlingStrategy = (node.properties['errorHandlingStrategy'] as string) || 'stop';
    
    switch (errorHandlingStrategy) {
      case 'stop':
        return true;
      case 'continue':
        return false;
      case 'retry':
        // 简化实现，实际应该有重试逻辑
        return result.error?.name === 'CriticalError';
      default:
        return true;
    }
  }

  /**
   * 获取节点执行状态
   * @param graphId 图ID
   * @param nodeId 节点ID
   * @param executionId 执行ID
   * @returns 节点执行状态DTO
   */
  async getNodeExecutionStatus(
    graphId: string,
    nodeId: string,
    executionId: string
  ): Promise<any | null> {
    try {
      const graphIdObj = ID.fromString(graphId);
      const nodeIdObj = ID.fromString(nodeId);
      
      const graph = await this.graphRepository.findById(graphIdObj);
      if (!graph) {
        return null;
      }
      
      const node = graph.getNode(nodeIdObj);
      if (!node) {
        return null;
      }
      
      // 从节点执行编排器获取状态
      const executionStatus = await this.nodeExecutionOrchestrator.getNodeExecutionStatus(
        nodeIdObj,
        executionId
      );
      
      return executionStatus || {
        nodeId,
        graphId,
        executionId,
        status: 'pending',
        startTime: new Date().toISOString(),
        endTime: null,
        duration: 0,
        input: {},
        output: {},
        error: null,
        logs: [],
        metadata: {}
      };
    } catch (error) {
      this.logger.error('获取节点执行状态失败', error as Error);
      throw error;
    }
  }

  /**
   * 暂停节点执行
   * @param graphId 图ID
   * @param nodeId 节点ID
   * @param executionId 执行ID
   * @returns 是否成功暂停
   */
  async pauseNodeExecution(
    graphId: string,
    nodeId: string,
    executionId: string
  ): Promise<boolean> {
    try {
      this.logger.info('正在暂停节点执行', {
        graphId,
        nodeId,
        executionId
      });

      const nodeIdObj = ID.fromString(nodeId);
      const success = await this.nodeExecutionOrchestrator.pauseNodeExecution(
        nodeIdObj,
        executionId
      );
      
      if (success) {
        await this.executionQueueManager.pauseNode(nodeIdObj);
      }

      this.logger.info('节点执行暂停结果', {
        graphId,
        nodeId,
        executionId,
        success
      });

      return success;
    } catch (error) {
      this.logger.error('暂停节点执行失败', error as Error);
      throw error;
    }
  }

  /**
   * 恢复节点执行
   * @param graphId 图ID
   * @param nodeId 节点ID
   * @param executionId 执行ID
   * @returns 是否成功恢复
   */
  async resumeNodeExecution(
    graphId: string,
    nodeId: string,
    executionId: string
  ): Promise<boolean> {
    try {
      this.logger.info('正在恢复节点执行', {
        graphId,
        nodeId,
        executionId
      });

      const nodeIdObj = ID.fromString(nodeId);
      const success = await this.nodeExecutionOrchestrator.resumeNodeExecution(
        nodeIdObj,
        executionId
      );
      
      if (success) {
        await this.executionQueueManager.resumeNode(nodeIdObj);
      }

      this.logger.info('节点执行恢复结果', {
        graphId,
        nodeId,
        executionId,
        success
      });

      return success;
    } catch (error) {
      this.logger.error('恢复节点执行失败', error as Error);
      throw error;
    }
  }

  /**
   * 取消节点执行
   * @param graphId 图ID
   * @param nodeId 节点ID
   * @param executionId 执行ID
   * @returns 是否成功取消
   */
  async cancelNodeExecution(
    graphId: string,
    nodeId: string,
    executionId: string
  ): Promise<boolean> {
    try {
      this.logger.info('正在取消节点执行', {
        graphId,
        nodeId,
        executionId
      });

      const nodeIdObj = ID.fromString(nodeId);
      const success = await this.nodeExecutionOrchestrator.cancelNodeExecution(
        nodeIdObj,
        executionId
      );
      
      if (success) {
        await this.executionQueueManager.cancelNode(nodeIdObj);
      }

      this.logger.info('节点执行取消结果', {
        graphId,
        nodeId,
        executionId,
        success
      });

      return success;
    } catch (error) {
      this.logger.error('取消节点执行失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取图执行状态
   * @param graphId 图ID
   * @param executionId 执行ID
   * @returns 图执行状态DTO
   */
  async getGraphExecutionStatus(
    graphId: string,
    executionId: string
  ): Promise<any | null> {
    try {
      const graphIdObj = ID.fromString(graphId);
      const graph = await this.graphRepository.findById(graphIdObj);
      
      if (!graph) {
        return null;
      }
      
      // 从节点执行编排器获取整体执行状态
      const executionStatus = await this.nodeExecutionOrchestrator.getGraphExecutionStatus(
        graphIdObj,
        executionId
      );
      
      return executionStatus || {
        graphId,
        executionId,
        status: 'pending',
        startTime: new Date().toISOString(),
        endTime: null,
        duration: 0,
        currentNodeId: null,
        executedNodes: 0,
        totalNodes: graph.getNodeCount(),
        executedEdges: 0,
        totalEdges: graph.getEdgeCount(),
        executionPath: [],
        nodeStatuses: {},
        output: {},
        error: null,
        statistics: {
          averageNodeExecutionTime: 0,
          maxNodeExecutionTime: 0,
          minNodeExecutionTime: 0,
          successRate: 0
        }
      };
    } catch (error) {
      this.logger.error('获取图执行状态失败', error as Error);
      throw error;
    }
  }
}
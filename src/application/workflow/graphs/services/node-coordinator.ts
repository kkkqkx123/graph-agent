import { injectable, inject } from 'inversify';
import { Node } from '../../../../domain/workflow/graph/entities/nodes';
import { Edge } from '../../../../domain/workflow/graph/entities/edges';
import { Graph } from '../../../../domain/workflow/graph/entities/graph';
import { GraphRepository, NodeRepository, EdgeRepository } from '../../../../domain/workflow/graph/repositories/graph-repository';
import { INodeExecutor } from '../../../../domain/workflow/graph/interfaces/node-executor.interface';
import { IEdgeEvaluator } from '../../../../domain/workflow/graph/interfaces/edge-evaluator.interface';
import { ID } from '../../../../domain/common/value-objects/id';
import { NodeId } from '../../../../domain/workflow/graph/value-objects/node-id';
import { EdgeId } from '../../../../domain/workflow/graph/value-objects/edge-id';
import { NodeExecutionResult } from '../../../../domain/workflow/graph/value-objects/node-execution-result';
import { DomainError } from '../../../../domain/common/errors/domain-error';
import { ILogger } from '@shared/types/logger';

// DTOs
import {
  NodeDto,
  NodeExecutionStatusDto,
  EdgeDto,
  GraphExecutionStatusDto
} from '../dtos/graph.dto';

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
    results: Map<string, NodeExecutionResult>;
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
      
      // 初始化执行状态
      const executionResults = new Map<string, NodeExecutionResult>();
      const executionPath: string[] = [];
      const visitedNodes = new Set<string>();
      const executingNodes = new Set<string>();
      const completedNodes = new Set<string>();
      const failedNodes = new Set<string>();

      // 获取起始节点
      const startNode = graph.getNode(startNodeId);
      if (!startNode) {
        throw new DomainError(`起始节点不存在: ${startNodeId.toString()}`);
      }

      // 初始化执行队列
      const executionQueue: Array<{
        node: Node;
        inputData: any;
        predecessors: string[];
      }> = [];

      executionQueue.push({
        node: startNode,
        inputData,
        predecessors: []
      });

      // 执行节点
      while (executionQueue.length > 0) {
        const { node, inputData: nodeInputData, predecessors } = executionQueue.shift()!;
        const nodeId = node.nodeId.toString();

        // 检查节点是否已执行
        if (visitedNodes.has(nodeId)) {
          continue;
        }

        // 检查前置条件是否满足
        if (!this.arePredecessorsCompleted(predecessors, completedNodes)) {
          // 将节点重新加入队列，等待前置节点完成
          executionQueue.push({ node, inputData: nodeInputData, predecessors });
          continue;
        }

        // 标记节点为正在执行
        visitedNodes.add(nodeId);
        executingNodes.add(nodeId);
        executionPath.push(nodeId);

        // 执行节点
        const nodeExecutor = this.nodeExecutorFactory(node.type.toString());
        const executionResult = await this.executeNode(
          node,
          nodeExecutor,
          nodeInputData,
          executionContext
        );

        // 记录执行结果
        executionResults.set(nodeId, executionResult);
        executingNodes.delete(nodeId);

        // 处理执行结果
        if (executionResult.success) {
          completedNodes.add(nodeId);
          this.logger.info('节点执行成功', {
            nodeId,
            executionId,
            duration: executionResult.duration
          });

          // 获取后续节点并加入执行队列
          const nextNodes = await this.getNextNodes(graph, node, executionResult.output);
          for (const nextNode of nextNodes) {
            const predecessors = this.getPredecessorIds(graph, nextNode);
            executionQueue.push({
              node: nextNode,
              inputData: executionResult.output,
              predecessors
            });
          }
        } else {
          failedNodes.add(nodeId);
          this.logger.error('节点执行失败', {
            nodeId,
            executionId,
            error: executionResult.error?.message
          });

          // 根据错误处理策略决定是否继续执行
          if (this.shouldStopOnFailure(node, executionResult)) {
            break;
          }
        }
      }

      // 确定最终执行状态
      let status: 'completed' | 'failed' | 'cancelled' = 'completed';
      let error: string | undefined;

      if (failedNodes.size > 0) {
        status = 'failed';
        error = `以下节点执行失败: ${Array.from(failedNodes).join(', ')}`;
      } else if (executingNodes.size > 0) {
        status = 'cancelled';
        error = '执行被取消，仍有节点在执行中';
      }

      this.logger.info('节点协调执行完成', {
        executionId,
        status,
        completedNodes: completedNodes.size,
        failedNodes: failedNodes.size,
        executionPathLength: executionPath.length
      });

      return {
        executionId,
        results: executionResults,
        executionPath,
        status,
        error
      };
    } catch (error) {
      this.logger.error('节点协调执行失败', error as Error);
      throw error;
    }
  }

  /**
   * 获取节点的下一个可执行节点
   * @param graph 图
   * @param currentNode 当前节点
   * @param nodeOutput 节点输出
   * @returns 下一个可执行节点列表
   */
  async getNextNodes(
    graph: Graph,
    currentNode: Node,
    nodeOutput: any
  ): Promise<Node[]> {
    const nextNodes: Node[] = [];
    
    // 获取从当前节点出发的所有边
    const outgoingEdges = graph.getOutgoingEdges(currentNode.nodeId);
    
    for (const edge of outgoingEdges) {
      // 评估边的条件
      const edgeEvaluator = this.edgeEvaluatorFactory(edge.type.toString());
      const canTraverse = await edgeEvaluator.evaluate(edge, nodeOutput);
      
      if (canTraverse) {
        // 获取目标节点
        const targetNode = graph.getNode(edge.toNodeId);
        if (targetNode) {
          nextNodes.push(targetNode);
        }
      }
    }
    
    return nextNodes;
  }

  /**
   * 获取节点的前置节点ID列表
   * @param graph 图
   * @param node 节点
   * @returns 前置节点ID列表
   */
  private getPredecessorIds(graph: Graph, node: Node): string[] {
    const incomingEdges = graph.getIncomingEdges(node.nodeId);
    return incomingEdges.map(edge => edge.fromNodeId.toString());
  }

  /**
   * 检查前置节点是否都已完成
   * @param predecessors 前置节点ID列表
   * @param completedNodes 已完成节点集合
   * @returns 是否所有前置节点都已完成
   */
  private arePredecessorsCompleted(
    predecessors: string[],
    completedNodes: Set<string>
  ): boolean {
    return predecessors.every(predecessorId => completedNodes.has(predecessorId));
  }

  /**
   * 执行单个节点
   * @param node 节点
   * @param executor 节点执行器
   * @param inputData 输入数据
   * @param executionContext 执行上下文
   * @returns 执行结果
   */
  private async executeNode(
    node: Node,
    executor: INodeExecutor,
    inputData: any,
    executionContext: any
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('开始执行节点', {
        nodeId: node.nodeId.toString(),
        nodeType: node.type.toString()
      });

      // 准备执行上下文
      const nodeExecutionContext = {
        ...executionContext,
        nodeId: node.nodeId.toString(),
        nodeType: node.type.toString(),
        nodeProperties: node.properties,
        startTime: new Date()
      };

      // 执行节点
      const output = await executor.execute(node, inputData, nodeExecutionContext);
      
      const duration = Date.now() - startTime;
      
      this.logger.debug('节点执行成功', {
        nodeId: node.nodeId.toString(),
        duration
      });

      return NodeExecutionResult.success(
        node.nodeId,
        output,
        duration,
        nodeExecutionContext
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error('节点执行失败', {
        nodeId: node.nodeId.toString(),
        error: (error as Error).message,
        duration
      });

      return NodeExecutionResult.failure(
        node.nodeId,
        error as Error,
        duration,
        executionContext
      );
    }
  }

  /**
   * 判断是否应该在节点失败时停止执行
   * @param node 节点
   * @param executionResult 执行结果
   * @returns 是否应该停止执行
   */
  private shouldStopOnFailure(
    node: Node,
    executionResult: NodeExecutionResult
  ): boolean {
    // 检查节点的错误处理策略
    const errorHandlingStrategy = node.properties.errorHandlingStrategy || 'stop';
    
    switch (errorHandlingStrategy) {
      case 'stop':
        return true;
      case 'continue':
        return false;
      case 'retry':
        // 简化实现，实际应该有重试逻辑
        return executionResult.error?.name === 'CriticalError';
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
  ): Promise<NodeExecutionStatusDto | null> {
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
      
      // 简化实现，实际应该从执行状态存储中获取
      return {
        nodeId,
        graphId,
        executionId,
        status: 'completed',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: 1000,
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

      // 简化实现，实际应该向执行器发送暂停信号
      // 这里只是记录日志
      
      this.logger.info('节点执行暂停成功', {
        graphId,
        nodeId,
        executionId
      });

      return true;
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

      // 简化实现，实际应该向执行器发送恢复信号
      // 这里只是记录日志
      
      this.logger.info('节点执行恢复成功', {
        graphId,
        nodeId,
        executionId
      });

      return true;
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

      // 简化实现，实际应该向执行器发送取消信号
      // 这里只是记录日志
      
      this.logger.info('节点执行取消成功', {
        graphId,
        nodeId,
        executionId
      });

      return true;
    } catch (error) {
      this.logger.error('取消节点执行失败', error as Error);
      throw error;
    }
  }
}
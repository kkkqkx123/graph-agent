import { injectable, inject } from 'inversify';
import { Graph } from '../../../../../domain/workflow/graph/entities/graph';
import { Node } from '../../../../../domain/workflow/graph/entities/nodes';
import { Edge } from '../../../../../domain/workflow/graph/entities/edges';
import { ID } from '../../../../../domain/common/value-objects/id';
import { IEdgeEvaluator } from '../../../../../domain/workflow/graph/interfaces/edge-evaluator.interface';
import { DomainError } from '../../../../../domain/common/errors/domain-error';
import { ILogger } from '@shared/types/logger';

/**
 * 执行队列项
 */
interface QueueItem {
  node: Node;
  inputData: any;
  predecessors: string[];
  priority: number;
  status: 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
  enqueuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  maxRetries: number;
}

/**
 * 执行队列管理器
 * 
 * 负责管理节点执行队列，处理节点间的依赖关系
 */
@injectable()
export class ExecutionQueueManager {
  private graph: Graph | null = null;
  private startNodeId: ID | null = null;
  private initialInputData: any = null;
  private queue: Map<string, QueueItem> = new Map();
  private completedNodes: Set<string> = new Set();
  private failedNodes: Set<string> = new Set();
  private runningNodes: Set<string> = new Set();
  private pausedNodes: Set<string> = new Set();
  private cancelledNodes: Set<string> = new Set();

  constructor(
    @inject('EdgeEvaluatorFactory') private readonly edgeEvaluatorFactory: (edgeType: string) => IEdgeEvaluator,
    @inject('Logger') private readonly logger: ILogger
  ) {}

  /**
   * 初始化队列管理器
   * @param graphId 图ID
   * @param startNodeId 起始节点ID
   * @param inputData 输入数据
   */
  async initialize(
    graphId: ID,
    startNodeId: ID,
    inputData: any
  ): Promise<void> {
    this.logger.debug('正在初始化执行队列管理器', {
      graphId: graphId.toString(),
      startNodeId: startNodeId.toString()
    });

    // 这里应该从repository获取图，简化实现
    // this.graph = await this.graphRepository.findByIdOrFail(graphId);
    
    // 重置状态
    this.queue.clear();
    this.completedNodes.clear();
    this.failedNodes.clear();
    this.runningNodes.clear();
    this.pausedNodes.clear();
    this.cancelledNodes.clear();
    
    this.startNodeId = startNodeId;
    this.initialInputData = inputData;
    
    // 初始化队列
    await this.initializeQueue();
    
    this.logger.debug('执行队列管理器初始化完成', {
      graphId: graphId.toString(),
      queueSize: this.queue.size
    });
  }

  /**
   * 初始化队列
   */
  private async initializeQueue(): Promise<void> {
    if (!this.graph || !this.startNodeId) {
      throw new DomainError('图或起始节点未初始化');
    }

    // 获取起始节点
    const startNode = this.graph.getNode(this.startNodeId);
    if (!startNode) {
      throw new DomainError(`起始节点不存在: ${this.startNodeId.toString()}`);
    }

    // 添加起始节点到队列
    this.addToQueue(startNode, this.initialInputData, [], 0);
    
    // 预处理所有节点，计算前置条件
    await this.preprocessNodes();
  }

  /**
   * 预处理所有节点
   */
  private async preprocessNodes(): Promise<void> {
    if (!this.graph) {
      return;
    }

    // 为每个节点计算前置条件
    for (const node of this.graph.nodes.values()) {
      if (node.nodeId.equals(this.startNodeId!)) {
        continue; // 起始节点已经处理
      }

      const predecessors = this.getPredecessorIds(node);
      const priority = this.calculateNodePriority(node);
      
      this.addToQueue(node, null, predecessors, priority);
    }
  }

  /**
   * 添加节点到队列
   * @param node 节点
   * @param inputData 输入数据
   * @param predecessors 前置节点ID列表
   * @param priority 优先级
   */
  private addToQueue(
    node: Node,
    inputData: any,
    predecessors: string[],
    priority: number
  ): void {
    const queueItem: QueueItem = {
      node,
      inputData,
      predecessors,
      priority,
      status: 'pending',
      enqueuedAt: new Date(),
      retryCount: 0,
      maxRetries: (node.properties['maxRetries'] as number) || 3
    };

    this.queue.set(node.nodeId.toString(), queueItem);
  }

  /**
   * 获取节点的前置节点ID列表
   * @param node 节点
   * @returns 前置节点ID列表
   */
  private getPredecessorIds(node: Node): string[] {
    if (!this.graph) {
      return [];
    }

    const incomingEdges = this.graph.getIncomingEdges(node.nodeId);
    return incomingEdges.map(edge => edge.fromNodeId.toString());
  }

  /**
   * 计算节点优先级
   * @param node 节点
   * @returns 优先级
   */
  private calculateNodePriority(node: Node): number {
    // 基于节点类型和属性计算优先级
    const typePriorities: Record<string, number> = {
      'condition': 10,
      'llm': 5,
      'tool': 3,
      'data': 2,
      'wait': 1
    };
    
    const basePriority = typePriorities[node.type.toString()] || 0;
    const customPriority = (node.properties['priority'] as number) || 0;
    
    return basePriority + customPriority;
  }

  /**
   * 检查是否有待执行的节点
   * @returns 是否有待执行的节点
   */
  async hasPendingNodes(): Promise<boolean> {
    // 检查是否有状态为pending或ready的节点
    for (const queueItem of this.queue.values()) {
      if (queueItem.status === 'pending' || queueItem.status === 'ready') {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 获取可执行的节点
   * @returns 可执行的节点列表
   */
  async getExecutableNodes(): Promise<Node[]> {
    const executableNodes: Node[] = [];
    
    for (const queueItem of this.queue.values()) {
      if (queueItem.status === 'pending') {
        // 检查前置条件是否满足
        if (this.arePredecessorsCompleted(queueItem.predecessors)) {
          queueItem.status = 'ready';
          executableNodes.push(queueItem.node);
        }
      }
    }
    
    // 按优先级排序
    executableNodes.sort((a, b) => {
      const queueItemA = this.queue.get(a.nodeId.toString())!;
      const queueItemB = this.queue.get(b.nodeId.toString())!;
      return queueItemB.priority - queueItemA.priority;
    });
    
    return executableNodes;
  }

  /**
   * 检查前置节点是否都已完成
   * @param predecessors 前置节点ID列表
   * @returns 是否所有前置节点都已完成
   */
  private arePredecessorsCompleted(predecessors: string[]): boolean {
    return predecessors.every(predecessorId => this.completedNodes.has(predecessorId));
  }

  /**
   * 标记节点为已完成
   * @param nodeId 节点ID
   * @param output 输出数据
   */
  async markNodeCompleted(nodeId: ID, output: any): Promise<void> {
    const nodeIdStr = nodeId.toString();
    const queueItem = this.queue.get(nodeIdStr);
    
    if (!queueItem) {
      throw new DomainError(`节点不在队列中: ${nodeIdStr}`);
    }
    
    queueItem.status = 'completed';
    queueItem.completedAt = new Date();
    queueItem.inputData = output; // 保存输出数据供后续节点使用
    
    this.completedNodes.add(nodeIdStr);
    this.runningNodes.delete(nodeIdStr);
    
    this.logger.debug('节点标记为已完成', {
      nodeId: nodeIdStr,
      duration: queueItem.completedAt.getTime() - queueItem.startedAt!.getTime()
    });
  }

  /**
   * 标记节点为运行中
   * @param nodeId 节点ID
   */
  async markNodeRunning(nodeId: ID): Promise<void> {
    const nodeIdStr = nodeId.toString();
    const queueItem = this.queue.get(nodeIdStr);
    
    if (!queueItem) {
      throw new DomainError(`节点不在队列中: ${nodeIdStr}`);
    }
    
    queueItem.status = 'running';
    queueItem.startedAt = new Date();
    
    this.runningNodes.add(nodeIdStr);
    
    this.logger.debug('节点标记为运行中', { nodeId: nodeIdStr });
  }

  /**
   * 标记节点为失败
   * @param nodeId 节点ID
   * @param error 错误信息
   */
  async markNodeFailed(nodeId: ID, error: Error): Promise<void> {
    const nodeIdStr = nodeId.toString();
    const queueItem = this.queue.get(nodeIdStr);
    
    if (!queueItem) {
      throw new DomainError(`节点不在队列中: ${nodeIdStr}`);
    }
    
    queueItem.retryCount++;
    
    if (queueItem.retryCount < queueItem.maxRetries) {
      // 重试
      queueItem.status = 'pending';
      this.logger.debug('节点准备重试', {
        nodeId: nodeIdStr,
        retryCount: queueItem.retryCount,
        maxRetries: queueItem.maxRetries
      });
    } else {
      // 失败
      queueItem.status = 'failed';
      this.failedNodes.add(nodeIdStr);
      this.runningNodes.delete(nodeIdStr);
      
      this.logger.error('节点执行失败', error, {
        nodeId: nodeIdStr,
        retryCount: queueItem.retryCount
      });
    }
  }

  /**
   * 暂停节点
   * @param nodeId 节点ID
   */
  async pauseNode(nodeId: ID): Promise<void> {
    const nodeIdStr = nodeId.toString();
    const queueItem = this.queue.get(nodeIdStr);
    
    if (!queueItem) {
      throw new DomainError(`节点不在队列中: ${nodeIdStr}`);
    }
    
    if (queueItem.status === 'running') {
      queueItem.status = 'paused';
      this.runningNodes.delete(nodeIdStr);
      this.pausedNodes.add(nodeIdStr);
      
      this.logger.debug('节点已暂停', { nodeId: nodeIdStr });
    }
  }

  /**
   * 恢复节点
   * @param nodeId 节点ID
   */
  async resumeNode(nodeId: ID): Promise<void> {
    const nodeIdStr = nodeId.toString();
    const queueItem = this.queue.get(nodeIdStr);
    
    if (!queueItem) {
      throw new DomainError(`节点不在队列中: ${nodeIdStr}`);
    }
    
    if (queueItem.status === 'paused') {
      queueItem.status = 'ready';
      this.pausedNodes.delete(nodeIdStr);
      
      this.logger.debug('节点已恢复', { nodeId: nodeIdStr });
    }
  }

  /**
   * 取消节点
   * @param nodeId 节点ID
   */
  async cancelNode(nodeId: ID): Promise<void> {
    const nodeIdStr = nodeId.toString();
    const queueItem = this.queue.get(nodeIdStr);
    
    if (!queueItem) {
      throw new DomainError(`节点不在队列中: ${nodeIdStr}`);
    }
    
    queueItem.status = 'cancelled';
    this.cancelledNodes.add(nodeIdStr);
    this.runningNodes.delete(nodeIdStr);
    this.pausedNodes.delete(nodeIdStr);
    
    this.logger.debug('节点已取消', { nodeId: nodeIdStr });
  }

  /**
   * 检查是否有死锁
   * @returns 是否有死锁
   */
  async hasDeadlock(): Promise<boolean> {
    // 简化实现：检查是否有节点在运行但没有可执行的节点
    if (this.runningNodes.size === 0) {
      return false;
    }
    
    // 检查是否有pending状态的节点
    const hasPendingNodes = await this.hasPendingNodes();
    
    // 如果有运行中的节点但没有待执行的节点，可能存在死锁
    return !hasPendingNodes;
  }

  /**
   * 获取队列状态
   * @returns 队列状态
   */
  getQueueStatus(): {
    total: number;
    pending: number;
    ready: number;
    running: number;
    completed: number;
    failed: number;
    paused: number;
    cancelled: number;
  } {
    let pending = 0;
    let ready = 0;
    let running = 0;
    let completed = 0;
    let failed = 0;
    let paused = 0;
    let cancelled = 0;
    
    for (const queueItem of this.queue.values()) {
      switch (queueItem.status) {
        case 'pending':
          pending++;
          break;
        case 'ready':
          ready++;
          break;
        case 'running':
          running++;
          break;
        case 'completed':
          completed++;
          break;
        case 'failed':
          failed++;
          break;
        case 'paused':
          paused++;
          break;
        case 'cancelled':
          cancelled++;
          break;
      }
    }
    
    return {
      total: this.queue.size,
      pending,
      ready,
      running,
      completed,
      failed,
      paused,
      cancelled
    };
  }

  /**
   * 获取节点的输入数据
   * @param nodeId 节点ID
   * @returns 输入数据
   */
  getNodeInputData(nodeId: ID): any {
    const nodeIdStr = nodeId.toString();
    const queueItem = this.queue.get(nodeIdStr);
    
    if (!queueItem) {
      throw new DomainError(`节点不在队列中: ${nodeIdStr}`);
    }
    
    return queueItem.inputData;
  }

  /**
   * 设置节点的输入数据
   * @param nodeId 节点ID
   * @param inputData 输入数据
   */
  setNodeInputData(nodeId: ID, inputData: any): void {
    const nodeIdStr = nodeId.toString();
    const queueItem = this.queue.get(nodeIdStr);
    
    if (!queueItem) {
      throw new DomainError(`节点不在队列中: ${nodeIdStr}`);
    }
    
    queueItem.inputData = inputData;
  }
}
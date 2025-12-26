/**
 * 工作流执行引擎实现
 * 
 * 本文件实现了图工作流的执行引擎
 */

import {
  WorkflowStatus,
  ExecutionResult,
  ExecutionHistory,
  Node,
  Edge,
  Trigger,
  WorkflowGraph as WorkflowGraphInterface,
  WorkflowEngine as WorkflowEngineInterface,
  ExecutionContext,
  NodeOutput,
  NodeStatus,
  ExecutionStrategy
} from '../types/workflow-types';

import { createExecutionContext, generateExecutionId, ExecutionContextImpl } from './execution-context';
import { getNodeFunction } from '../functions/nodes/node-functions';

// ============================================================================
// 工作流图实现
// ============================================================================

/**
 * 工作流图类
 */
export class WorkflowGraphImpl implements WorkflowGraphInterface {
  private _nodes: Map<string, Node>;
  private _edges: Map<string, Edge>;
  private _triggers: Trigger[];
  private _id: string;

  constructor(id: string) {
    this._id = id;
    this._nodes = new Map();
    this._edges = new Map();
    this._triggers = [];
  }

  /**
   * 获取工作流ID
   */
  get id(): string {
    return this._id;
  }

  /**
   * 获取所有节点
   */
  get nodes(): Map<string, Node> {
    return new Map(this._nodes);
  }

  /**
   * 获取所有边
   */
  get edges(): Map<string, Edge> {
    return new Map(this._edges);
  }

  /**
   * 获取所有触发器
   */
  get triggers(): Trigger[] {
    return [...this._triggers];
  }

  /**
   * 添加节点
   */
  addNode(node: Node): void {
    this._nodes.set(node.id.toString(), node);
  }

  /**
   * 添加边
   */
  addEdge(edge: Edge): void {
    this._edges.set(edge.id.toString(), edge);
  }

  /**
   * 添加触发器
   */
  addTrigger(trigger: Trigger): void {
    this._triggers.push(trigger);
  }

  /**
   * 获取节点
   */
  getNode(nodeId: string): Node | undefined {
    return this._nodes.get(nodeId);
  }

  /**
   * 获取从指定节点出发的所有边
   */
  getEdgesFrom(nodeId: string): Edge[] {
    const result: Edge[] = [];
    for (const edge of this._edges.values()) {
      if (edge.fromNodeId === nodeId) {
        result.push(edge);
      }
    }
    // 按权重排序
    return result.sort((a, b) => b.weight - a.weight);
  }

  /**
   * 获取到达指定节点的所有边
   */
  getEdgesTo(nodeId: string): Edge[] {
    const result: Edge[] = [];
    for (const edge of this._edges.values()) {
      if (edge.toNodeId === nodeId) {
        result.push(edge);
      }
    }
    return result;
  }

  /**
   * 获取就绪节点
   * 就绪节点是指所有前置节点都已执行的节点
   */
  getReadyNodes(executedNodes: Set<string>): Node[] {
    const readyNodes: Node[] = [];

    for (const [nodeId, node] of this._nodes.entries()) {
      // 如果已经执行过，跳过
      if (executedNodes.has(nodeId)) {
        continue;
      }

      // 获取所有入边
      const incomingEdges = this.getEdgesTo(nodeId);

      // 如果没有入边，说明是起始节点，可以执行
      if (incomingEdges.length === 0) {
        readyNodes.push(node);
        continue;
      }

      // 检查所有前置节点是否都已执行
      let allPredecessorsExecuted = true;
      for (const edge of incomingEdges) {
        if (!executedNodes.has(edge.fromNodeId)) {
          allPredecessorsExecuted = false;
          break;
        }
      }

      if (allPredecessorsExecuted) {
        readyNodes.push(node);
      }
    }

    return readyNodes;
  }

  /**
   * 拓扑排序
   * 返回节点的执行顺序
   */
  getTopologicalOrder(): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const tempVisited = new Set<string>();

    const visit = (nodeId: string): void => {
      if (tempVisited.has(nodeId)) {
        throw new Error(`检测到循环依赖: ${nodeId}`);
      }
      if (visited.has(nodeId)) {
        return;
      }

      tempVisited.add(nodeId);

      // 先访问所有后继节点
      const outgoingEdges = this.getEdgesFrom(nodeId);
      for (const edge of outgoingEdges) {
        visit(edge.toNodeId);
      }

      tempVisited.delete(nodeId);
      visited.add(nodeId);
      order.push(nodeId);
    };

    // 访问所有节点
    for (const nodeId of this._nodes.keys()) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }

    // 反转顺序，得到从前往后的执行顺序
    return order.reverse();
  }

  /**
   * 检测循环依赖
   */
  hasCycle(): boolean {
    try {
      this.getTopologicalOrder();
      return false;
    } catch (error) {
      return true;
    }
  }
}

/**
 * 创建工作流图
 */
export function createWorkflowGraph(id: string): WorkflowGraphImpl {
  return new WorkflowGraphImpl(id);
}

// ============================================================================
// 工作流执行引擎
// ============================================================================

/**
 * 工作流执行引擎类
 */
export class WorkflowEngineImpl implements WorkflowEngineInterface {
  private _status: WorkflowStatus;
  private _currentNode: Node | undefined;
  private _executionHistory: ExecutionHistory[];
  private _context: ExecutionContextImpl | undefined;
  private _workflow: WorkflowGraphImpl | undefined;
  private _strategy: ExecutionStrategy;
  private _paused: boolean;
  private _stopped: boolean;

  constructor(strategy: ExecutionStrategy = ExecutionStrategy.SEQUENTIAL) {
    this._status = WorkflowStatus.PENDING;
    this._currentNode = undefined;
    this._executionHistory = [];
    this._strategy = strategy;
    this._paused = false;
    this._stopped = false;
  }

  /**
   * 获取工作流状态
   */
  getStatus(): WorkflowStatus {
    return this._status;
  }

  /**
   * 获取当前节点
   */
  getCurrentNode(): Node | undefined {
    return this._currentNode;
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(): ExecutionHistory[] {
    return [...this._executionHistory];
  }

  /**
   * 设置执行策略
   */
  setStrategy(strategy: ExecutionStrategy): void {
    this._strategy = strategy;
  }

  /**
   * 暂停执行
   */
  pause(): void {
    if (this._status === WorkflowStatus.RUNNING) {
      this._paused = true;
      console.log('工作流已暂停');
    }
  }

  /**
   * 恢复执行
   */
  resume(): void {
    if (this._paused) {
      this._paused = false;
      console.log('工作流已恢复');
    }
  }

  /**
   * 停止执行
   */
  stop(): void {
    this._stopped = true;
    this._status = WorkflowStatus.CANCELLED;
    console.log('工作流已停止');
  }

  /**
   * 执行工作流
   */
  async execute(workflow: WorkflowGraphInterface, input: any): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // 初始化
      this._workflow = workflow as WorkflowGraphImpl;
      this._status = WorkflowStatus.RUNNING;
      this._executionHistory = [];
      this._paused = false;
      this._stopped = false;

      // 创建执行上下文
      const executionId = generateExecutionId();
      this._context = createExecutionContext(workflow.id.toString(), executionId);

      // 设置输入
      this._context.setVariable('input', input);

      console.log(`开始执行工作流: ${workflow.id.toString()}, 执行ID: ${executionId}`);

      // 检查循环依赖
      if (workflow.hasCycle()) {
        throw new Error('工作流图中存在循环依赖');
      }

      // 执行工作流
      const result = await this.executeWorkflow();

      // 计算执行时间
      const executionTime = Date.now() - startTime;

      // 收集元数据
      const executedNodes: string[] = [];
      const skippedNodes: string[] = [];
      const failedNodes: string[] = [];

      for (const history of this._executionHistory) {
        if (history.status === NodeStatus.COMPLETED) {
          executedNodes.push(history.nodeId);
        } else if (history.status === NodeStatus.SKIPPED) {
          skippedNodes.push(history.nodeId);
        } else if (history.status === NodeStatus.FAILED) {
          failedNodes.push(history.nodeId);
        }
      }

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        metadata: {
          executionTime,
          executedNodes,
          skippedNodes,
          failedNodes
        }
      };
    } catch (error) {
      this._status = WorkflowStatus.FAILED;
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
          executedNodes: [],
          skippedNodes: [],
          failedNodes: []
        }
      };
    }
  }

  /**
   * 执行工作流主逻辑
   */
  private async executeWorkflow(): Promise<ExecutionResult> {
    if (!this._workflow || !this._context) {
      throw new Error('工作流或上下文未初始化');
    }

    const executedNodes = new Set<string>();
    let finalResult: any = undefined;
    let finalError: string | undefined = undefined;

    // 持续执行直到没有就绪节点
    while (true) {
      // 检查是否停止
      if (this._stopped) {
        break;
      }

      // 检查是否暂停
      if (this._paused) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      // 获取就绪节点
      const readyNodes = this._workflow.getReadyNodes(executedNodes);

      // 如果没有就绪节点，执行完成
      if (readyNodes.length === 0) {
        break;
      }

      // 根据策略执行节点
      if (this._strategy === ExecutionStrategy.SEQUENTIAL) {
        // 串行执行
        for (const node of readyNodes) {
          const result = await this.executeNode(node);
          if (result.success) {
            executedNodes.add(node.id.toString());
            // 如果是结束节点，保存结果
            if (node.type.toString() === 'end') {
              finalResult = result.data;
            }
          } else {
            finalError = result.error;
            // 节点执行失败，停止执行
            this._status = WorkflowStatus.FAILED;
            break;
          }
        }
      } else {
        // 并行执行
        const promises = readyNodes.map(node => this.executeNode(node));
        const results = await Promise.all(promises);

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const node = readyNodes[i];

          if (result && result.success && node) {
            executedNodes.add(node.id.toString());
            if (node.type.toString() === 'end') {
              finalResult = result.data;
            }
          } else if (result) {
            finalError = result.error;
            this._status = WorkflowStatus.FAILED;
          }
        }
      }

      // 如果执行失败，停止
      if (this._status === WorkflowStatus.FAILED) {
        break;
      }
    }

    // 更新最终状态
    if (this._status !== WorkflowStatus.FAILED && this._status !== WorkflowStatus.CANCELLED) {
      this._status = WorkflowStatus.COMPLETED;
    }

    return {
      success: this._status === WorkflowStatus.COMPLETED,
      data: finalResult,
      error: finalError
    };
  }

  /**
   * 执行单个节点
   */
  private async executeNode(node: Node): Promise<NodeOutput> {
    if (!this._context) {
      throw new Error('上下文未初始化');
    }

    const startTime = Date.now();
    this._currentNode = node;
    node.updateStatus(NodeStatus.RUNNING);

    console.log(`执行节点: ${node.id.toString()} (${node.name})`);

    try {
      // 检查触发器
      const shouldSkip = await this.checkTriggers(node);
      if (shouldSkip) {
        node.updateStatus(NodeStatus.SKIPPED);
        this._executionHistory.push({
          nodeId: node.id.toString(),
          status: NodeStatus.SKIPPED,
          startTime,
          endTime: Date.now()
        });
        return {
          success: true,
          data: { skipped: true },
          metadata: { skipped: true }
        };
      }

      // 获取节点函数
      const nodeFunction = getNodeFunction(node.type.toString());
      if (!nodeFunction) {
        throw new Error(`未找到节点类型 ${node.type.toString()} 的执行函数`);
      }

      // 准备输入
      const input = this.prepareNodeInput(node);

      // 执行节点函数
      const output = await nodeFunction(input, node.config, this._context);

      // 保存节点结果到上下文
      this._context.setNodeResult(node.id.toString(), output);

      // 更新节点状态
      if (output.success) {
        node.updateStatus(NodeStatus.COMPLETED);
      } else {
        node.updateStatus(NodeStatus.FAILED);
      }

      // 记录执行历史
      this._executionHistory.push({
        nodeId: node.id.toString(),
        status: node.status,
        startTime,
        endTime: Date.now(),
        output,
        error: output.error
      });

      console.log(`节点 ${node.id.toString()} 执行完成: ${output.success ? '成功' : '失败'}`);

      return output;
    } catch (error) {
      node.updateStatus(NodeStatus.FAILED);
      const errorMessage = error instanceof Error ? error.message : String(error);

      this._executionHistory.push({
        nodeId: node.id.toString(),
        status: NodeStatus.FAILED,
        startTime,
        endTime: Date.now(),
        error: errorMessage
      });

      console.error(`节点 ${node.id.toString()} 执行失败:`, errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 检查触发器
   */
  private async checkTriggers(node: Node): Promise<boolean> {
    if (!this._workflow || !this._context) {
      return false;
    }

    for (const trigger of this._workflow.triggers) {
      // 检查是否是针对当前节点的触发器
      if (trigger.targetNodeId && trigger.targetNodeId.toString() !== node.id.toString()) {
        continue;
      }

      // 评估触发器
      const shouldTrigger = await trigger.evaluate(this._context);
      if (shouldTrigger) {
        console.log(`触发器 ${trigger.id.toString()} 被触发`);
        await trigger.executeAction(this);
        return true;
      }
    }

    return false;
  }

  /**
   * 准备节点输入
   */
  private prepareNodeInput(node: Node): any {
    if (!this._context) {
      return {};
    }

    // 根据节点类型准备不同的输入
    switch (node.type.toString()) {
      case 'start':
        return this._context.getVariable('input');

      case 'llm':
      case 'tool':
      case 'condition':
      case 'transform':
        // 从上下文中获取相关数据
        return this._context.getAllData();

      case 'end': {
         // 获取前一个节点的结果
         if (this._workflow && this._context) {
           const incomingEdges = this._workflow.getEdgesTo(node.id.toString());
           const edges = incomingEdges || [];
           if (edges.length > 0 && edges[0]) {
             const fromNodeId = edges[0].fromNodeId;
             const prevResult = this._context.getNodeResult(fromNodeId);
             return prevResult?.data;
           }
         }
         return {};
       }

      default:
        return this._context.getAllData();
    }
  }
}

/**
 * 创建工作流执行引擎
 */
export function createWorkflowEngine(
  strategy: ExecutionStrategy = ExecutionStrategy.SEQUENTIAL
): WorkflowEngineImpl {
  return new WorkflowEngineImpl(strategy);
}

// Export ExecutionStrategy for use in other modules
export { ExecutionStrategy };
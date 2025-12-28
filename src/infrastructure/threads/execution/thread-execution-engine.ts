import { injectable, inject } from 'inversify';
import { Workflow } from '../../../domain/workflow/entities/workflow';
import { Thread } from '../../../domain/threads/entities/thread';
import { NodeId } from '../../../domain/workflow/value-objects';
import { EdgeValueObject } from '../../../domain/workflow/value-objects';
import { NodeValueObject } from '../../../domain/workflow/value-objects';
import { NodeExecution, NodeExecutionError } from '../../../domain/threads/value-objects/node-execution';
import { NodeStatus } from '../../../domain/workflow/value-objects';
import { ExecutionContext } from '../../../domain/threads/value-objects/execution-context';
import { NodeRouter } from './node-router';
import { EdgeEvaluator } from './edge-evaluator';
import { NodeExecutor } from '../../workflow/nodes/node-executor';
import { EdgeExecutor } from '../../workflow/edges/edge-executor';
import { HookExecutor } from '../../workflow/hooks/hook-executor';
import { HookContext } from '../../workflow/hooks/hook-context';
import { HookValueObject } from '../../../domain/workflow/value-objects/hook-value-object';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * 执行引擎配置接口
 */
export interface ExecutionEngineConfig {
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否启用日志 */
  enableLogging?: boolean;
}

/**
 * 执行结果接口
 */
export interface ExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 执行的节点ID */
  nodeId: NodeId;
  /** 执行结果 */
  result?: unknown;
  /** 错误信息 */
  error?: string;
  /** 执行耗时（毫秒） */
  duration: number;
}

/**
 * 路由决策结果接口
 */
export interface RoutingDecision {
  /** 下一个节点ID */
  nextNodeId: NodeId | null;
  /** 使用的边 */
  usedEdge?: string;
  /** 决策原因 */
  reason: string;
}

/**
 * 钩子执行点枚举
 */
export enum ThreadHookPoint {
  BEFORE_NODE_EXECUTION = 'before_node_execution',
  AFTER_NODE_EXECUTION = 'after_node_execution',
  BEFORE_EDGE_EVALUATION = 'before_edge_evaluation',
  AFTER_EDGE_EVALUATION = 'after_edge_evaluation',
  BEFORE_EDGE_EXECUTION = 'before_edge_execution',
  AFTER_EDGE_EXECUTION = 'after_edge_execution',
  ON_THREAD_START = 'on_thread_start',
  ON_THREAD_COMPLETE = 'on_thread_complete',
  ON_THREAD_ERROR = 'on_thread_error'
}

/**
 * Thread执行引擎
 *
 * 负责协调Thread的执行流程，包括：
 * - 节点执行协调（通过NodeExecutor）
 * - 路由决策（通过NodeRouter）
 * - 边条件评估（通过EdgeEvaluator）
 * - 边执行（通过EdgeExecutor）
 * - 钩子执行（通过HookExecutor）
 * - 执行状态管理
 *
 * 属于基础设施层，提供技术性的执行协调支持
 */
@injectable()
export class ThreadExecutionEngine {
  private readonly workflow: Workflow;
  private readonly thread: Thread;
  private readonly nodeRouter: NodeRouter;
  private readonly edgeEvaluator: EdgeEvaluator;
  private readonly nodeExecutor: NodeExecutor;
  private readonly edgeExecutor: EdgeExecutor;
  private readonly hookExecutor: HookExecutor;
  private readonly config: ExecutionEngineConfig;
  private readonly logger: ILogger;

  constructor(
    @inject('Workflow') workflow: Workflow,
    @inject('Thread') thread: Thread,
    @inject('NodeExecutor') nodeExecutor: NodeExecutor,
    @inject('EdgeExecutor') edgeExecutor: EdgeExecutor,
    @inject('EdgeEvaluator') edgeEvaluator: EdgeEvaluator,
    @inject('NodeRouter') nodeRouter: NodeRouter,
    @inject('HookExecutor') hookExecutor: HookExecutor,
    @inject('Logger') logger: ILogger,
    config?: ExecutionEngineConfig
  ) {
    this.workflow = workflow;
    this.thread = thread;
    this.nodeExecutor = nodeExecutor;
    this.edgeExecutor = edgeExecutor;
    this.edgeEvaluator = edgeEvaluator;
    this.nodeRouter = nodeRouter;
    this.hookExecutor = hookExecutor;
    this.logger = logger;
    this.config = config || {};
  }

  /**
   * 执行下一个节点
   *
   * @returns 执行结果
   */
  public async executeNextNode(): Promise<ExecutionResult> {
    const currentNodeId = this.getCurrentNodeId();

    if (!currentNodeId) {
      throw new Error('没有当前节点可执行');
    }

    const startTime = Date.now();

    try {
      // 执行节点
      const result = await this.executeNode(currentNodeId);

      // 更新节点执行状态
      const nodeExecution = this.thread.execution.getNodeExecution(currentNodeId);
      if (!nodeExecution) {
        throw new Error(`节点执行状态不存在: ${currentNodeId.toString()}`);
      }

      const updatedNodeExecution = nodeExecution.complete(result);
      const updatedThreadExecution = this.thread.execution.updateNodeExecution(updatedNodeExecution);

      // 更新Thread的执行状态
      this.updateThreadExecution(updatedThreadExecution);

      // 确定下一个节点
      const routingDecision = await this.determineNextNode(currentNodeId, result);

      if (routingDecision.nextNodeId) {
        // 创建下一个节点的执行状态
        const nextNodeExecution = NodeExecution.create(routingDecision.nextNodeId);
        const newThreadExecution = updatedThreadExecution.addNodeExecution(nextNodeExecution);
        this.updateThreadExecution(newThreadExecution);
      } else {
        // 没有下一个节点，完成Thread
        this.thread.complete();
      }

      return {
        success: true,
        nodeId: currentNodeId,
        result,
        duration: Date.now() - startTime
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 更新节点执行状态为失败
      const nodeExecution = this.thread.execution.getNodeExecution(currentNodeId);
      if (nodeExecution) {
        const errorObj: NodeExecutionError = {
          code: 'EXECUTION_ERROR',
          message: errorMessage,
          timestamp: require('../../../domain/common/value-objects/timestamp').Timestamp.now()
        };
        const failedNodeExecution = nodeExecution.fail(errorObj);
        const updatedThreadExecution = this.thread.execution.updateNodeExecution(failedNodeExecution);
        this.updateThreadExecution(updatedThreadExecution);
      }

      // 标记Thread为失败
      this.thread.fail(errorMessage);

      return {
        success: false,
        nodeId: currentNodeId,
        error: errorMessage,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 确定下一个节点
   *
   * @param currentNodeId 当前节点ID
   * @param nodeResult 节点执行结果
   * @returns 路由决策
   */
  public async determineNextNode(
    currentNodeId: NodeId,
    nodeResult: unknown
  ): Promise<RoutingDecision> {
    const outgoingEdges = this.workflow.getOutgoingEdges(currentNodeId);

    if (outgoingEdges.length === 0) {
      return {
        nextNodeId: null,
        reason: '当前节点没有出边，执行结束'
      };
    }

    // 评估所有出边
    const satisfiedEdges = await this.edgeEvaluator.getSatisfiedEdges(
      outgoingEdges,
      this.thread.execution.context
    );

    if (satisfiedEdges.length === 0) {
      return {
        nextNodeId: null,
        reason: '没有满足条件的边，执行结束'
      };
    }

    // 按优先级排序
    const sortedEdges = this.edgeEvaluator.sortEdgesByPriority(satisfiedEdges);

    // 返回第一个满足条件的边的目标节点
    const selectedEdge = sortedEdges[0];
    if (!selectedEdge) {
      return {
        nextNodeId: null,
        reason: '没有找到满足条件的边'
      };
    }
    return {
      nextNodeId: selectedEdge.toNodeId,
      usedEdge: selectedEdge.id.toString(),
      reason: `选择满足条件的边: ${selectedEdge.id.toString()}`
    };
  }

  /**
   * 执行节点
   *
   * @param nodeId 节点ID
   * @returns 执行结果
   */
  private async executeNode(nodeId: NodeId): Promise<unknown> {
    const node = this.workflow.getNode(nodeId);

    if (!node) {
      throw new Error(`节点不存在: ${nodeId.toString()}`);
    }

    // 更新节点执行状态为运行中
    const nodeExecution = this.thread.execution.getNodeExecution(nodeId);
    if (!nodeExecution) {
      throw new Error(`节点执行状态不存在: ${nodeId.toString()}`);
    }

    const runningNodeExecution = nodeExecution.start();
    const updatedThreadExecution = this.thread.execution.updateNodeExecution(runningNodeExecution);
    this.updateThreadExecution(updatedThreadExecution);

    // 执行节点前钩子
    await this.executeHooks(ThreadHookPoint.BEFORE_NODE_EXECUTION, nodeId);

    // 调用实际的节点执行逻辑
    const result = await this.nodeExecutor.execute(node, this.createFunctionExecutionContext(nodeId));

    // 执行节点后钩子
    await this.executeHooks(ThreadHookPoint.AFTER_NODE_EXECUTION, nodeId, result);

    return result;
  }

  /**
   * 创建函数执行上下文
   *
   * @param nodeId 节点ID
   * @returns 函数执行上下文
   */
  private createFunctionExecutionContext(nodeId: NodeId): {
    workflowId: string;
    executionId: string;
    variables: Map<string, unknown>;
    getVariable: (key: string) => unknown;
    setVariable: (key: string, value: unknown) => void;
    getNodeResult: (key: string) => unknown;
    setNodeResult: (key: string, value: unknown) => void;
  } {
    const context = this.thread.execution.context;
    return {
      workflowId: this.workflow.id.toString(),
      executionId: this.thread.execution.context.variables.get('executionId')?.toString() || '',
      variables: context.variables,
      getVariable: (key: string) => context.getVariable(key),
      setVariable: (key: string, value: unknown) => {
        // 注意：ExecutionContext.setVariable 返回新的上下文
        // 这里我们不修改原上下文
      },
      getNodeResult: (key: string) => {
        const nodeContext = context.getNodeContext({ toString: () => key } as NodeId);
        return nodeContext?.variables.get('result');
      },
      setNodeResult: (key: string, value: unknown) => {
        // 设置节点结果到上下文
      }
    };
  }

  /**
   * 执行钩子
   *
   * @param hookPoint 钩子执行点
   * @param nodeId 节点ID
   * @param nodeResult 节点执行结果（可选）
   */
  private async executeHooks(
    hookPoint: ThreadHookPoint,
    nodeId: NodeId,
    nodeResult?: unknown
  ): Promise<void> {
    try {
      // 获取工作流中该钩子点的所有钩子
      const hooks = this.getHooksForPoint(hookPoint);

      if (hooks.length === 0) {
        return;
      }

      // 创建钩子上下文（使用metadata传递节点信息）
      const hookContext: HookContext = {
        workflowId: this.workflow.id.toString(),
        executionId: this.thread.execution.context.variables.get('executionId')?.toString(),
        config: {
          nodeId: nodeId.toString(),
          nodeResult
        },
        metadata: {
          nodeId: nodeId.toString(),
          nodeResult,
          threadId: this.thread.id.toString()
        }
      };

      // 执行钩子
      await this.hookExecutor.executeBatch(hooks, hookContext);
    } catch (error) {
      this.logger.warn(`执行钩子失败: ${hookPoint}`, { error });
      // 钩子失败不应该中断执行流程
    }
  }

  /**
   * 获取指定钩子点的钩子
   *
   * @param hookPoint 钩子执行点
   * @returns 钩子列表
   */
  private getHooksForPoint(hookPoint: ThreadHookPoint): HookValueObject[] {
    // 从工作流中获取对应钩子点的钩子
    // 这里需要根据实际的钩子存储方式实现
    // 目前返回空数组
    return [];
  }

  /**
   * 获取当前节点ID
   *
   * @returns 当前节点ID，如果没有则返回null
   */
  public getCurrentNodeId(): NodeId | null {
    const nodeExecutions = this.thread.execution.nodeExecutions;

    // 查找状态为pending或running的节点
    for (const [nodeIdStr, nodeExecution] of nodeExecutions.entries()) {
      if (nodeExecution.status.isPending() || nodeExecution.status.isRunning()) {
        return { toString: () => nodeIdStr } as NodeId;
      }
    }

    // 如果没有正在执行的节点，查找最后一个已完成的节点
    let lastCompletedNodeId: NodeId | null = null;
    let lastCompletedTime = 0;

    for (const [nodeIdStr, nodeExecution] of nodeExecutions.entries()) {
      if (nodeExecution.status.isCompleted() && nodeExecution.endTime) {
        const endTime = nodeExecution.endTime.getMilliseconds();
        if (endTime > lastCompletedTime) {
          lastCompletedTime = endTime;
          lastCompletedNodeId = { toString: () => nodeIdStr } as NodeId;
        }
      }
    }

    return lastCompletedNodeId;
  }

  /**
   * 获取起始节点
   *
   * @returns 起始节点ID列表
   */
  public getStartNodes(): NodeId[] {
    return this.nodeRouter.getStartNodes(this.workflow);
  }

  /**
   * 获取结束节点
   *
   * @returns 结束节点ID列表
   */
  public getEndNodes(): NodeId[] {
    return this.nodeRouter.getEndNodes(this.workflow);
  }

  /**
   * 检查是否可以继续执行
   *
   * @returns 是否可以继续执行
   */
  public canContinue(): boolean {
    // 检查Thread状态
    if (!this.thread.status.isActive()) {
      return false;
    }

    // 检查是否有当前节点
    const currentNodeId = this.getCurrentNodeId();
    if (!currentNodeId) {
      return false;
    }

    // 检查当前节点是否可以执行
    const nodeExecution = this.thread.execution.getNodeExecution(currentNodeId);
    if (!nodeExecution) {
      return false;
    }

    return nodeExecution.status.isPending() || nodeExecution.status.isRunning();
  }

  /**
   * 获取执行进度
   *
   * @returns 执行进度（0-100）
   */
  public getExecutionProgress(): number {
    return this.thread.execution.progress;
  }

  /**
   * 更新Thread执行状态
   *
   * @param newExecution 新的执行状态
   */
  private updateThreadExecution(newExecution: any): void {
    // 更新Thread的执行状态
    // 注意：这里需要通过Thread的方法来更新，而不是直接修改属性
    // 由于Thread是不可变的，这里需要创建新的Thread实例
    // 但在实际应用中，这应该通过Repository来持久化

    // 暂时使用类型断言来更新
    (this.thread as any).props = {
      ...(this.thread as any).props,
      execution: newExecution,
      updatedAt: require('../../../domain/common/value-objects/timestamp').Timestamp.now()
    };
  }

  /**
   * 初始化执行
   *
   * @returns 是否成功初始化
   */
  public async initializeExecution(): Promise<boolean> {
    try {
      // 获取起始节点
      const startNodes = this.getStartNodes();

      if (startNodes.length === 0) {
        throw new Error('工作流没有起始节点');
      }

      // 创建第一个节点的执行状态
      const firstNodeId = startNodes[0];
      if (!firstNodeId) {
        throw new Error('没有找到起始节点');
      }
      const firstNodeExecution = NodeExecution.create(firstNodeId);
      const newThreadExecution = this.thread.execution.addNodeExecution(firstNodeExecution);

      this.updateThreadExecution(newThreadExecution);

      return true;
    } catch (error) {
      console.error('初始化执行失败:', error);
      return false;
    }
  }

  /**
   * 获取执行统计信息
   *
   * @returns 执行统计信息
   */
  public getExecutionStatistics(): {
    totalNodes: number;
    executedNodes: number;
    completedNodes: number;
    failedNodes: number;
    pendingNodes: number;
    runningNodes: number;
  } {
    const nodeExecutions = this.thread.execution.nodeExecutions;
    const totalNodes = this.workflow.getNodeCount();

    let completedNodes = 0;
    let failedNodes = 0;
    let pendingNodes = 0;
    let runningNodes = 0;

    for (const nodeExecution of nodeExecutions.values()) {
      if (nodeExecution.status.isCompleted()) {
        completedNodes++;
      } else if (nodeExecution.status.isFailed()) {
        failedNodes++;
      } else if (nodeExecution.status.isPending()) {
        pendingNodes++;
      } else if (nodeExecution.status.isRunning()) {
        runningNodes++;
      }
    }

    return {
      totalNodes,
      executedNodes: completedNodes + failedNodes,
      completedNodes,
      failedNodes,
      pendingNodes,
      runningNodes
    };
  }
}
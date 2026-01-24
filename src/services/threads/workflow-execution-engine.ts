import { injectable, inject } from 'inversify';
import { Workflow } from '../../domain/workflow/entities/workflow';
import { NodeId, NodeType } from '../../domain/workflow/value-objects/node';
import { ThreadWorkflowState } from '../../domain/threads/value-objects/thread-workflow-state';
import { ThreadStateManager } from './thread-state-manager';
import { ThreadHistoryManager } from './thread-history-manager';
import { CheckpointManagement } from '../checkpoints/checkpoint-management';
import { ThreadConditionalRouter } from './thread-conditional-router';
import { INodeExecutionHandler } from './execution/handlers/node-execution-handler';
import { FunctionRegistry } from '../workflow/functions/function-registry';
import { ThreadFork } from './thread-fork';
import { ThreadJoin } from './thread-join';
import { ForkNode, JoinNode } from '../../domain/workflow/entities/node/index';
import { IThreadRepository } from '../../domain/threads/repositories/thread-repository';
import { Thread } from '../../domain/threads/entities/thread';
import { ID } from '../../domain/common/value-objects/id';
import { TYPES } from '../../di/service-keys';

/**
 * 工作流执行选项接口
 */
export interface WorkflowExecutionOptions {
  /** 是否启用检查点 */
  enableCheckpoints?: boolean;
  /** 检查点间隔（节点数） */
  checkpointInterval?: number;
  /** 是否记录路由历史 */
  recordRoutingHistory?: boolean;
  /** 是否启用详细路由日志 */
  verboseRoutingLogging?: boolean;
  /** 最大执行步数 */
  maxSteps?: number;
  /** 执行超时时间（毫秒） */
  timeout?: number;
  /** 节点执行超时时间（毫秒） */
  nodeTimeout?: number;
  /** 节点最大重试次数 */
  maxNodeRetries?: number;
  /** 节点重试延迟（毫秒） */
  nodeRetryDelay?: number;
  /** 是否启用错误恢复 */
  enableErrorRecovery?: boolean;
}

/**
 * 工作流执行结果接口
 */
export interface WorkflowExecutionResult {
  /** 是否成功 */
  readonly success: boolean;
  /** 最终状态 */
  readonly finalState: ThreadWorkflowState;
  /** 执行的节点数量 */
  readonly executedNodes: number;
  /** 执行时间（毫秒） */
  readonly executionTime: number;
  /** 错误信息 */
  readonly error?: string;
  /** 创建的检查点数量 */
  readonly checkpointCount: number;
  /** 执行状态 */
  readonly status: 'completed' | 'cancelled' | 'timeout' | 'error';
  /** 错误详情 */
  readonly errorDetails?: {
    nodeId?: string;
    errorType: string;
    message: string;
    timestamp: string;
  };
}

/**
 * 执行控制器接口
 */
export interface ExecutionController {
  /** 是否暂停 */
  isPaused: boolean;
  /** 是否取消 */
  isCancelled: boolean;
  /** 是否完成 */
  isCompleted: boolean;
  /** 暂停执行 */
  pause(): void;
  /** 恢复执行 */
  resume(): void;
  /** 取消执行 */
  cancel(): void;
  /** 等待恢复 */
  waitForResume(): Promise<void>;
}

/**
 * 执行控制器实现
 */
class WorkflowExecutionController implements ExecutionController {
  public isPaused = false;
  public isCancelled = false;
  public isCompleted = false;
  private resumePromise?: Promise<void>;
  private resumeResolve?: () => void;

  constructor(public readonly threadId: string) { }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
    if (this.resumeResolve) {
      this.resumeResolve();
      this.resumeResolve = undefined;
    }
  }

  cancel(): void {
    this.isCancelled = true;
    this.resume();
  }

  setCompleted(): void {
    this.isCompleted = true;
  }

  async waitForResume(): Promise<void> {
    if (!this.isPaused) return;

    this.resumePromise = new Promise(resolve => {
      this.resumeResolve = resolve;
    });

    await this.resumePromise;
  }
}

/**
 * 工作流执行引擎
 */

@injectable()
export class WorkflowExecutionEngine {
  private readonly stateManager: ThreadStateManager;
  private readonly historyManager: ThreadHistoryManager;
  private readonly checkpointManagement: CheckpointManagement;
  private readonly router: ThreadConditionalRouter;
  private readonly nodeExecutor: INodeExecutionHandler;
  private readonly functionRegistry: FunctionRegistry;
  private readonly threadFork: ThreadFork;
  private readonly threadJoin: ThreadJoin;
  private readonly threadRepository: IThreadRepository;
  private activeExecutions: Map<string, WorkflowExecutionController>;

  constructor(
    @inject(TYPES.ThreadStateManager) stateManager: ThreadStateManager,
    @inject(TYPES.ThreadHistoryManager) historyManager: ThreadHistoryManager,
    @inject(TYPES.CheckpointManagement) checkpointManagement: CheckpointManagement,
    @inject(TYPES.ThreadConditionalRouter) router: ThreadConditionalRouter,
    @inject(TYPES.NodeExecutor) nodeExecutor: INodeExecutionHandler,
    @inject(TYPES.FunctionRegistry) functionRegistry: FunctionRegistry,
    @inject(TYPES.ThreadFork) threadFork: ThreadFork,
    @inject(TYPES.ThreadJoin) threadJoin: ThreadJoin,
    @inject(TYPES.ThreadRepository) threadRepository: IThreadRepository
  ) {
    this.stateManager = stateManager;
    this.historyManager = historyManager;
    this.checkpointManagement = checkpointManagement;
    this.router = router;
    this.nodeExecutor = nodeExecutor;
    this.functionRegistry = functionRegistry;
    this.threadFork = threadFork;
    this.threadJoin = threadJoin;
    this.threadRepository = threadRepository;
    this.activeExecutions = new Map();
  }

  /**
   * 执行工作流
   * @param workflow 工作流
   * @param threadId 线程ID
   * @param initialState 初始状态
   * @param options 执行选项
   * @returns 执行结果
   */
  async execute(
    workflow: Workflow,
    threadId: string,
    initialState: Record<string, any>,
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    const enableCheckpoints = options.enableCheckpoints ?? true;
    const checkpointInterval = options.checkpointInterval ?? 1;
    const maxSteps = options.maxSteps ?? 1000;
    const timeout = options.timeout ?? 300000; // 5分钟默认超时
    const nodeTimeout = options.nodeTimeout ?? 30000; // 节点默认超时30秒
    const maxNodeRetries = options.maxNodeRetries ?? 0;
    const nodeRetryDelay = options.nodeRetryDelay ?? 1000;
    const enableErrorRecovery = options.enableErrorRecovery ?? false;

    // 创建执行控制器
    const controller = new WorkflowExecutionController(threadId);
    this.activeExecutions.set(threadId, controller);

    // 初始化计数器（在 try 块外定义，以便在 catch 块中访问）
    let executedNodes = 0;
    let checkpointCount = 0;
    let currentNodeId: string | null = null;

    try {
      // 初始化状态
      this.stateManager.initialize(threadId, workflow.workflowId, initialState);

      // 查找起始节点
      currentNodeId = this.findStartNode(workflow);
      if (!currentNodeId) {
        throw new Error('工作流没有起始节点');
      }

      let lastCheckpointStep = 0;

      // 执行循环
      while (this.shouldContinueExecution(controller, currentNodeId, executedNodes, maxSteps)) {
        // 检查是否暂停
        if (controller.isPaused) {
          await controller.waitForResume();
        }

        // 检查是否取消
        if (controller.isCancelled) {
          throw new Error('Execution cancelled');
        }

        // 检查超时
        if (Date.now() - startTime > timeout) {
          throw new Error('工作流执行超时');
        }

        // 获取当前节点
        const node = workflow.getNode(NodeId.fromString(currentNodeId));
        if (!node) {
          throw new Error(`节点 ${currentNodeId} 不存在`);
        }

        // 获取当前状态
        const currentState = this.stateManager.getState(threadId);
        if (!currentState) {
          throw new Error(`线程 ${threadId} 的状态不存在`);
        }

        // 创建检查点
        if (enableCheckpoints && executedNodes - lastCheckpointStep >= checkpointInterval) {
          // 注意：这里需要通过 CheckpointManagement 创建检查点
          // 由于 CheckpointManagement 需要 Thread 对象，这里暂时跳过
          // 实际实现需要重构以支持直接创建检查点
          checkpointCount++;
          lastCheckpointStep = executedNodes;
        }

        // 执行节点（带错误处理）
        try {
          const nodeResult = await this.executeNodeWithRetry(node, currentState, threadId, {
            timeout: nodeTimeout,
            maxRetries: maxNodeRetries,
            retryDelay: nodeRetryDelay,
          });

          // 更新状态
          this.stateManager.updateState(threadId, nodeResult.output || {});

          // 记录执行历史
          this.historyManager.recordExecution(
            threadId,
            NodeId.fromString(currentNodeId),
            nodeResult,
            nodeResult.success ? 'success' : 'failure',
            nodeResult.metadata
          );

          // 处理Fork节点
          // TODO: Fork节点执行策略尚未实现
          // if (node instanceof ForkNode && nodeResult.success) {
          //   await this.handleForkNode(node, currentState, threadId, workflow);
          // }

          // 处理Join节点
          // TODO: Join节点执行策略尚未实现
          // if (node instanceof JoinNode && nodeResult.success) {
          //   await this.handleJoinNode(node, currentState, threadId);
          // }

          executedNodes++;
        } catch (error) {
          // 节点执行错误处理
          const handled = await this.handleNodeExecutionError(
            error,
            node,
            threadId,
            workflow,
            enableErrorRecovery
          );

          if (!handled) {
            // 无法处理，抛出异常
            throw error;
          }

          // 错误已处理，继续执行
          executedNodes++;
        }

        // 获取出边
        const outgoingEdges = workflow.getOutgoingEdges(NodeId.fromString(currentNodeId));

        if (outgoingEdges.length === 0) {
          // 没有出边，执行结束
          break;
        }

        // 路由决策
        const routingResult = await this.router.route(
          outgoingEdges,
          this.stateManager.getState(threadId)!,
          {
            recordHistory: options.recordRoutingHistory,
            verboseLogging: options.verboseRoutingLogging,
            useDefaultEdge: true,
          }
        );

        if (!routingResult) {
          // 没有可用的路由，执行结束
          break;
        }

        currentNodeId = routingResult.targetNodeId;
      }

      // 获取最终状态
      const finalState = this.stateManager.getState(threadId)!;
      controller.setCompleted();

      return {
        success: true,
        finalState,
        executedNodes,
        executionTime: Date.now() - startTime,
        checkpointCount,
        status: 'completed',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 获取当前状态
      const currentState = this.stateManager.getState(threadId);

      // 确定执行状态
      let status: 'completed' | 'cancelled' | 'timeout' | 'error' = 'error';
      if (errorMessage === 'Execution cancelled') {
        status = 'cancelled';
      } else if (errorMessage.includes('超时')) {
        status = 'timeout';
      }

      return {
        success: false,
        finalState: currentState || ThreadWorkflowState.initial(workflow.workflowId),
        executedNodes,
        executionTime: Date.now() - startTime,
        error: errorMessage,
        checkpointCount,
        status,
        errorDetails: {
          nodeId: currentNodeId || undefined,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      };
    } finally {
      // 清理执行控制器
      this.activeExecutions.delete(threadId);
    }
  }

  /**
   * 从检查点恢复执行
   * @param workflow 工作流
   * @param threadId 线程ID
   * @param checkpointId 检查点ID
   * @param options 执行选项
   * @returns 执行结果
   */
  async resumeFromCheckpoint(
    workflow: Workflow,
    threadId: string,
    checkpointId: string,
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecutionResult> {
    // 注意：这里需要通过 CheckpointManagement 恢复检查点
    // 由于 CheckpointManagement 的接口不同，这里暂时抛出错误
    // 实际实现需要重构以支持恢复检查点
    throw new Error('从检查点恢复功能需要重构以支持新的 CheckpointManagement 接口');
  }

  /**
   * 暂停执行
   * @param threadId 线程ID
   */
  pauseExecution(threadId: string): void {
    const controller = this.activeExecutions.get(threadId);
    if (controller) {
      controller.pause();
    }
  }

  /**
   * 恢复执行
   * @param threadId 线程ID
   */
  resumeExecution(threadId: string): void {
    const controller = this.activeExecutions.get(threadId);
    if (controller) {
      controller.resume();
    }
  }

  /**
   * 取消执行
   * @param threadId 线程ID
   */
  cancelExecution(threadId: string): void {
    const controller = this.activeExecutions.get(threadId);
    if (controller) {
      controller.cancel();
    }
  }

  /**
   * 获取执行控制器
   * @param threadId 线程ID
   * @returns 执行控制器，如果不存在则返回 undefined
   */
  getExecutionController(threadId: string): ExecutionController | undefined {
    return this.activeExecutions.get(threadId);
  }

  /**
   * 判断是否应该继续执行（私有方法）
   * @param controller 执行控制器
   * @param currentNodeId 当前节点ID
   * @param executedNodes 已执行节点数
   * @param maxSteps 最大步数
   * @returns 是否应该继续执行
   */
  private shouldContinueExecution(
    controller: ExecutionController,
    currentNodeId: string | null,
    executedNodes: number,
    maxSteps: number
  ): boolean {
    return (
      !controller.isCancelled &&
      !controller.isCompleted &&
      currentNodeId !== null &&
      executedNodes < maxSteps
    );
  }

  /**
   * 执行节点（带重试）（私有方法）
   * @param node 节点
   * @param state 线程状态
   * @param threadId 线程ID
   * @param options 执行选项
   * @returns 执行结果
   */
  private async executeNodeWithRetry(
    node: any,
    state: ThreadWorkflowState,
    threadId: string,
    options: { timeout: number; maxRetries: number; retryDelay: number }
  ): Promise<any> {
    const nodeContext = this.buildNodeContext(state, threadId);
    const canExecute = await this.nodeExecutor.canExecute(node, nodeContext);

    if (!canExecute) {
      throw new Error(`节点 ${node.nodeId.toString()} 无法执行`);
    }

    // 如果有重试配置，使用带重试的执行
    if (options.maxRetries > 0) {
      return await this.nodeExecutor.execute(node, nodeContext);
    }

    // 否则直接执行
    return await this.nodeExecutor.execute(node, nodeContext);
  }

  /**
   * 处理Fork节点（私有方法）
   * TODO: Fork节点执行策略尚未实现
   */
  /*
  private async handleForkNode(
    node: ForkNode,
    state: ThreadWorkflowState,
    threadId: string,
    workflow: Workflow
  ): Promise<void> {
    try {
      // 获取当前线程
      const currentThread = await this.getCurrentThread(threadId);
      if (!currentThread) {
        throw new Error(`线程 ${threadId} 不存在`);
      }

      // 调用ThreadFork服务
      const forkResult = await this.threadFork.executeFork({
        parentThread: currentThread,
        forkPoint: node.nodeId,
        branches: node.branches,
      });

      if (!forkResult.success) {
        throw new Error(`Fork操作失败: ${forkResult.error?.message}`);
      }

      // 存储子线程ID到状态
      this.stateManager.updateState(threadId, {
        child_thread_ids: forkResult.result?.forkedThreadIds || [],
      });

      // 启动子线程
      for (const childThreadId of forkResult.result?.forkedThreadIds || []) {
        await this.startChildThread(childThreadId.toString(), workflow, state);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`处理Fork节点失败: ${errorMessage}`);
    }
  }
  */

  /**
   * 处理Join节点（私有方法）
   * TODO: Join节点执行策略尚未实现
   */
  /*
  private async handleJoinNode(
    node: JoinNode,
    state: ThreadWorkflowState,
    threadId: string
  ): Promise<void> {
    try {
      // 获取当前线程
      const currentThread = await this.getCurrentThread(threadId);
      if (!currentThread) {
        throw new Error(`线程 ${threadId} 不存在`);
      }

      // 获取子线程ID
      const childThreadIds = state.getData('child_thread_ids') || [];

      if (childThreadIds.length === 0) {
        // 没有子线程，直接返回
        return;
      }

      // 调用ThreadJoin服务
      const joinResult = await this.threadJoin.executeJoin({
        parentThread: currentThread,
        joinPoint: node.nodeId,
        childThreadIds,
      });

      if (!joinResult.success) {
        throw new Error(`Join操作失败: ${joinResult.error?.message}`);
      }

      // 存储合并结果到状态
      this.stateManager.updateState(threadId, {
        merged_results: joinResult.result?.mergedResults || {},
        branch_results: joinResult.result?.branchResults || [],
      });

      // 清理子线程ID
      this.stateManager.updateState(threadId, {
        child_thread_ids: [],
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`处理Join节点失败: ${errorMessage}`);
    }
  }
  */

  /**
   * 获取当前线程（私有方法）
   * @param threadId 线程ID
   * @returns 线程实例
   */
  private async getCurrentThread(threadId: string): Promise<Thread | null> {
    try {
      const thread = await this.threadRepository.findById(ID.fromString(threadId));
      return thread || null;
    } catch (error) {
      console.error(`获取线程 ${threadId} 失败:`, error);
      return null;
    }
  }

  /**
   * 启动子线程（私有方法）
   * @param childThreadId 子线程ID
   * @param workflow 工作流
   * @param parentState 父线程状态
   */
  private async startChildThread(
    childThreadId: string,
    workflow: Workflow,
    parentState: ThreadWorkflowState
  ): Promise<void> {
    try {
      // 获取子线程
      const childThread = await this.threadRepository.findById(ID.fromString(childThreadId));
      if (!childThread) {
        throw new Error(`子线程 ${childThreadId} 不存在`);
      }

      // 初始化子线程状态
      this.stateManager.initialize(
        childThreadId,
        workflow.workflowId,
        parentState.data
      );

      // 查找起始节点
      const startNodeId = this.findStartNode(workflow);
      if (!startNodeId) {
        throw new Error('工作流没有起始节点');
      }

      // 执行子线程工作流
      await this.execute(
        workflow,
        childThreadId,
        parentState.data,
        {
          enableCheckpoints: false,
          maxSteps: 1000,
          timeout: 300000,
        }
      );
    } catch (error) {
      console.error(`启动子线程 ${childThreadId} 失败:`, error);
      throw error;
    }
  }

  /**
   * 处理节点执行错误（私有方法）
   * @param error 错误
   * @param node 节点
   * @param threadId 线程ID
   * @param workflow 工作流
   * @param enableErrorRecovery 是否启用错误恢复
   * @returns 是否成功处理错误
   */
  private async handleNodeExecutionError(
    error: any,
    node: any,
    threadId: string,
    workflow: Workflow,
    enableErrorRecovery: boolean
  ): Promise<boolean> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const nodeId = node.nodeId.toString();

    // 记录错误到状态
    const currentState = this.stateManager.getState(threadId);
    if (currentState) {
      const errors = currentState.getData('errors') || [];
      errors.push({
        nodeId,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        message: errorMessage,
        timestamp: new Date().toISOString(),
      });
      this.stateManager.updateState(threadId, { errors });
    }

    // 如果启用了错误恢复，尝试查找错误处理边
    if (enableErrorRecovery) {
      const errorEdges = workflow.getOutgoingEdges(node.nodeId).filter(edge => edge.isError());

      if (errorEdges.length > 0) {
        // 找到错误处理边，返回 true 表示已处理
        return true;
      }
    }

    // 没有错误处理机制，返回 false
    return false;
  }

  /**
   * 查找起始节点（私有方法）
   * @param workflow 工作流
   * @returns 起始节点ID，如果没有找到则返回 null
   */
  private findStartNode(workflow: Workflow): string | null {
    const nodes = workflow.getNodes();

    // 查找类型为 START 的节点
    for (const [nodeId, node] of nodes.entries()) {
      if (node.type.equals(NodeType.start())) {
        return nodeId;
      }
    }

    // 如果没有 START 节点，返回第一个节点
    if (nodes.size > 0) {
      const firstNodeId = nodes.keys().next().value;
      return firstNodeId ?? null;
    }

    return null;
  }

  /**
   * 构建节点执行上下文（私有方法）
   * @param state 线程状态
   * @returns 节点执行上下文
   */
  private buildNodeContext(state: ThreadWorkflowState, threadId: string): any {
    return {
      variables: state.data,
      metadata: state.metadata,
      getVariable: (key: string) => state.getData(key),
      setVariable: (key: string, value: any) => {
        // 注意：这里只是返回一个函数，实际的变量更新在状态管理器中完成
        return value;
      },
      getNodeResult: (nodeId: string) => {
        const history = this.historyManager.getNodeHistory(threadId, NodeId.fromString(nodeId));
        return history.length > 0 ? history[history.length - 1]?.result : undefined;
      },
      getService: <T>(serviceName: string): T => {
        // 根据服务名称返回相应的服务
        if (serviceName === 'FunctionRegistry') {
          return this.functionRegistry as T;
        }
        // 可以在这里添加其他服务的获取逻辑
        throw new Error(`服务 ${serviceName} 未找到`);
      },
    };
  }
}
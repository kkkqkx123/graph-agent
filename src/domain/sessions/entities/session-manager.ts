import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { DomainError } from '../../common/errors/domain-error';
import { SessionStatus } from '../value-objects/session-status';
import { SessionConfig } from '../value-objects/session-config';
import { SessionCreatedEvent } from '../events/session-created-event';
import { SessionStatusChangedEvent } from '../events/session-status-changed-event';
import { Workflow } from '../../workflow/entities/workflow';
import { ThreadExecutor } from '../../threads/entities/thread-executor';
import { IExecutionContext, ExecutionResult, ExecutionStatus } from '../../workflow/execution';
import { IParallelExecutionPlan, IThreadPlan, IResourceRequirements } from './parallel-execution-plan';
import { IThreadPool, ThreadPoolImpl } from './thread-pool';
import { IResourceScheduler, ResourceSchedulerImpl, IResourceAllocation, IResourceUsage } from './resource-scheduler';
import { IExecutionCoordinator, ExecutionCoordinatorImpl, IQueueStatus } from './execution-coordinator';

/**
 * Session管理器接口
 */
export interface SessionManagerProps {
  readonly id: ID;
  readonly userId?: ID;
  readonly title?: string;
  readonly status: SessionStatus;
  readonly config: SessionConfig;
  readonly threadPool: IThreadPool;
  readonly resourceScheduler: IResourceScheduler;
  readonly executionCoordinator: IExecutionCoordinator;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
  readonly createdBy?: ID;
  readonly updatedBy?: ID;
}

/**
 * Session管理器实体
 *
 * 根据最终架构设计，SessionManager专注于：
 * 1. 多线程并行协调
 * 2. 线程生命周期管理
 * 3. 资源分配和调度
 * 4. 会话上下文管理
 *
 * 不再负责：
 * - 工作流定义和业务逻辑
 * - 单线程串行执行
 * - 具体的执行逻辑
 */
export class SessionManager extends Entity {
  private readonly props: SessionManagerProps;
  private deleted: boolean = false;

  /**
   * 构造函数
   * @param props Session管理器属性
   */
  private constructor(props: SessionManagerProps) {
    super(props.id, props.createdAt, props.updatedAt, props.version);
    this.props = Object.freeze(props);
  }

  /**
   * 标记会话为已删除
   */
  public markAsDeleted(): void {
    this.deleted = true;
    (this.props as any).status = SessionStatus.inactive();
    this.updateTimestamps();
  }

  /**
   * 检查会话是否已删除
   * @returns 是否已删除
   */
  public isDeleted(): boolean {
    return this.deleted;
  }

  /**
   * 获取会话的业务标识
   * @returns 业务标识
   */
  public getBusinessIdentifier(): string {
    return this.props.id.toString();
  }


  /**
   * 更新时间戳
   */
  private updateTimestamps(): void {
    // Use the update method from the parent class
    this.update();
  }

  /**
   * 创建Session管理器
   * @param userId 用户ID
   * @param title 标题
   * @param config 会话配置
   * @param metadata 元数据
   * @param createdBy 创建者ID
   * @returns Session管理器实例
   */
  public static create(
    userId?: ID,
    title?: string,
    config?: SessionConfig,
    metadata?: Record<string, unknown>,
    createdBy?: ID
  ): SessionManager {
    const now = Timestamp.now();
    const sessionId = ID.generate();
    const sessionStatus = SessionStatus.active();
    const sessionConfig = config || SessionConfig.default();

    // 创建线程池
    const threadPool = ThreadPoolImpl.create(10); // 默认最大并发数为10

    // 创建资源调度器
    const resourceScheduler = ResourceSchedulerImpl.create(sessionConfig);

    // 创建执行协调器
    const executionCoordinator = ExecutionCoordinatorImpl.create();

    const props: SessionManagerProps = {
      id: sessionId,
      userId,
      title,
      status: sessionStatus,
      config: sessionConfig,
      threadPool,
      resourceScheduler,
      executionCoordinator,
      metadata: metadata || {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      createdBy
    };

    const sessionManager = new SessionManager(props);

    // 添加Session创建事件
    sessionManager.addDomainEvent(new SessionCreatedEvent(
      sessionId,
      userId,
      title,
      sessionConfig.value as any
    ));

    return sessionManager;
  }

  /**
   * 从已有属性重建Session管理器
   * @param props Session管理器属性
   * @returns Session管理器实例
   */
  public static fromProps(props: SessionManagerProps): SessionManager {
    return new SessionManager(props);
  }

  /**
   * 协调并行执行
   * @param workflow 工作流
   * @param executionPlan 并行执行计划
   * @returns 执行结果
   */
  public async coordinateParallelExecution(
    workflow: Workflow,
    executionPlan: ParallelExecutionPlan
  ): Promise<ExecutionResult> {
    try {
      // 1. 验证会话状态
      this.validateSessionState();

      // 2. 分配资源
      const resources = await this.props.resourceScheduler.allocate(
        executionPlan.getResourceRequirements()
      );

      // 3. 创建执行线程
      const threads = await this.createExecutionThreads(workflow, executionPlan);

      // 4. 启动并行执行
      const results = await this.props.executionCoordinator.executeParallel(
        threads,
        resources
      );

      // 5. 合并执行结果
      const mergedResult = this.mergeExecutionResults(results);

      // 6. 释放资源
      await this.props.resourceScheduler.release(resources);

      return mergedResult;

    } catch (error) {
      // 清理资源
      await this.cleanupResources();
      throw error;
    }
  }

  /**
   * 串行执行工作流
   * @param workflow 工作流
   * @param context 执行上下文
   * @returns 执行结果
   */
  public async executeSequentially(
    workflow: Workflow,
    context: IExecutionContext
  ): Promise<ExecutionResult> {
    try {
      // 1. 验证会话状态
      this.validateSessionState();

      // 2. 创建Thread执行器
      const threadExecutor = await this.createThreadExecutor(workflow, context);

      // 3. 执行串行流程
      const result = await threadExecutor.executeSequentially(context.data);

      // 4. 清理线程
      await this.cleanupThread(threadExecutor);

      return result;

    } catch (error) {
      // 清理资源
      await this.cleanupResources();
      throw error;
    }
  }

  /**
   * 管理线程生命周期
   * @param threadId 线程ID
   * @param action 线程动作
   */
  public async manageThreadLifecycle(
    threadId: ID,
    action: ThreadAction
  ): Promise<void> {
    const thread = this.props.threadPool.getThread(threadId);

    if (!thread) {
      throw new DomainError(`线程不存在: ${threadId}`);
    }

    switch (action) {
      case 'create':
        await this.createThread(threadId);
        break;
      case 'destroy':
        await this.destroyThread(threadId);
        break;
      case 'pause':
        await thread.pauseExecution();
        break;
      case 'resume':
        await thread.resumeExecution();
        break;
      case 'cancel':
        await thread.terminateExecution();
        break;
    }
  }

  /**
   * 创建线程
   * @param threadId 线程ID
   */
  private async createThread(threadId: ID): Promise<void> {
    // 在实际实现中，我们会创建一个新的ThreadExecutor
    // 但现在我们只是模拟这个操作
    const thread = ThreadExecutor.create(
      this.props.id,
      undefined, // workflow
      undefined, // priority
      undefined, // title
      undefined, // description
      undefined, // metadata
      this.props.userId
    );

    this.props.threadPool.addThread(thread);
  }

  /**
   * 销毁线程
   * @param threadId 线程ID
   */
  private async destroyThread(threadId: ID): Promise<void> {
    const thread = this.props.threadPool.getThread(threadId);
    if (thread) {
      // 终止线程执行
      await thread.terminateExecution();
      this.props.threadPool.removeThread(thread);
    }
  }

  /**
   * 创建执行线程
   * @param workflow 工作流
   * @param executionPlan 执行计划
   * @returns 线程列表
   */
  private async createExecutionThreads(
    workflow: Workflow,
    executionPlan: ParallelExecutionPlan
  ): Promise<ThreadExecutor[]> {
    const threads: ThreadExecutor[] = [];

    for (const plan of executionPlan.getThreadPlans()) {
      // 创建执行上下文
      const context: IExecutionContext = {
        executionId: ID.generate(),
        workflowId: workflow.workflowId,
        data: plan.getInputData() as Record<string, any>,
        workflowState: {} as any, // TODO: 实现WorkflowState
        executionHistory: [],
        metadata: plan.getMetadata(),
        startTime: Timestamp.now(),
        status: 'pending',
        getVariable: (path: string) => {
          const keys = path.split('.');
          let value: any = context.data;
          for (const key of keys) {
            if (key) {
              value = value?.[key];
            }
          }
          return value;
        },
        setVariable: (path: string, value: any) => {
          const keys = path.split('.');
          let current: any = context.data;
          for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (key && (current[key] === undefined)) {
              current[key] = {};
            }
            if (key) {
              current = current[key];
            }
          }
          const lastKey = keys[keys.length - 1];
          if (lastKey) {
            current[lastKey] = value;
          }
        },
        getAllVariables: () => context.data,
        getAllMetadata: () => context.metadata,
        getInput: () => context.data,
        getExecutedNodes: () => [],
        getNodeResult: (nodeId: string) => undefined,
        getElapsedTime: () => 0,
        getWorkflow: () => workflow
      };

      // 创建Thread执行器
      const threadExecutor = await this.createThreadExecutor(workflow, context);
      threads.push(threadExecutor);
    }

    return threads;
  }

  /**
   * 创建Thread执行器
   * @param workflow 工作流
   * @param context 执行上下文
   * @returns Thread执行器
   */
  private async createThreadExecutor(
    workflow: Workflow,
    context: IExecutionContext
  ): Promise<ThreadExecutor> {
    // 创建Thread执行器
    const threadExecutor = ThreadExecutor.create(
      this.props.id,
      workflow,
      undefined, // 优先级
      undefined, // 标题
      undefined, // 描述
      context.metadata,
      this.props.userId
    );

    // 添加到线程池
    this.props.threadPool.addThread(threadExecutor);

    return threadExecutor;
  }

  /**
   * 合并执行结果
   * @param results 执行结果列表
   * @returns 合并后的结果
   */
  private mergeExecutionResults(results: ExecutionResult[]): ExecutionResult {
    const successfulResults = results.filter(r => r.status === ExecutionStatus.COMPLETED);
    const failedResults = results.filter(r => r.status === ExecutionStatus.FAILED);

    const totalStatistics = results.reduce(
      (acc, result) => ({
        totalTime: acc.totalTime + result.statistics.totalTime,
        nodeExecutionTime: acc.nodeExecutionTime + result.statistics.nodeExecutionTime,
        successfulNodes: acc.successfulNodes + result.statistics.successfulNodes,
        failedNodes: acc.failedNodes + result.statistics.failedNodes,
        skippedNodes: acc.skippedNodes + result.statistics.skippedNodes,
        retries: acc.retries + result.statistics.retries
      }),
      {
        totalTime: 0,
        nodeExecutionTime: 0,
        successfulNodes: 0,
        failedNodes: 0,
        skippedNodes: 0,
        retries: 0
      }
    );

    return {
      executionId: ID.generate(),
      status: failedResults.length > 0 ? ExecutionStatus.FAILED : ExecutionStatus.COMPLETED,
      data: {
        results: results.map(r => r.data),
        summary: {
          total: results.length,
          successful: successfulResults.length,
          failed: failedResults.length
        }
      },
      statistics: totalStatistics
    };
  }

  /**
   * 验证会话状态
   */
  private validateSessionState(): void {
    if (!this.props.status.isActive()) {
      throw new DomainError(`会话当前状态不允许执行: ${this.props.status}`);
    }
  }

  /**
   * 清理资源
   */
  private async cleanupResources(): Promise<void> {
    await this.props.resourceScheduler.cleanup();
  }

  /**
   * 清理线程
   * @param thread 线程
   */
  private async cleanupThread(thread: ThreadExecutor): Promise<void> {
    this.props.threadPool.removeThread(thread);
  }

  /**
   * 获取线程池状态
   */
  public getThreadPoolStatus(): IThreadPoolStatus {
    return {
      totalThreads: this.props.threadPool.getSize(),
      activeThreads: this.props.threadPool.getActiveCount(),
      idleThreads: this.props.threadPool.getIdleCount(),
      resourceUsage: this.props.resourceScheduler.getResourceUsage(),
      executionQueue: this.props.executionCoordinator.getQueueStatus()
    };
  }

  /**
   * 获取Session管理器ID
   */
  public get sessionId(): ID {
    return this.props.id;
  }

  /**
   * 获取用户ID
   */
  public get userId(): ID | undefined {
    return this.props.userId;
  }

  /**
   * 获取标题
   */
  public get title(): string | undefined {
    return this.props.title;
  }

  /**
   * 获取状态
   */
  public get status(): SessionStatus {
    return this.props.status;
  }

  /**
   * 获取配置
   */
  public get config(): SessionConfig {
    return this.props.config;
  }

  /**
   * 获取元数据
   */
  public get metadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  /**
   * 获取线程池
   */
  public get threadPool(): IThreadPool {
    return this.props.threadPool;
  }

  /**
   * 获取资源调度器
   */
  public get resourceScheduler(): IResourceScheduler {
    return this.props.resourceScheduler;
  }

  /**
   * 获取执行协调器
   */
  public get executionCoordinator(): IExecutionCoordinator {
    return this.props.executionCoordinator;
  }
}

/**
 * 线程动作类型
 */
export type ThreadAction = 'create' | 'destroy' | 'pause' | 'resume' | 'cancel';

/**
 * 线程池状态接口
 */
export interface IThreadPoolStatus {
  totalThreads: number;
  activeThreads: number;
  idleThreads: number;
  resourceUsage: IResourceUsage;
  executionQueue: IQueueStatus;
}

/**
 * 资源使用情况接口
 */
export interface ResourceUsage {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkUsage: number;
}

/**
 * 队列状态接口
 */
export interface QueueStatus {
  pendingTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
}

/**
 * 并行执行计划接口
 */
export interface ParallelExecutionPlan {
  /**
   * 获取线程计划
   */
  getThreadPlans(): ThreadPlan[];

  /**
   * 获取资源需求
   */
  getResourceRequirements(): ResourceRequirements;
}

/**
 * 线程计划接口
 */
export interface ThreadPlan {
  /**
   * 获取输入数据
   */
  getInputData(): unknown;

  /**
   * 获取元数据
   */
  getMetadata(): Record<string, unknown>;
}

/**
 * 资源需求接口
 */
export interface ResourceRequirements {
  cpuCores: number;
  memoryMB: number;
  diskSpaceMB: number;
  networkBandwidthMBps: number;
}

/**
 * 线程池接口
 */
export interface ThreadPool {
  /**
   * 添加线程
   */
  addThread(thread: ThreadExecutor): void;

  /**
   * 移除线程
   */
  removeThread(threadId: ID): void;

  /**
   * 获取线程
   */
  getThread(threadId: ID): ThreadExecutor | undefined;

  /**
   * 获取大小
   */
  getSize(): number;

  /**
   * 获取活跃线程数
   */
  getActiveCount(): number;

  /**
   * 获取空闲线程数
   */
  getIdleCount(): number;

  /**
   * 验证
   */
  validate(): void;
}

/**
 * 资源调度器接口
 */
export interface ResourceScheduler extends IResourceScheduler {
  /**
   * 创建资源调度器
   */
  create(config: SessionConfig): ResourceScheduler;
}

/**
 * 执行协调器接口
 */
export interface ExecutionCoordinator extends IExecutionCoordinator {
  /**
   * 创建执行协调器
   */
  create(): ExecutionCoordinator;
}

/**
 * 资源分配接口
 */
export interface ResourceAllocation {
  allocationId: ID;
  resources: ResourceRequirements;
  allocatedAt: Timestamp;
  expiresAt?: Timestamp;
}
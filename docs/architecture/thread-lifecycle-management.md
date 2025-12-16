# 线程生命周期管理机制

## 概述

本文档详细分析Thread的创建、销毁、fork机制，以及在组合工作流场景下的线程管理策略。这些机制是支撑复杂工作流执行的基础，需要精心设计以确保系统的稳定性和性能。

## 线程创建机制

### 创建场景分析

1. **初始创建**: 会话开始时创建主执行线程
2. **分支创建**: 组合工作流执行时创建子线程
3. **并行创建**: 并行执行时创建多个工作线程
4. **恢复创建**: 从检查点恢复时创建线程
5. **重试创建**: 失败重试时创建新线程

### 线程创建架构

```typescript
/**
 * 线程工厂接口
 */
export interface IThreadFactory {
  createThread(request: ThreadCreationRequest): Promise<ThreadExecutor>;
  createMainThread(sessionId: ID): Promise<ThreadExecutor>;
  createChildThread(parentId: ID, forkPoint: string): Promise<ThreadExecutor>;
  createParallelThread(workflowId: ID, context: ExecutionContext): Promise<ThreadExecutor>;
}

/**
 * 线程创建请求
 */
export interface ThreadCreationRequest {
  sessionId: ID;
  workflowId?: ID;
  parentThreadId?: ID;
  threadType: ThreadType;
  priority: ThreadPriority;
  context: ExecutionContext;
  resources: ResourceRequirement[];
  metadata: Record<string, unknown>;
}

/**
 * 线程类型枚举
 */
export enum ThreadType {
  MAIN = 'main',           // 主执行线程
  CHILD = 'child',         // 子线程
  PARALLEL = 'parallel',   // 并行线程
  RECOVERY = 'recovery',   // 恢复线程
  RETRY = 'retry'          // 重试线程
}

/**
 * 线程工厂实现
 */
export class ThreadFactory implements IThreadFactory {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly workflowRepository: WorkflowRepository,
    private readonly resourceManager: IResourceManager,
    private readonly logger: ILogger
  ) {}
  
  /**
   * 创建线程
   */
  public async createThread(request: ThreadCreationRequest): Promise<ThreadExecutor> {
    try {
      // 1. 验证创建条件
      await this.validateCreationRequest(request);
      
      // 2. 分配资源
      const resources = await this.resourceManager.allocateResources(request.resources);
      
      // 3. 创建线程实例
      const thread = await this.createThreadInstance(request, resources);
      
      // 4. 初始化线程状态
      await this.initializeThread(thread, request);
      
      // 5. 注册线程
      await this.registerThread(thread);
      
      this.logger.info('线程创建成功', {
        threadId: thread.id,
        threadType: request.threadType,
        parentId: request.parentThreadId
      });
      
      return thread;
    } catch (error) {
      this.logger.error('线程创建失败', error as Error);
      throw error;
    }
  }
  
  /**
   * 创建主线程
   */
  public async createMainThread(sessionId: ID): Promise<ThreadExecutor> {
    const session = await this.sessionRepository.findByIdOrFail(sessionId);
    
    const request: ThreadCreationRequest = {
      sessionId,
      threadType: ThreadType.MAIN,
      priority: ThreadPriority.HIGH,
      context: new ExecutionContext(session),
      resources: this.calculateMainThreadResources(),
      metadata: { isMain: true }
    };
    
    return await this.createThread(request);
  }
  
  /**
   * 创建子线程
   */
  public async createChildThread(parentId: ID, forkPoint: string): Promise<ThreadExecutor> {
    const parentThread = await this.getThreadById(parentId);
    
    // 1. 保存父线程状态
    const parentState = await parentThread.saveState();
    
    // 2. 创建子线程请求
    const request: ThreadCreationRequest = {
      sessionId: parentThread.sessionId,
      workflowId: parentThread.workflowId,
      parentThreadId: parentId,
      threadType: ThreadType.CHILD,
      priority: parentThread.priority,
      context: parentThread.context.fork(forkPoint),
      resources: this.calculateChildThreadResources(parentThread),
      metadata: { 
        forkPoint,
        parentState: parentState.serialize()
      }
    };
    
    const childThread = await this.createThread(request);
    
    // 3. 建立父子关系
    await this.establishParentChildRelation(parentThread, childThread);
    
    return childThread;
  }
  
  /**
   * 创建并行线程
   */
  public async createParallelThread(
    workflowId: ID, 
    context: ExecutionContext
  ): Promise<ThreadExecutor> {
    const workflow = await this.workflowRepository.findByIdOrFail(workflowId);
    
    const request: ThreadCreationRequest = {
      sessionId: context.sessionId,
      workflowId,
      threadType: ThreadType.PARALLEL,
      priority: ThreadPriority.NORMAL,
      context: context.clone(),
      resources: this.calculateParallelThreadResources(workflow),
      metadata: { 
        isParallel: true,
        workflowType: workflow.getType()
      }
    };
    
    return await this.createThread(request);
  }
  
  /**
   * 创建线程实例
   */
  private async createThreadInstance(
    request: ThreadCreationRequest,
    resources: ResourceAllocation
  ): Promise<ThreadExecutor> {
    switch (request.threadType) {
      case ThreadType.MAIN:
        return new MainThreadExecutor(request, resources);
      case ThreadType.CHILD:
        return new ChildThreadExecutor(request, resources);
      case ThreadType.PARALLEL:
        return new ParallelThreadExecutor(request, resources);
      case ThreadType.RECOVERY:
        return new RecoveryThreadExecutor(request, resources);
      case ThreadType.RETRY:
        return new RetryThreadExecutor(request, resources);
      default:
        throw new Error(`不支持的线程类型: ${request.threadType}`);
    }
  }
}
```

### 线程初始化流程

```typescript
/**
 * 线程初始化器
 */
export class ThreadInitializer {
  /**
   * 初始化线程
   */
  public async initialize(thread: ThreadExecutor, request: ThreadCreationRequest): Promise<void> {
    // 1. 设置基本属性
    thread.setId(ID.generate());
    thread.setType(request.threadType);
    thread.setPriority(request.priority);
    thread.setSessionId(request.sessionId);
    thread.setWorkflowId(request.workflowId);
    
    // 2. 初始化执行上下文
    await this.initializeExecutionContext(thread, request.context);
    
    // 3. 初始化状态管理
    await this.initializeStateManagement(thread);
    
    // 4. 初始化监控
    await this.initializeMonitoring(thread);
    
    // 5. 初始化错误处理
    await this.initializeErrorHandling(thread);
    
    // 6. 设置元数据
    thread.setMetadata(request.metadata);
  }
  
  /**
   * 初始化执行上下文
   */
  private async initializeExecutionContext(
    thread: ThreadExecutor, 
    context: ExecutionContext
  ): Promise<void> {
    // 1. 创建线程本地上下文
    const threadContext = context.createThreadContext(thread.id);
    
    // 2. 设置上下文变量
    threadContext.setVariable('threadId', thread.id);
    threadContext.setVariable('threadType', thread.type);
    threadContext.setVariable('startTime', new Date());
    
    // 3. 绑定到线程
    thread.bindExecutionContext(threadContext);
  }
  
  /**
   * 初始化状态管理
   */
  private async initializeStateManagement(thread: ThreadExecutor): Promise<void> {
    // 1. 创建状态存储
    const stateStore = new ThreadStateStore(thread.id);
    
    // 2. 初始化状态
    await stateStore.initialize({
      status: ThreadStatus.CREATED,
      progress: 0,
      startTime: new Date(),
      checkpoints: []
    });
    
    // 3. 绑定状态管理器
    thread.bindStateManager(new ThreadStateManager(stateStore));
  }
}
```

## 线程销毁机制

### 销毁场景分析

1. **正常完成**: 工作流执行完成后销毁
2. **异常终止**: 发生不可恢复错误时销毁
3. **用户取消**: 用户主动取消时销毁
4. **超时销毁**: 执行超时时强制销毁
5. **资源回收**: 系统资源不足时销毁低优先级线程

### 线程销毁架构

```typescript
/**
 * 线程销毁器接口
 */
export interface IThreadDestroyer {
  destroyThread(threadId: ID, reason: DestructionReason): Promise<void>;
  destroyThreadGracefully(threadId: ID, timeout: number): Promise<void>;
  destroyThreadForcefully(threadId: ID): Promise<void>;
  destroyChildThreads(parentThreadId: ID): Promise<void>;
}

/**
 * 销毁原因枚举
 */
export enum DestructionReason {
  COMPLETED = 'completed',       // 正常完成
  FAILED = 'failed',            // 执行失败
  CANCELLED = 'cancelled',      // 用户取消
  TIMEOUT = 'timeout',          // 执行超时
  RESOURCE_CLEANUP = 'resource_cleanup', // 资源清理
  SYSTEM_SHUTDOWN = 'system_shutdown'     // 系统关闭
}

/**
 * 线程销毁器实现
 */
export class ThreadDestroyer implements IThreadDestroyer {
  constructor(
    private readonly threadRepository: ThreadRepository,
    private readonly resourceManager: IResourceManager,
    private readonly stateManager: IThreadStateManager,
    private readonly logger: ILogger
  ) {}
  
  /**
   * 销毁线程
   */
  public async destroyThread(threadId: ID, reason: DestructionReason): Promise<void> {
    try {
      const thread = await this.getThreadById(threadId);
      
      this.logger.info('开始销毁线程', {
        threadId,
        reason,
        currentStatus: thread.getStatus()
      });
      
      // 1. 停止执行
      await this.stopExecution(thread);
      
      // 2. 保存最终状态
      await this.saveFinalState(thread, reason);
      
      // 3. 清理资源
      await this.cleanupResources(thread);
      
      // 4. 清理子线程
      await this.cleanupChildThreads(thread);
      
      // 5. 移除注册
      await this.unregisterThread(thread);
      
      // 6. 记录销毁日志
      await this.logDestruction(thread, reason);
      
      this.logger.info('线程销毁完成', { threadId, reason });
    } catch (error) {
      this.logger.error('线程销毁失败', { threadId, error: error as Error });
      throw error;
    }
  }
  
  /**
   * 优雅销毁线程
   */
  public async destroyThreadGracefully(threadId: ID, timeout: number): Promise<void> {
    const thread = await this.getThreadById(threadId);
    
    // 1. 发送停止信号
    await thread.requestStop();
    
    // 2. 等待自然结束
    const stopPromise = this.waitForNaturalStop(thread);
    const timeoutPromise = this.createTimeoutPromise(timeout);
    
    try {
      await Promise.race([stopPromise, timeoutPromise]);
      
      // 3. 自然结束，正常销毁
      await this.destroyThread(threadId, DestructionReason.COMPLETED);
    } catch (error) {
      if (error instanceof TimeoutError) {
        // 4. 超时，强制销毁
        this.logger.warn('线程优雅销毁超时，强制销毁', { threadId, timeout });
        await this.destroyThreadForcefully(threadId);
      } else {
        throw error;
      }
    }
  }
  
  /**
   * 强制销毁线程
   */
  public async destroyThreadForcefully(threadId: ID): Promise<void> {
    const thread = await this.getThreadById(threadId);
    
    try {
      // 1. 强制停止执行
      await thread.forceStop();
      
      // 2. 中断所有IO操作
      await this.interruptIOOperations(thread);
      
      // 3. 强制释放资源
      await this.forceReleaseResources(thread);
      
      // 4. 标记为强制销毁
      await this.markForcefullyDestroyed(thread);
      
      // 5. 完成销毁流程
      await this.destroyThread(threadId, DestructionReason.FAILED);
    } catch (error) {
      this.logger.error('强制销毁线程失败', { threadId, error: error as Error });
      // 即使失败也要尝试基本清理
      await this.performBasicCleanup(thread);
    }
  }
  
  /**
   * 销毁子线程
   */
  public async destroyChildThreads(parentThreadId: ID): Promise<void> {
    const childThreads = await this.getChildThreads(parentThreadId);
    
    // 并行销毁所有子线程
    const destroyPromises = childThreads.map(child => 
      this.destroyThread(child.id, DestructionReason.RESOURCE_CLEANUP)
    );
    
    await Promise.allSettled(destroyPromises);
  }
  
  /**
   * 停止执行
   */
  private async stopExecution(thread: ThreadExecutor): Promise<void> {
    try {
      // 1. 发送停止信号
      await thread.requestStop();
      
      // 2. 等待当前步骤完成
      await thread.waitForCurrentStepCompletion();
      
      // 3. 中断后续步骤
      await thread.interruptRemainingSteps();
    } catch (error) {
      this.logger.warn('停止线程执行时发生错误', {
        threadId: thread.id,
        error: error as Error
      });
    }
  }
  
  /**
   * 清理资源
   */
  private async cleanupResources(thread: ThreadExecutor): Promise<void> {
    try {
      // 1. 释放分配的资源
      await this.resourceManager.releaseResources(thread.id);
      
      // 2. 关闭文件句柄
      await this.closeFileHandles(thread);
      
      // 3. 关闭网络连接
      await this.closeNetworkConnections(thread);
      
      // 4. 清理内存
      await this.cleanupMemory(thread);
    } catch (error) {
      this.logger.warn('清理线程资源时发生错误', {
        threadId: thread.id,
        error: error as Error
      });
    }
  }
}
```

## 线程Fork机制

### Fork场景分析

1. **分支执行**: 在特定节点创建分支执行
2. **并行处理**: 将大任务分解为并行子任务
3. **条件分支**: 根据条件创建不同的执行路径
4. **错误恢复**: 从错误点创建恢复分支
5. **版本控制**: 创建不同版本的执行分支

### Fork架构设计

```typescript
/**
 * 线程Fork管理器接口
 */
export interface IThreadForkManager {
  forkThread(parentThreadId: ID, forkRequest: ForkRequest): Promise<ID>;
  joinThread(childThreadId: ID): Promise<JoinResult>;
  mergeThreads(threadIds: ID[]): Promise<ID>;
  getForkTree(threadId: ID): Promise<ForkTree>;
}

/**
 * Fork请求
 */
export interface ForkRequest {
  forkPoint: string;           // Fork点标识
  forkType: ForkType;          // Fork类型
  context: ExecutionContext;   // Fork上下文
  data: unknown;               // Fork数据
  metadata: Record<string, unknown>;
}

/**
 * Fork类型枚举
 */
export enum ForkType {
  BRANCH = 'branch',           // 分支Fork
  PARALLEL = 'parallel',       // 并行Fork
  CONDITIONAL = 'conditional', // 条件Fork
  RECOVERY = 'recovery',       // 恢复Fork
  VERSION = 'version'          // 版本Fork
}

/**
 * 线程Fork管理器实现
 */
export class ThreadForkManager implements IThreadForkManager {
  constructor(
    private readonly threadFactory: IThreadFactory,
    private readonly threadRepository: ThreadRepository,
    private readonly stateManager: IThreadStateManager,
    private readonly logger: ILogger
  ) {}
  
  /**
   * Fork线程
   */
  public async forkThread(parentThreadId: ID, forkRequest: ForkRequest): Promise<ID> {
    try {
      const parentThread = await this.getThreadById(parentThreadId);
      
      this.logger.info('开始Fork线程', {
        parentThreadId,
        forkPoint: forkRequest.forkPoint,
        forkType: forkRequest.forkType
      });
      
      // 1. 验证Fork条件
      await this.validateForkConditions(parentThread, forkRequest);
      
      // 2. 保存父线程状态
      const parentState = await this.saveParentState(parentThread, forkRequest);
      
      // 3. 创建Fork上下文
      const forkContext = await this.createForkContext(parentThread, forkRequest);
      
      // 4. 创建子线程
      const childThread = await this.createChildThread(parentThread, forkRequest, forkContext);
      
      // 5. 建立Fork关系
      await this.establishForkRelation(parentThread, childThread, forkRequest);
      
      // 6. 初始化Fork状态
      await this.initializeForkState(childThread, parentState, forkRequest);
      
      // 7. 启动子线程
      await this.startChildThread(childThread);
      
      this.logger.info('线程Fork完成', {
        parentThreadId,
        childThreadId: childThread.id,
        forkPoint: forkRequest.forkPoint
      });
      
      return childThread.id;
    } catch (error) {
      this.logger.error('线程Fork失败', {
        parentThreadId,
        forkPoint: forkRequest.forkPoint,
        error: error as Error
      });
      throw error;
    }
  }
  
  /**
   * Join线程
   */
  public async joinThread(childThreadId: ID): Promise<JoinResult> {
    try {
      const childThread = await this.getThreadById(childThreadId);
      const parentThread = await this.getParentThread(childThread);
      
      this.logger.info('开始Join线程', {
        childThreadId,
        parentThreadId: parentThread.id
      });
      
      // 1. 等待子线程完成
      await this.waitForThreadCompletion(childThread);
      
      // 2. 收集执行结果
      const childResult = await this.collectExecutionResult(childThread);
      
      // 3. 合并到父线程
      const mergeResult = await this.mergeToParent(parentThread, childThread, childResult);
      
      // 4. 清理Fork关系
      await this.cleanupForkRelation(parentThread, childThread);
      
      // 5. 销毁子线程
      await this.destroyChildThread(childThread);
      
      this.logger.info('线程Join完成', {
        childThreadId,
        parentThreadId: parentThread.id,
        mergeSuccess: mergeResult.success
      });
      
      return mergeResult;
    } catch (error) {
      this.logger.error('线程Join失败', {
        childThreadId,
        error: error as Error
      });
      throw error;
    }
  }
  
  /**
   * 合并线程
   */
  public async mergeThreads(threadIds: ID[]): Promise<ID> {
    try {
      this.logger.info('开始合并线程', { threadIds });
      
      // 1. 验证合并条件
      await this.validateMergeConditions(threadIds);
      
      // 2. 收集所有线程状态
      const threadStates = await this.collectThreadStates(threadIds);
      
      // 3. 创建合并线程
      const mergedThread = await this.createMergedThread(threadStates);
      
      // 4. 合并执行结果
      await this.mergeExecutionResults(mergedThread, threadStates);
      
      // 5. 清理原线程
      await this.cleanupOriginalThreads(threadIds);
      
      this.logger.info('线程合并完成', {
        originalThreadIds: threadIds,
        mergedThreadId: mergedThread.id
      });
      
      return mergedThread.id;
    } catch (error) {
      this.logger.error('线程合并失败', {
        threadIds,
        error: error as Error
      });
      throw error;
    }
  }
  
  /**
   * 获取Fork树
   */
  public async getForkTree(threadId: ID): Promise<ForkTree> {
    const thread = await this.getThreadById(threadId);
    const forkRelations = await this.getForkRelations(threadId);
    
    // 构建Fork树结构
    const tree = new ForkTree(thread);
    
    for (const relation of forkRelations) {
      if (relation.parentId === threadId) {
        const childTree = await this.getForkTree(relation.childId);
        tree.addChild(childTree);
      }
    }
    
    return tree;
  }
  
  /**
   * 验证Fork条件
   */
  private async validateForkConditions(
    parentThread: ThreadExecutor, 
    forkRequest: ForkRequest
  ): Promise<void> {
    // 1. 检查父线程状态
    if (!parentThread.canFork()) {
      throw new Error('父线程当前状态不允许Fork');
    }
    
    // 2. 检查Fork点有效性
    if (!await this.isValidForkPoint(parentThread, forkRequest.forkPoint)) {
      throw new Error(`无效的Fork点: ${forkRequest.forkPoint}`);
    }
    
    // 3. 检查资源可用性
    if (!await this.checkResourceAvailability(forkRequest)) {
      throw new Error('资源不足，无法Fork线程');
    }
    
    // 4. 检查Fork深度限制
    const forkDepth = await this.getForkDepth(parentThread.id);
    if (forkDepth >= this.getMaxForkDepth()) {
      throw new Error('Fork深度超过限制');
    }
  }
  
  /**
   * 创建Fork上下文
   */
  private async createForkContext(
    parentThread: ThreadExecutor, 
    forkRequest: ForkRequest
  ): Promise<ExecutionContext> {
    const parentContext = parentThread.getExecutionContext();
    
    // 1. 克隆父上下文
    const forkContext = parentContext.clone();
    
    // 2. 设置Fork特定信息
    forkContext.setVariable('forkPoint', forkRequest.forkPoint);
    forkContext.setVariable('forkType', forkRequest.forkType);
    forkContext.setVariable('forkTime', new Date());
    forkContext.setVariable('parentThreadId', parentThread.id);
    
    // 3. 注入Fork数据
    if (forkRequest.data) {
      forkContext.setVariable('forkData', forkRequest.data);
    }
    
    // 4. 设置Fork元数据
    forkContext.setMetadata('forkMetadata', forkRequest.metadata);
    
    return forkContext;
  }
  
  /**
   * 建立Fork关系
   */
  private async establishForkRelation(
    parentThread: ThreadExecutor,
    childThread: ThreadExecutor,
    forkRequest: ForkRequest
  ): Promise<void> {
    const relation: ForkRelation = {
      parentId: parentThread.id,
      childId: childThread.id,
      forkPoint: forkRequest.forkPoint,
      forkType: forkRequest.forkType,
      forkTime: new Date(),
      status: ForkRelationStatus.ACTIVE
    };
    
    await this.saveForkRelation(relation);
    
    // 更新父线程的子线程列表
    parentThread.addChildThread(childThread.id);
    
    // 更新子线程的父线程引用
    childThread.setParentThreadId(parentThread.id);
  }
}
```

## 线程生命周期监控

### 监控架构

```typescript
/**
 * 线程生命周期监控器
 */
export class ThreadLifecycleMonitor {
  private readonly eventBus: IEventBus;
  private readonly metricsCollector: IMetricsCollector;
  private readonly alertManager: IAlertManager;
  
  constructor(
    eventBus: IEventBus,
    metricsCollector: IMetricsCollector,
    alertManager: IAlertManager
  ) {
    this.eventBus = eventBus;
    this.metricsCollector = metricsCollector;
    this.alertManager = alertManager;
  }
  
  /**
   * 开始监控
   */
  public async startMonitoring(threads: ThreadExecutor[]): Promise<void> {
    // 1. 注册事件监听器
    this.registerEventListeners();
    
    // 2. 开始收集指标
    await this.metricsCollector.startCollection(threads);
    
    // 3. 启动健康检查
    await this.startHealthCheck(threads);
  }
  
  /**
   * 注册事件监听器
   */
  private registerEventListeners(): void {
    // 线程创建事件
    this.eventBus.subscribe(ThreadCreatedEvent, async (event) => {
      await this.handleThreadCreated(event);
    });
    
    // 线程销毁事件
    this.eventBus.subscribe(ThreadDestroyedEvent, async (event) => {
      await this.handleThreadDestroyed(event);
    });
    
    // 线程状态变更事件
    this.eventBus.subscribe(ThreadStatusChangedEvent, async (event) => {
      await this.handleThreadStatusChanged(event);
    });
    
    // 线程错误事件
    this.eventBus.subscribe(ThreadErrorEvent, async (event) => {
      await this.handleThreadError(event);
    });
  }
  
  /**
   * 处理线程创建事件
   */
  private async handleThreadCreated(event: ThreadCreatedEvent): Promise<void> {
    // 1. 记录创建指标
    this.metricsCollector.incrementCounter('thread.created', {
      threadType: event.threadType,
      sessionId: event.sessionId
    });
    
    // 2. 更新线程数量
    this.metricsCollector.setGauge('thread.count', event.totalThreadCount, {
      sessionId: event.sessionId
    });
    
    // 3. 检查线程数量限制
    if (event.totalThreadCount > this.getMaxThreadCount()) {
      await this.alertManager.sendAlert({
        type: AlertType.THREAD_COUNT_EXCEEDED,
        message: `线程数量超过限制: ${event.totalThreadCount}`,
        metadata: event
      });
    }
  }
  
  /**
   * 处理线程销毁事件
   */
  private async handleThreadDestroyed(event: ThreadDestroyedEvent): Promise<void> {
    // 1. 记录销毁指标
    this.metricsCollector.incrementCounter('thread.destroyed', {
      threadType: event.threadType,
      reason: event.reason,
      sessionId: event.sessionId
    });
    
    // 2. 更新线程数量
    this.metricsCollector.setGauge('thread.count', event.remainingThreadCount, {
      sessionId: event.sessionId
    });
    
    // 3. 记录执行时间
    if (event.executionTime) {
      this.metricsCollector.recordHistogram('thread.execution_time', event.executionTime, {
        threadType: event.threadType,
        sessionId: event.sessionId
      });
    }
  }
  
  /**
   * 健康检查
   */
  private async startHealthCheck(threads: ThreadExecutor[]): Promise<void> {
    setInterval(async () => {
      for (const thread of threads) {
        await this.performHealthCheck(thread);
      }
    }, this.getHealthCheckInterval());
  }
  
  /**
   * 执行健康检查
   */
  private async performHealthCheck(thread: ThreadExecutor): Promise<void> {
    try {
      // 1. 检查线程状态
      const status = thread.getStatus();
      if (this.isUnhealthyStatus(status)) {
        await this.handleUnhealthyThread(thread, status);
      }
      
      // 2. 检查资源使用
      const resourceUsage = await this.getResourceUsage(thread);
      if (this.isHighResourceUsage(resourceUsage)) {
        await this.handleHighResourceUsage(thread, resourceUsage);
      }
      
      // 3. 检查执行进度
      const progress = thread.getProgress();
      if (this.isStalled(progress)) {
        await this.handleStalledThread(thread, progress);
      }
    } catch (error) {
      this.logger.error('线程健康检查失败', {
        threadId: thread.id,
        error: error as Error
      });
    }
  }
}
```

## 最佳实践

### 线程创建最佳实践

1. **资源预检查**: 创建前检查资源可用性
2. **批量创建**: 支持批量创建以提高效率
3. **创建限流**: 限制创建速率防止资源耗尽
4. **异步创建**: 使用异步创建避免阻塞

### 线程销毁最佳实践

1. **优雅优先**: 优先使用优雅销毁
2. **超时保护**: 设置合理的超时时间
3. **资源清理**: 确保所有资源都被正确清理
4. **错误处理**: 妥善处理销毁过程中的错误

### Fork机制最佳实践

1. **深度限制**: 限制Fork深度防止无限递归
2. **状态隔离**: 确保Fork后的状态正确隔离
3. **资源共享**: 合理设计资源共享机制
4. **合并策略**: 定义清晰的合并策略

## 性能优化

### 创建优化

1. **对象池**: 使用对象池减少创建开销
2. **预分配**: 预分配资源提高创建速度
3. **批量操作**: 批量创建减少系统调用
4. **缓存策略**: 缓存常用配置和模板

### 销毁优化

1. **延迟销毁**: 延迟销毁重用资源
2. **批量清理**: 批量清理提高效率
3. **资源回收**: 及时回收可重用资源
4. **内存管理**: 优化内存分配和释放

### Fork优化

1. **写时复制**: 使用写时复制减少内存开销
2. **状态快照**: 优化状态快照机制
3. **增量同步**: 只同步变更的状态
4. **压缩存储**: 压缩存储Fork状态

## 总结

线程生命周期管理是复杂工作流执行系统的核心组件。通过精心设计的创建、销毁、Fork机制，可以构建一个高效、稳定、可扩展的执行引擎。关键是要在功能完整性和性能效率之间找到平衡，同时确保系统的可靠性和可维护性。
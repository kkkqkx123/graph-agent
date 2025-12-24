
#### 设计理念
让Thread专注于单线程的串行执行流程协调，Workflow专注于业务逻辑定义，Session负责多线程并行管理。

#### 职责分工

**Thread职责**:
- 串行执行流程协调
- 单线程内的状态管理
- 执行步骤的顺序控制
- 错误处理和恢复

**Workflow职责**:
- 业务逻辑定义
- 执行步骤声明
- 数据流定义
- 条件分支逻辑

**Session职责**:
- 多线程并行管理
- 线程创建、销毁、fork
- 资源分配和调度
- 线程间通信协调

#### 架构设计

```typescript
/**
 * Thread作为串行执行协调者
 */
export class ThreadExecutor extends AggregateRoot {
  private readonly executionContext: ExecutionContext;
  private readonly workflow: Workflow;
  private executionState: ExecutionState;
  
  constructor(workflow: Workflow, sessionContext: SessionContext) {
    super();
    this.workflow = workflow;
    this.executionContext = new ExecutionContext(sessionContext);
    this.executionState = ExecutionState.initial();
  }
  
  /**
   * 串行执行Workflow
   */
  public async executeSequentially(inputData: unknown): Promise<ExecutionResult> {
    try {
      // 1. 初始化执行环境
      await this.initializeExecution(inputData);
      
      // 2. 获取执行步骤
      const steps = this.workflow.getExecutionSteps();
      
      // 3. 串行执行每个步骤
      for (const step of steps) {
        await this.executeStep(step);
        
        // 4. 检查是否需要暂停或终止
        if (this.shouldPause()) {
          await this.pauseExecution();
          break;
        }
        
        if (this.shouldTerminate()) {
          await this.terminateExecution();
          break;
        }
      }
      
      // 5. 完成执行
      return await this.completeExecution();
    } catch (error) {
      return await this.handleExecutionError(error);
    }
  }
  
  /**
   * 执行单个步骤
   */
  private async executeStep(step: ExecutionStep): Promise<void> {
    // 1. 准备步骤执行环境
    const stepContext = this.prepareStepContext(step);
    
    // 2. 执行步骤逻辑
    const result = await step.execute(stepContext);
    
    // 3. 更新执行状态
    this.updateExecutionState(step, result);
    
    // 4. 记录执行日志
    this.logExecution(step, result);
  }
}
```

```typescript
/**
 * 简化的Workflow实体
 */
export class Workflow extends AggregateRoot {
  private readonly steps: ExecutionStep[];
  private readonly dataFlow: DataFlowDefinition;
  
  /**
   * 获取执行步骤
   */
  public getExecutionSteps(): ExecutionStep[] {
    return this.steps;
  }
  
  /**
   * 验证执行条件
   */
  public validateExecutionConditions(context: ExecutionContext): boolean {
    // 验证业务逻辑执行条件
    return this.dataFlow.validate(context);
  }
  
  /**
   * 不再管理执行状态
   * 专注于业务逻辑定义
   */
}
```

```typescript
/**
 * Session作为多线程管理器
 */
export class SessionManager extends AggregateRoot {
  private readonly threadPool: ThreadPool;
  private readonly resourceScheduler: ResourceScheduler;
  
  /**
   * 创建Thread
   */
  public async createThread(workflowId: ID): Promise<ID> {
    // 1. 验证资源可用性
    await this.resourceScheduler.checkAvailability();
    
    // 2. 创建Thread实例
    const thread = ThreadExecutor.create(workflowId, this.getContext());
    
    // 3. 分配资源
    await this.resourceScheduler.allocateResources(thread);
    
    // 4. 添加到线程池
    this.threadPool.addThread(thread);
    
    return thread.id;
  }
  
  /**
   * Fork Thread
   */
  public async forkThread(parentThreadId: ID, forkPoint: string): Promise<ID> {
    const parentThread = this.threadPool.getThread(parentThreadId);
    
    // 1. 保存父线程状态
    const parentState = await parentThread.saveState();
    
    // 2. 创建子线程
    const childThread = ThreadExecutor.fork(parentThread, forkPoint, parentState);
    
    // 3. 分配资源
    await this.resourceScheduler.allocateResources(childThread);
    
    // 4. 添加到线程池
    this.threadPool.addThread(childThread);
    
    return childThread.id;
  }
  
  /**
   * 销毁Thread
   */
  public async destroyThread(threadId: ID): Promise<void> {
    const thread = this.threadPool.getThread(threadId);
    
    // 1. 停止执行
    await thread.terminate();
    
    // 2. 释放资源
    await this.resourceScheduler.releaseResources(thread);
    
    // 3. 从线程池移除
    this.threadPool.removeThread(threadId);
  }
}
```

#### 优势分析

1. **职责清晰**: 每个组件职责明确，易于理解和维护
2. **性能优化**: Thread专注串行执行，减少同步开销
3. **扩展性强**: Session可以灵活管理多种并行策略
4. **测试友好**: 各层可以独立测试

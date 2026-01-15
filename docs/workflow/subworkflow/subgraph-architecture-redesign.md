# SubgraphNode 架构重设计

## 核心原则：避免循环依赖

**问题识别**：
- 当前 `SubgraphNode` 直接调用 `WorkflowService` 或 `Thread`
- 节点层（Infrastructure）依赖执行层（Application）
- 导致循环依赖和职责不清

**解决方案**：
- `SubgraphNode` 作为纯数据结构，仅标识节点类型
- `NodeExecutor` 识别子工作流节点，调用 Thread 层能力
- Thread 层提供子工作流执行能力，管理完整生命周期

## 职责重新划分

### 1. Domain 层 - 纯数据结构

#### SubgraphNode (简化版)
```typescript
export class SubgraphNode extends Node {
  constructor(
    id: NodeId,
    public readonly referenceId: string,  // 引用ID，不直接持有工作流ID
    public readonly config: SubgraphConfig,  // 配置对象
    name?: string,
    description?: string,
    position?: { x: number; y: number }
  ) {
    super(
      id,
      NodeType.subworkflow(NodeContextTypeValue.ISOLATE),
      name || 'Subgraph',
      description,
      position
    );
  }

  // 纯数据方法，不执行逻辑
  getReferenceId(): string {
    return this.referenceId;
  }

  getConfig(): SubgraphConfig {
    return this.config;
  }

  // 验证配置有效性
  validate(): ValidationResult {
    const errors: string[] = [];
    
    if (!this.referenceId || typeof this.referenceId !== 'string') {
      errors.push('referenceId 必须是有效的字符串');
    }

    if (!this.config) {
      errors.push('config 是必需的');
    } else {
      // 验证配置结构
      const configValidation = this.validateConfig(this.config);
      if (!configValidation.valid) {
        errors.push(...configValidation.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private validateConfig(config: SubgraphConfig): ValidationResult {
    const errors: string[] = [];

    // 验证输入映射
    if (config.inputMappings) {
      for (const mapping of config.inputMappings) {
        if (!mapping.source || !mapping.target) {
          errors.push('inputMapping 必须包含 source 和 target');
        }
      }
    }

    // 验证输出映射
    if (config.outputMappings) {
      for (const mapping of config.outputMappings) {
        if (!mapping.source || !mapping.target) {
          errors.push('outputMapping 必须包含 source 和 target');
        }
      }
    }

    // 验证错误处理配置
    if (config.errorHandling) {
      if (!['propagate', 'catch', 'ignore'].includes(config.errorHandling.strategy)) {
        errors.push('errorHandling.strategy 必须是 propagate、catch 或 ignore');
      }
    }

    // 验证超时配置
    if (config.timeout !== undefined) {
      if (typeof config.timeout !== 'number' || config.timeout <= 0) {
        errors.push('timeout 必须是正数');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// 配置接口
export interface SubgraphConfig {
  // 输入参数映射
  inputMappings?: VariableMapping[];
  
  // 输出参数映射
  outputMappings?: VariableMapping[];
  
  // 错误处理配置
  errorHandling?: {
    strategy: 'propagate' | 'catch' | 'ignore';
    fallbackValue?: any;
    retryConfig?: {
      maxRetries: number;
      delay: number;
    };
  };
  
  // 超时配置（毫秒）
  timeout?: number;
  
  // 其他扩展配置
  [key: string]: any;
}

export interface VariableMapping {
  source: string;      // 源变量路径
  target: string;      // 目标变量路径
  transform?: string;  // 转换函数表达式
}
```

### 2. Infrastructure 层 - 执行协调

#### NodeExecutor (增强版)
```typescript
export class NodeExecutor {
  constructor(
    private readonly threadService: ThreadService,  // 依赖 Application 层
    private readonly expressionEvaluator: ExpressionEvaluator,
    private readonly logger: ILogger
  ) {}

  async execute(
    node: Node,
    context: WorkflowExecutionContext,
    options: NodeExecutionOptions = {}
  ): Promise<NodeExecutionResult> {
    // 1. 识别节点类型
    if (node.type.isSubworkflow()) {
      // 2. 子工作流节点，调用 Thread 层执行
      return await this.executeSubgraphNode(node as SubgraphNode, context, options);
    }
    
    // 3. 普通节点，正常执行
    return await this.executeRegularNode(node, context, options);
  }

  private async executeSubgraphNode(
    node: SubgraphNode,
    context: WorkflowExecutionContext,
    options: NodeExecutionOptions
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('开始执行子工作流节点', {
        nodeId: node.nodeId.toString(),
        referenceId: node.getReferenceId(),
      });

      // 1. 获取父 Thread
      const parentThread = context.getService<Thread>('Thread');
      if (!parentThread) {
        throw new Error('Thread 服务不可用');
      }

      // 2. 调用 Thread 层的子工作流执行能力
      const subWorkflowResult = await this.threadService.executeSubWorkflow(
        parentThread,
        node.getReferenceId(),
        node.getConfig(),
        context
      );

      return {
        nodeId: node.nodeId,
        status: subWorkflowResult.status,
        result: subWorkflowResult.output,
        subWorkflowExecutionId: subWorkflowResult.threadId,
        executionTime: Date.now() - startTime,
      };
      
    } catch (error) {
      return this.handleSubgraphExecutionError(node, error, startTime, context);
    }
  }

  private async executeRegularNode(
    node: Node,
    context: WorkflowExecutionContext,
    options: NodeExecutionOptions
  ): Promise<NodeExecutionResult> {
    // 普通节点执行逻辑...
    return await node.execute(context);
  }

  private handleSubgraphExecutionError(
    node: SubgraphNode,
    error: any,
    startTime: number,
    context: WorkflowExecutionContext
  ): NodeExecutionResult {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    this.logger.error('子工作流节点执行失败', error as Error, {
      nodeId: node.nodeId.toString(),
      referenceId: node.getReferenceId(),
    });

    // 根据配置决定错误处理策略
    const config = node.getConfig();
    const errorHandling = config.errorHandling || { strategy: 'propagate' as const };

    switch (errorHandling.strategy) {
      case 'propagate':
        throw error;

      case 'catch':
        return {
          nodeId: node.nodeId,
          status: 'failed' as const,
          error: errorMessage,
          result: errorHandling.fallbackValue,
          executionTime,
        };

      case 'ignore':
        return {
          nodeId: node.nodeId,
          status: 'completed' as const,
          result: errorHandling.fallbackValue,
          executionTime,
        };
    }
  }
}
```

### 3. Application 层 - 业务实现

#### ThreadService (新增子工作流执行能力)
```typescript
export class ThreadService {
  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly threadRepository: ThreadRepository,
    private readonly workflowExecutionEngine: WorkflowExecutionEngine,
    private readonly expressionEvaluator: ExpressionEvaluator,
    private readonly logger: ILogger
  ) {}

  /**
   * 执行子工作流
   * 
   * @param parentThread 父线程
   * @param referenceId 子工作流引用ID
   * @param config 子工作流配置
   * @param parentContext 父上下文
   * @returns 子工作流执行结果
   */
  async executeSubWorkflow(
    parentThread: Thread,
    referenceId: string,
    config: SubgraphConfig,
    parentContext: WorkflowExecutionContext
  ): Promise<SubWorkflowExecutionResult> {
    const startTime = Date.now();
    
    try {
      // 1. 获取 Workflow 定义
      const workflow = parentThread.getWorkflow();
      if (!workflow) {
        throw new Error('父线程没有关联的工作流');
      }

      // 2. 查找子工作流引用
      const subWorkflowRef = workflow.getSubWorkflowReference(referenceId);
      if (!subWorkflowRef) {
        throw new Error(`未找到子工作流引用: ${referenceId}`);
      }

      // 3. 加载子工作流定义
      const subWorkflow = await this.workflowRepository.findById(
        subWorkflowRef.workflowId
      );
      if (!subWorkflow) {
        throw new Error(`子工作流不存在: ${subWorkflowRef.workflowId.toString()}`);
      }

      this.logger.info('加载子工作流定义', {
        referenceId,
        workflowId: subWorkflowRef.workflowId.toString(),
      });

      // 4. 创建子线程
      const subThread = await this.createSubWorkflowThread(
        parentThread,
        subWorkflowRef.workflowId,
        config
      );

      // 5. 映射输入变量
      const subWorkflowInput = this.mapInputVariables(
        parentContext,
        subWorkflowRef.inputMapping,
        config.inputMappings
      );

      // 6. 执行子工作流
      const subWorkflowResult = await this.executeWorkflowInThread(
        subThread,
        subWorkflow,
        subWorkflowInput,
        config
      );

      // 7. 映射输出变量
      const outputVariables = this.mapOutputVariables(
        subWorkflowResult,
        subWorkflowRef.outputMapping,
        config.outputMappings
      );

      // 8. 更新父线程上下文
      parentThread.updateContext(outputVariables);

      return {
        threadId: subThread.id,
        status: subWorkflowResult.status,
        output: subWorkflowResult.output,
        executionTime: Date.now() - startTime,
      };
      
    } catch (error) {
      this.logger.error('子工作流执行失败', error as Error, { referenceId });
      throw error;
    }
  }

  /**
   * 创建子工作流线程
   */
  private async createSubWorkflowThread(
    parentThread: Thread,
    workflowId: ID,
    config: SubgraphConfig
  ): Promise<Thread> {
    // 创建子线程，关联父线程
    const subThread = Thread.create(
      parentThread.sessionId,
      workflowId,
      parentThread.priority,
      `子工作流: ${workflowId.toString()}`,
      undefined,
      {
        parentThreadId: parentThread.id.toString(),
        isSubWorkflow: true,
        timeout: config.timeout,
      }
    );

    // 保存子线程
    await this.threadRepository.save(subThread);
    
    this.logger.info('创建子工作流线程', {
      parentThreadId: parentThread.id.toString(),
      subThreadId: subThread.id.toString(),
      workflowId: workflowId.toString(),
    });

    return subThread;
  }

  /**
   * 在线程中执行工作流
   */
  private async executeWorkflowInThread(
    thread: Thread,
    workflow: Workflow,
    inputVariables: Map<string, any>,
    config: SubgraphConfig
  ): Promise<WorkflowExecutionResult> {
    // 1. 启动线程
    const runningThread = thread.start();
    await this.threadRepository.save(runningThread);

    // 2. 设置输入变量
    const context = runningThread.execution.context;
    for (const [key, value] of inputVariables) {
      context.setVariable(key, value);
    }

    // 3. 执行工作流
    const executionResult = await this.workflowExecutionEngine.execute(
      workflow,
      context
    );

    // 4. 更新线程状态
    const completedThread = executionResult.success
      ? runningThread.complete()
      : runningThread.fail(executionResult.error || '执行失败');
    
    await this.threadRepository.save(completedThread);

    return executionResult;
  }

  /**
   * 映射输入变量
   */
  private mapInputVariables(
    parentContext: WorkflowExecutionContext,
    workflowMapping: Map<string, string>,  // Workflow 定义的映射
    configMappings: VariableMapping[] = []  // 节点配置的映射
  ): Map<string, any> {
    const result = new Map<string, any>();
    
    // 1. 应用 Workflow 级别的映射
    for (const [target, source] of workflowMapping) {
      const value = parentContext.getVariable(source);
      result.set(target, value);
    }
    
    // 2. 应用节点配置的映射（可以覆盖 Workflow 映射）
    for (const mapping of configMappings) {
      const value = parentContext.getVariable(mapping.source);
      const transformedValue = this.applyTransform(value, mapping.transform);
      result.set(mapping.target, transformedValue);
    }
    
    return result;
  }

  /**
   * 映射输出变量
   */
  private mapOutputVariables(
    subWorkflowResult: WorkflowExecutionResult,
    workflowMapping: Map<string, string>,  // Workflow 定义的映射
    configMappings: VariableMapping[] = []  // 节点配置的映射
  ): Map<string, any> {
    const result = new Map<string, any>();
    const subOutputs = subWorkflowResult.output || {};
    
    // 1. 应用 Workflow 级别的映射
    for (const [target, source] of workflowMapping) {
      const value = this.extractValue(subOutputs, source);
      result.set(target, value);
    }
    
    // 2. 应用节点配置的映射（可以覆盖 Workflow 映射）
    for (const mapping of configMappings) {
      const value = this.extractValue(subOutputs, mapping.source);
      const transformedValue = this.applyTransform(value, mapping.transform);
      result.set(mapping.target, transformedValue);
    }
    
    return result;
  }

  /**
   * 应用转换函数
   */
  private applyTransform(value: any, transform?: string): any {
    if (!transform) return value;
    
    try {
      return this.expressionEvaluator.evaluate(transform, { value });
    } catch (error) {
      this.logger.warn('转换函数执行失败', error as Error, { transform, value });
      return value;  // 转换失败返回原值
    }
  }

  /**
   * 提取值（支持路径表达式）
   */
  private extractValue(obj: any, path: string): any {
    if (!path.includes('.')) {
      return obj[path];
    }
    
    // 支持简单的路径表达式，如: "result.data.items"
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current == null) return undefined;
      current = current[key];
    }
    
    return current;
  }
}

// 子工作流执行结果接口
export interface SubWorkflowExecutionResult {
  threadId: ID;
  status: 'completed' | 'failed' | 'cancelled';
  output: any;
  executionTime: number;
}
```

## 依赖关系分析

### 依赖方向（正确）

```
Domain 层
  ↑ (依赖)
Infrastructure 层
  ↑ (依赖)
Application 层
```

- **Domain** 不依赖任何层（纯数据结构）
- **Infrastructure** 依赖 Domain，调用 Application
- **Application** 实现业务逻辑，不依赖 Infrastructure

### 关键接口

```typescript
// Domain 层接口
interface Node {
  execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult>;
  validate(): ValidationResult;
  getMetadata(): NodeMetadata;
}

interface Thread {
  getWorkflow(): Workflow;
  updateContext(variables: Map<string, any>): void;
  // ... 其他状态管理方法
}

interface Workflow {
  getSubWorkflowReference(referenceId: string): WorkflowReference | undefined;
  // ... 其他工作流定义方法
}

// Application 层接口
interface ThreadService {
  executeSubWorkflow(
    parentThread: Thread,
    referenceId: string,
    config: SubgraphConfig,
    parentContext: WorkflowExecutionContext
  ): Promise<SubWorkflowExecutionResult>;
}
```

## 优势

### 1. 清晰的职责划分
- **SubgraphNode**：纯数据结构，只负责定义
- **NodeExecutor**：执行协调，识别节点类型
- **ThreadService**：业务实现，管理子工作流生命周期

### 2. 避免循环依赖
- Domain 层不依赖任何执行细节
- Infrastructure 层通过接口调用 Application 层
- 各层职责单一，易于测试和维护

### 3. 更好的可扩展性
- 新增节点类型只需修改 NodeExecutor
- 子工作流逻辑集中在 ThreadService
- 支持多种子工作流执行策略

### 4. 完整的上下文隔离
- 父子工作流上下文完全隔离
- 通过显式映射传递数据
- 支持转换函数和复杂表达式

## 实施步骤

### 第一阶段：Domain 层重构
1. 简化 `SubgraphNode`，移除执行逻辑
2. 定义 `SubgraphConfig` 和 `VariableMapping` 接口
3. 更新验证逻辑

### 第二阶段：Application 层实现
1. 在 `ThreadService` 中实现 `executeSubWorkflow` 方法
2. 实现变量映射和转换逻辑
3. 添加错误处理和重试机制

### 第三阶段：Infrastructure 层集成
1. 增强 `NodeExecutor`，识别子工作流节点
2. 集成 `ThreadService` 调用
3. 实现错误处理策略

### 第四阶段：测试和优化
1. 单元测试各层逻辑
2. 集成测试完整流程
3. 性能优化和监控

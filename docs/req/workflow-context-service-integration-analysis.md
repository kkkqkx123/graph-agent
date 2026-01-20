# 工作流上下文Service层集成分析

## 1. 当前Service层上下文使用现状

### 1.1 WorkflowExecutionEngine
```typescript
// src/services/workflow/workflow-execution.ts
public async execute(
  workflow: Workflow,
  context: ExecutionContext  // 当前使用ExecutionContext
): Promise<WorkflowExecutionResult>
```

### 1.2 NodeExecutor
```typescript
// src/services/workflow/nodes/node-executor.ts
async execute(
  node: Node,
  context: WorkflowExecutionContext  // 当前使用WorkflowExecutionContext
): Promise<NodeExecutionResult>
```

### 1.3 LLMNode
```typescript
// src/services/workflow/nodes/llm-node.ts
async execute(context: WorkflowExecutionContext): Promise<NodeExecutionResult>
```

## 2. 集成方案分析

### 2.1 方案一：直接替换（推荐）

**优点**：
- 代码简洁，直接使用新的WorkflowContext
- 充分利用不可变更新模式
- 避免双重维护

**缺点**：
- 需要修改所有使用上下文的组件
- 可能破坏现有功能

**实现步骤**：
1. 修改`WorkflowExecutionEngine`使用`WorkflowContext`
2. 修改`NodeExecutor`使用`WorkflowContext`
3. 修改各节点类型使用`WorkflowContext`
4. 更新依赖注入配置

### 2.2 方案二：适配器模式

**优点**：
- 保持现有API不变
- 渐进式迁移
- 风险较低

**缺点**：
- 增加代码复杂度
- 可能存在性能开销
- 需要维护两套系统

**实现步骤**：
1. 创建`WorkflowContextAdapter`适配器
2. 适配器内部使用新的WorkflowContext
3. 对外暴露与ExecutionContext兼容的接口
4. 逐步迁移组件使用适配器

### 2.3 方案三：双轨运行

**优点**：
- 完全兼容现有系统
- 新功能使用新系统
- 便于对比和验证

**缺点**：
- 代码复杂度高
- 维护成本增加
- 可能导致数据不一致

## 3. 推荐方案：直接替换

### 3.1 实现策略

#### 3.1.1 创建ContextManagement服务
```typescript
// src/services/workflow/context-management.ts
@injectable()
export class ContextManagement {
  private readonly contexts: Map<string, WorkflowContext>;

  constructor(
    @inject('Logger') private readonly logger: ILogger
  ) {
    this.contexts = new Map();
  }

  /**
   * 创建工作流上下文
   */
  createContext(workflowId: string, executionId: string): WorkflowContext {
    const context = WorkflowContext.create(workflowId, executionId);
    this.contexts.set(executionId, context);
    return context;
  }

  /**
   * 获取工作流上下文
   */
  getContext(executionId: string): WorkflowContext | null {
    return this.contexts.get(executionId) || null;
  }

  /**
   * 更新工作流上下文
   */
  updateContext(
    executionId: string,
    updater: (context: WorkflowContext) => WorkflowContext
  ): void {
    const context = this.contexts.get(executionId);
    if (context) {
      const newContext = updater(context);
      this.contexts.set(executionId, newContext);
    }
  }

  /**
   * 删除工作流上下文
   */
  deleteContext(executionId: string): void {
    this.contexts.delete(executionId);
  }
}
```

#### 3.1.2 修改WorkflowExecutionEngine
```typescript
// src/services/workflow/workflow-execution.ts
@injectable()
export class WorkflowExecutionEngine {
  constructor(
    @inject('NodeRouter') private readonly nodeRouter: NodeRouter,
    @inject('NodeExecutor') private readonly nodeExecutor: NodeExecutor,
    @inject('EdgeExecutor') private readonly edgeExecutor: EdgeExecutor,
    @inject('ContextManagement') private readonly contextManagement: ContextManagement,
    @inject('Logger') private readonly logger: ILogger
  ) {}

  public async execute(
    workflow: Workflow,
    executionId: string
  ): Promise<WorkflowExecutionResult> {
    // 创建工作流上下文
    let context = this.contextManagement.createContext(
      workflow.workflowId.toString(),
      executionId
    );

    const startTime = Date.now();
    const executedNodes: NodeId[] = [];
    const results = new Map<NodeId, unknown>();
    let currentNodeId: NodeId | null = null;

    try {
      // 获取起始节点
      const startNodes = this.nodeRouter.getStartNodes(workflow);
      if (startNodes.length === 0) {
        throw new Error('工作流没有起始节点');
      }

      currentNodeId = startNodes[0] || null;

      // 遍历执行节点
      while (currentNodeId) {
        // 设置当前节点
        context = context.setCurrentNode(currentNodeId.toString());

        // 标记节点开始执行
        context = context.appendNodeExecution(
          NodeExecutionState.create(currentNodeId.toString(), NodeStatusValue.RUNNING).start()
        );

        // 执行节点
        const node = this.nodeRouter.getNode(workflow, currentNodeId);
        const result = await this.nodeExecutor.execute(node, context);

        executedNodes.push(currentNodeId);
        results.set(currentNodeId, result.output);

        // 标记节点完成
        context = context.updateNodeExecution(currentNodeId.toString(), {
          status: NodeStatusValue.COMPLETED,
          endTime: new Date(),
          executionTime: result.executionTime,
          result: result.output
        });

        // 确定下一个节点
        const decision = await this.determineNextNode(workflow, currentNodeId, context);
        currentNodeId = decision.nextNodeId;

        if (!currentNodeId) {
          context = context.completeWorkflow();
          this.logger.info('工作流执行完成', { executedNodes: executedNodes.length });
          break;
        }
      }

      return {
        success: true,
        executedNodes,
        results,
        duration: Date.now() - startTime,
        statistics: context.getExecutionStatistics(),
      };
    } catch (error) {
      context = context.failWorkflow(error instanceof Error ? error.message : String(error));
      this.logger.error('工作流执行失败', error as Error, { executedNodes });

      return {
        success: false,
        executedNodes,
        results,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        statistics: context.getExecutionStatistics(),
      };
    }
  }
}
```

#### 3.1.3 修改NodeExecutor
```typescript
// src/services/workflow/nodes/node-executor.ts
@injectable()
export class NodeExecutor {
  constructor(
    @inject('Logger') private readonly logger: ILogger,
    @inject(TYPES.ThreadExecution) private readonly threadExecution: ThreadExecution
  ) {}

  async execute(
    node: Node,
    context: WorkflowContext,
    options: NodeExecutionOptions = {}
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    this.logger.debug('开始执行节点', {
      nodeId: node.nodeId.toString(),
      nodeType: node.type.toString(),
      nodeName: node.name,
    });

    try {
      // 验证节点配置
      const validation = node.validate();
      if (!validation.valid) {
        this.logger.warn('节点配置验证失败', {
          nodeId: node.nodeId.toString(),
          nodeType: node.type.toString(),
          errors: validation.errors,
        });

        return {
          success: false,
          error: `节点配置验证失败: ${validation.errors.join(', ')}`,
          executionTime: Date.now() - startTime,
        };
      }

      // 检查是否应该跳过执行
      if (options.verboseLogging) {
        context = context.updateMetadata({
          lastNodeExecution: {
            nodeId: node.nodeId.toString(),
            startTime: new Date().toISOString(),
          },
        });
      }

      // 执行节点逻辑
      const result = await this.executeNodeLogic(node, context);

      return {
        ...result,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('节点执行失败', error as Error, {
        nodeId: node.nodeId.toString(),
        nodeType: node.type.toString(),
      });

      return {
        success: false,
        error: errorMessage,
        executionTime: Date.now() - startTime,
      };
    }
  }

  private async executeNodeLogic(
    node: Node,
    context: WorkflowContext
  ): Promise<NodeExecutionResult> {
    // 根据节点类型分发执行
    switch (node.type.toString()) {
      case 'llm':
        return this.executeLLMNode(node as LLMNode, context);
      case 'tool-call':
        return this.executeToolCallNode(node as ToolCallNode, context);
      case 'condition':
        return this.executeConditionNode(node as ConditionNode, context);
      // ... 其他节点类型
      default:
        return this.executeDefaultNode(node, context);
    }
  }

  private async executeLLMNode(
    node: LLMNode,
    context: WorkflowContext
  ): Promise<NodeExecutionResult> {
    // 追加用户输入到提示词历史
    let updatedContext = context.appendPromptHistory({
      nodeId: node.nodeId.toString(),
      type: 'input',
      role: 'user',
      content: typeof node.prompt === 'string' ? node.prompt : JSON.stringify(node.prompt),
      timestamp: new Date(),
    });

    // 调用LLM
    const response = await this.callLLM(node, updatedContext);

    // 追加LLM输出到提示词历史
    updatedContext = updatedContext.appendPromptHistory({
      nodeId: node.nodeId.toString(),
      type: 'output',
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      metadata: {
        model: response.model,
        tokens: response.usage?.totalTokens,
      },
    });

    return {
      success: true,
      output: response,
    };
  }

  private async executeToolCallNode(
    node: ToolCallNode,
    context: WorkflowContext
  ): Promise<NodeExecutionResult> {
    // 添加工具调用到提示词历史
    let updatedContext = context.appendPromptHistory({
      nodeId: node.nodeId.toString(),
      type: 'tool_call',
      role: 'assistant',
      content: JSON.stringify(node.toolCall),
      timestamp: new Date(),
      metadata: {
        toolName: node.toolName,
        parameters: node.parameters,
      },
    });

    // 执行工具调用
    const result = await this.callTool(node);

    // 添加工具结果到提示词历史
    updatedContext = updatedContext.appendPromptHistory({
      nodeId: node.nodeId.toString(),
      type: 'tool_result',
      role: 'tool',
      content: JSON.stringify(result),
      timestamp: new Date(),
      metadata: {
        toolName: node.toolName,
        success: result.success,
      },
    });

    return {
      success: result.success,
      output: result,
    };
  }
}
```

### 3.2 依赖注入配置

```typescript
// src/di/service-keys.ts
export const TYPES = {
  // ... 现有类型
  ContextManagement: 'ContextManagement',
};

// src/di/container.ts
import { Container } from 'inversify';
import { ContextManagement } from '../services/workflow/context-management';

const container = new Container();

// 绑定ContextManagement服务
container.bind<ContextManagement>(TYPES.ContextManagement)
  .to(ContextManagement)
  .inSingletonScope();
```

## 4. 迁移步骤

### 4.1 第一阶段：创建基础设施
1. 创建`ContextManagement`服务
2. 更新依赖注入配置
3. 添加单元测试

### 4.2 第二阶段：修改WorkflowExecutionEngine
1. 修改`execute`方法使用`WorkflowContext`
2. 更新节点执行逻辑
3. 更新结果收集逻辑

### 4.3 第三阶段：修改NodeExecutor
1. 修改`execute`方法签名
2. 更新节点类型执行逻辑
3. 添加提示词历史记录

### 4.4 第四阶段：更新节点类型
1. 更新LLMNode
2. 更新ToolCallNode
3. 更新其他节点类型

### 4.5 第五阶段：清理和优化
1. 移除旧的上下文引用
2. 优化性能
3. 更新文档

## 5. 风险评估

### 5.1 技术风险
- **风险**: 现有代码依赖ExecutionContext
- **缓解**: 提供迁移指南，逐步替换
- **风险**: 性能影响
- **缓解**: 进行性能测试，优化关键路径

### 5.2 业务风险
- **风险**: 破坏现有功能
- **缓解**: 全面的测试覆盖，灰度发布
- **风险**: 学习成本
- **缓解**: 提供详细的文档和示例

## 6. 验证计划

### 6.1 单元测试
- 测试ContextManagement服务
- 测试WorkflowContext的append操作
- 测试节点执行逻辑

### 6.2 集成测试
- 测试完整的工作流执行流程
- 测试上下文传递和更新
- 测试错误处理和恢复

### 6.3 性能测试
- 测试上下文更新性能
- 测试内存使用情况
- 测试并发执行能力

# ThreadExecutor 重构计划（V2）

## 问题分析

`ThreadExecutor` 类当前存在严重的职责过多问题，违反了单一职责原则。该类同时承担了执行循环管理、节点协调、事件处理、错误处理、子图处理等多个不相关的职责，导致代码复杂度高、耦合性强、难以测试和维护。

### 当前主要职责

1. **主执行循环管理** - 控制整个线程的执行流程
2. **节点执行协调** - 调用不同类型的节点处理器
3. **LLM 节点特殊处理** - 直接处理 LLM、Tool、ContextProcessor、UserInteraction 节点
4. **事件管理** - 触发各种执行事件（NodeStarted、NodeCompleted 等）
5. **Hook 执行** - 执行节点的 BEFORE_EXECUTE 和 AFTER_EXECUTE hooks
6. **错误处理** - 处理节点执行失败和全局执行错误
7. **子图边界处理** - 处理子图的进入和退出逻辑
8. **变量路径解析** - 解析变量路径用于子图输入输出映射
9. **触发器协调** - 协调 TriggerManager 处理事件
10. **结果构建** - 构建最终的 ThreadResult

## 现有功能分析

### EventManager 现状
现有的 `EventManager` 已经是一个成熟的事件管理器，负责全局事件的注册、注销、触发等核心功能。**不应该合并**到新的事件协调器中，而应该让事件协调器**使用**现有的 EventManager。

### 变量路径解析现状
现有的变量解析功能已经很完善：
- `sdk/utils/evalutor/path-resolver.ts` 提供了 `resolvePath` 函数
- `sdk/utils/evalutor/expression-parser.ts` 提供了完整的表达式解析
- `ThreadContext` 已经集成了 `VariableManager`

**结论**：`ThreadExecutor` 中的 `resolveVariablePath` 方法可以被现有的 `resolvePath` 函数替代。

## 重构目标

1. **单一职责原则**：每个类只负责一个明确的职责
2. **降低耦合度**：减少类之间的直接依赖
3. **提高可测试性**：每个组件都可以独立测试
4. **复用现有功能**：充分利用现有的成熟组件
5. **保持向后兼容**：确保重构不影响现有功能

## 重构方案

### 1. 职责分离组件

#### 事件协调器 (`sdk/core/execution/coordinators/event-coordinator.ts`)
```typescript
export class EventCoordinator {
  constructor(
    private eventManager: EventManager,
    private triggerManager: TriggerManager
  ) {}

  async emitNodeEvent(event: NodeStartedEvent | NodeCompletedEvent | NodeFailedEvent): Promise<void> {
    // 先触发对外事件
    await this.eventManager.emit(event);
    // 再协调 Trigger 执行
    await this.triggerManager.handleEvent(event);
  }

  async emitErrorEvent(event: ErrorEvent): Promise<void> {
    await this.eventManager.emit(event);
    await this.triggerManager.handleEvent(event);
  }

  async emitSubgraphEvent(event: SubgraphStartedEvent | SubgraphCompletedEvent): Promise<void> {
    await this.eventManager.emit(event);
    await this.triggerManager.handleEvent(event);
  }
}
```

#### 节点执行协调器 (`sdk/core/execution/coordinators/node-execution-coordinator.ts`)
```typescript
export class NodeExecutionCoordinator {
  constructor(
    private eventCoordinator: EventCoordinator,
    private llmCoordinator: LLMCoordinator,
    private subgraphHandler: SubgraphHandler
  ) {}

  async executeNode(threadContext: ThreadContext, node: Node): Promise<NodeExecutionResult> {
    // 节点执行的核心逻辑
  }
  
  private async executeLLMManagedNode(threadContext: ThreadContext, node: Node): Promise<NodeExecutionResult> {
    // LLM 节点执行逻辑
  }
}
```

#### 子图处理器 (`sdk/core/execution/handlers/subgraph-handler.ts`)
```typescript
import { resolvePath } from '../../../utils/evalutor/path-resolver';

export class SubgraphHandler {
  enterSubgraph(threadContext: ThreadContext, graphNode: GraphNode): void {
    // 子图进入逻辑
  }

  exitSubgraph(threadContext: ThreadContext): any {
    // 子图退出逻辑
  }

  getSubgraphInput(threadContext: ThreadContext, originalSubgraphNodeId: string): any {
    const navigator = threadContext.getNavigator();
    const graphNode = navigator.getGraph().getNode(originalSubgraphNodeId);
    const node = graphNode?.originalNode;

    if (node?.type === 'SUBGRAPH' as NodeType) {
      const config = node.config as SubgraphNodeConfig;
      const input: Record<string, any> = {};
      
      // 使用现有的 resolvePath 函数
      const context = {
        variables: threadContext.getAllVariables(),
        input: threadContext.getInput(),
        output: threadContext.getOutput()
      };

      for (const [childVar, parentPath] of Object.entries(config.inputMapping)) {
        input[childVar] = resolvePath(parentPath, context);
      }

      return input;
    }

    return {};
  }

  getSubgraphOutput(threadContext: ThreadContext, originalSubgraphNodeId: string): any {
    // 获取子图的END节点输出
    const navigator = threadContext.getNavigator();
    const endNodes = navigator.getGraph().endNodeIds;

    for (const endNodeId of endNodes) {
      const graphNode = navigator.getGraph().getNode(endNodeId);
      if (graphNode?.workflowId === subgraphContext.workflowId) {
        const nodeResult = threadContext.getNodeResults()
          .find(r => r.nodeId === endNodeId);
        return nodeResult?.data || {};
      }
    }

    return {};
  }
}
```

#### 错误处理器 (`sdk/core/execution/handlers/error-handler.ts`)
```typescript
export class ErrorHandler {
  constructor(private eventCoordinator: EventCoordinator) {}

  async handleNodeFailure(
    threadContext: ThreadContext, 
    node: Node, 
    nodeResult: NodeExecutionResult
  ): Promise<void> {
    // 节点失败处理逻辑
  }

  async handleExecutionError(threadContext: ThreadContext, error: any): Promise<void> {
    // 执行错误处理逻辑
  }
}
```

### 2. 简化后的 ThreadExecutor

```typescript
export class ThreadExecutor {
  private nodeExecutionCoordinator: NodeExecutionCoordinator;
  private errorHandler: ErrorHandler;

  constructor(
    eventManager?: EventManager, 
    triggerManager?: TriggerManager
  ) {
    const eventCoordinator = new EventCoordinator(eventManager || new EventManager(), triggerManager || new TriggerManager());
    const subgraphHandler = new SubgraphHandler();
    const llmCoordinator = LLMCoordinator.getInstance();
    
    this.nodeExecutionCoordinator = new NodeExecutionCoordinator(
      eventCoordinator,
      llmCoordinator,
      subgraphHandler
    );
    
    this.errorHandler = new ErrorHandler(eventCoordinator);
  }

  async executeThread(threadContext: ThreadContext): Promise<ThreadResult> {
    try {
      while (true) {
        // 检查暂停/停止状态
        if (this.shouldStopExecution(threadContext)) {
          break;
        }

        // 获取当前节点
        const currentNode = this.getCurrentNode(threadContext);
        
        // 执行节点
        const nodeResult = await this.nodeExecutionCoordinator.executeNode(threadContext, currentNode);

        // 处理执行结果
        if (nodeResult.status === 'COMPLETED') {
          if (this.isEndNode(currentNode)) {
            this.completeThread(threadContext);
            break;
          }
          this.routeToNextNode(threadContext, currentNode, nodeResult);
        } else if (nodeResult.status === 'FAILED') {
          await this.errorHandler.handleNodeFailure(threadContext, currentNode, nodeResult);
          break;
        } else if (nodeResult.status === 'SKIPPED') {
          this.routeToNextNode(threadContext, currentNode, nodeResult);
        }
      }

      return createThreadResult(threadContext);
    } catch (error) {
      await this.errorHandler.handleExecutionError(threadContext, error);
      return createThreadResult(threadContext, error);
    }
  }

  // 辅助方法...
}
```

## 重构步骤

### 第一阶段：移除重复功能
1. **移除 `resolveVariablePath` 方法**：直接使用现有的 `resolvePath` 函数
2. **优化 LLM 配置提取**：确保复用现有的配置验证和转换逻辑

### 第二阶段：协调器实现
1. 创建轻量级 `EventCoordinator`（使用现有 EventManager）
2. 创建 `NodeExecutionCoordinator` 
3. 创建 `SubgraphHandler`（使用现有路径解析）
4. 创建 `ErrorHandler`

### 第三阶段：ThreadExecutor 简化
1. 修改 ThreadExecutor 构造函数，注入新的协调器
2. 简化 `executeThread` 方法，委托具体职责
3. 移除原有的私有方法
4. 更新依赖注入和测试

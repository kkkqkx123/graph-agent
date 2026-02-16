# ADD_TOOL节点分离设计方案

## 一、当前架构分析

### 1.1 现有实现

#### 类型定义
在 [`packages/types/src/node/configs/execution-configs.ts`](packages/types/src/node/configs/execution-configs.ts:36-41) 中，`LLMNodeConfig` 包含了动态工具配置：

```typescript
export interface LLMNodeConfig {
  profileId: ID;
  prompt?: string;
  parameters?: Record<string, any>;
  maxToolCallsPerRequest?: number;
  dynamicTools?: {
    toolIds: string[];
    descriptionTemplate?: string;
  };
}
```

#### 执行流程

1. **LLM节点处理器** ([`llm-handler.ts`](sdk/core/execution/handlers/node-handlers/llm-handler.ts:71))
   - 从配置中提取 `dynamicTools`
   - 传递给 `LLMExecutionCoordinator`

2. **LLM执行协调器** ([`llm-execution-coordinator.ts`](sdk/core/execution/coordinators/llm-execution-coordinator.ts:247-261))
   - 在 `executeLLMLoop()` 中合并静态和动态工具
   - 通过 `getAvailableToolIds()` 获取可用工具
   - 使用 `ToolService` 获取工具定义并转换为 `ToolSchema`

### 1.2 存在的问题

1. **职责不清**: LLM节点既负责LLM调用，又负责工具管理
2. **耦合度高**: 动态工具功能与LLM节点强耦合，无法独立使用
3. **扩展性差**: 无法在工作流的其他位置动态添加工具
4. **复用性低**: 工具管理逻辑无法被其他节点复用
5. **灵活性不足**: 无法实现更复杂的工具管理场景（如条件添加、批量添加等）

## 二、设计方案

### 2.1 新增节点类型

在 [`NodeType`](packages/types/src/node/base.ts:10) 枚举中新增 `ADD_TOOL` 节点类型：

```typescript
export enum NodeType {
  // ... 现有节点类型
  /** 工具添加节点。用于动态添加工具到工具上下文 */
  ADD_TOOL = 'ADD_TOOL',
}
```

### 2.2 新增配置类型

在 [`execution-configs.ts`](packages/types/src/node/configs/execution-configs.ts) 中新增 `AddToolNodeConfig`：

```typescript
/**
 * 工具添加节点配置
 */
export interface AddToolNodeConfig {
  /** 要添加的工具ID或名称列表 */
  toolIds: string[];
  /** 工具描述模板（可选，用于动态生成工具描述） */
  descriptionTemplate?: string;
  /** 工具作用域（可选，默认为THREAD） */
  scope?: 'THREAD' | 'WORKFLOW' | 'GLOBAL';
  /** 是否覆盖已存在的工具（默认false） */
  overwrite?: boolean;
  /** 工具元数据（可选） */
  metadata?: Record<string, any>;
}
```

### 2.3 工具上下文管理机制

#### 2.3.1 新增工具上下文管理器

创建 `ToolContextManager` 类，负责管理工具上下文：

```typescript
/**
 * 工具上下文管理器
 * 负责管理不同作用域的工具集合
 */
export class ToolContextManager {
  private threadTools: Map<string, Set<string>> = new Map();
  private workflowTools: Map<string, Set<string>> = new Map();
  private globalTools: Set<string> = new Set();

  /**
   * 添加工具到指定作用域
   */
  addTools(
    threadId: string,
    workflowId: string,
    toolIds: string[],
    scope: 'THREAD' | 'WORKFLOW' | 'GLOBAL',
    overwrite: boolean = false
  ): void {
    // 实现工具添加逻辑
  }

  /**
   * 获取指定作用域的工具集合
   */
  getTools(
    threadId: string,
    workflowId: string,
    scope?: 'THREAD' | 'WORKFLOW' | 'GLOBAL'
  ): Set<string> {
    // 实现工具获取逻辑
  }

  /**
   * 移除工具
   */
  removeTools(
    threadId: string,
    workflowId: string,
    toolIds: string[],
    scope: 'THREAD' | 'WORKFLOW' | 'GLOBAL'
  ): void {
    // 实现工具移除逻辑
  }

  /**
   * 清空指定作用域的工具
   */
  clearTools(
    threadId: string,
    workflowId: string,
    scope: 'THREAD' | 'WORKFLOW' | 'GLOBAL'
  ): void {
    // 实现工具清空逻辑
  }
}
```

#### 2.3.2 集成到执行上下文

在 [`ExecutionContext`](sdk/core/execution/context/execution-context.ts) 中注册 `ToolContextManager`：

```typescript
export class ExecutionContext {
  // ... 现有代码

  private toolContextManager: ToolContextManager;

  constructor() {
    // ... 现有初始化代码
    this.toolContextManager = new ToolContextManager();
  }

  getToolContextManager(): ToolContextManager {
    return this.toolContextManager;
  }
}
```

### 2.4 ADD_TOOL节点处理器

创建 [`add-tool-handler.ts`](sdk/core/execution/handlers/node-handlers/add-tool-handler.ts)：

```typescript
/**
 * 工具添加节点处理器
 * 负责将工具添加到工具上下文中
 */

import type { Node, AddToolNodeConfig } from '@modular-agent/types';
import type { Thread } from '@modular-agent/types';
import { ExecutionError } from '@modular-agent/types';
import { now, diffTimestamp, getErrorOrNew } from '@modular-agent/common-utils';
import type { ToolContextManager } from '../../managers/tool-context-manager';

/**
 * 工具添加节点执行结果
 */
export interface AddToolExecutionResult {
  /** 执行状态 */
  status: 'COMPLETED' | 'FAILED';
  /** 成功添加的工具数量 */
  addedCount?: number;
  /** 被跳过的工具数量（已存在且不覆盖） */
  skippedCount?: number;
  /** 错误信息（如果失败） */
  error?: Error;
  /** 执行时间（毫秒） */
  executionTime: number;
}

/**
 * 工具添加节点处理器上下文
 */
export interface AddToolHandlerContext {
  /** 工具上下文管理器 */
  toolContextManager: ToolContextManager;
  /** 工具服务 */
  toolService: any;
  /** 事件管理器 */
  eventManager: any;
}

/**
 * 工具添加节点处理器
 */
export async function addToolHandler(
  thread: Thread,
  node: Node,
  context: AddToolHandlerContext
): Promise<AddToolExecutionResult> {
  const config = node.config as AddToolNodeConfig;
  const startTime = now();

  try {
    // 1. 验证工具ID
    const validToolIds: string[] = [];
    const invalidToolIds: string[] = [];

    for (const toolId of config.toolIds) {
      const tool = context.toolService.getTool(toolId);
      if (tool) {
        validToolIds.push(toolId);
      } else {
        invalidToolIds.push(toolId);
      }
    }

    if (invalidToolIds.length > 0) {
      throw new ExecutionError(
        `Invalid tool IDs: ${invalidToolIds.join(', ')}`,
        node.id
      );
    }

    // 2. 添加工具到上下文
    const scope = config.scope || 'THREAD';
    const overwrite = config.overwrite || false;

    context.toolContextManager.addTools(
      thread.id,
      thread.workflowId,
      validToolIds,
      scope,
      overwrite
    );

    // 3. 触发工具添加事件
    // TODO: 触发相应的事件

    const endTime = now();

    return {
      status: 'COMPLETED',
      addedCount: validToolIds.length,
      skippedCount: 0,
      executionTime: diffTimestamp(startTime, endTime)
    };
  } catch (error) {
    const endTime = now();
    return {
      status: 'FAILED',
      error: getErrorOrNew(error),
      executionTime: diffTimestamp(startTime, endTime)
    };
  }
}
```

### 2.5 修改LLM节点配置

从 [`LLMNodeConfig`](packages/types/src/node/configs/execution-configs.ts:26) 中移除 `dynamicTools` 字段：

```typescript
/**
 * LLM节点配置
 */
export interface LLMNodeConfig {
  /** 引用的LLM Profile ID */
  profileId: ID;
  /** 提示词 */
  prompt?: string;
  /** 可选的参数覆盖（覆盖Profile中的parameters） */
  parameters?: Record<string, any>;
  /** 单次LLM调用最多返回的工具调用数（默认3，超出时抛出错误） */
  maxToolCallsPerRequest?: number;
  // 移除 dynamicTools 字段
}
```

### 2.6 修改LLM执行协调器

修改 [`LLMExecutionCoordinator`](sdk/core/execution/coordinators/llm-execution-coordinator.ts) 以使用工具上下文管理器：

```typescript
export class LLMExecutionCoordinator {
  constructor(
    private llmExecutor: LLMExecutor,
    private toolService: ToolService,
    private eventManager: EventManager,
    private executionContext?: ExecutionContext
  ) {
    // ... 现有代码
  }

  private async executeLLMLoop(
    params: LLMExecutionParams,
    conversationState: ConversationManager
  ): Promise<string> {
    // ... 现有代码

    // 从工具上下文管理器获取可用工具
    const toolContextManager = this.executionContext?.getToolContextManager();
    let availableToolSchemas = tools;

    if (toolContextManager) {
      const availableToolIds = toolContextManager.getTools(
        params.threadId,
        params.workflowId || ''
      );
      
      const availableTools = Array.from(availableToolIds)
        .map(id => this.toolService.getTool(id))
        .filter(Boolean);
      
      availableToolSchemas = availableTools.map(tool => ({
        id: tool.id,
        description: tool.description,
        parameters: tool.parameters
      }));
    }

    // ... 继续执行LLM调用
  }
}
```

### 2.7 注册节点处理器

在 [`node-handlers/index.ts`](sdk/core/execution/handlers/node-handlers/index.ts) 中注册新的处理器：

```typescript
import { addToolHandler } from './add-tool-handler';

export const nodeHandlers: Record<NodeType, NodeHandler> = {
  // ... 现有处理器
  [NodeType.ADD_TOOL]: addToolHandler,
} as Record<NodeType, NodeHandler>;
```

## 三、迁移策略

### 3.1 向后兼容

为了保持向后兼容性，可以：

1. **保留 `dynamicTools` 字段**：在 `LLMNodeConfig` 中保留 `dynamicTools` 字段，但标记为 `@deprecated`
2. **自动转换**：在 `llm-handler` 中检测到 `dynamicTools` 时，自动创建临时的 `ADD_TOOL` 节点逻辑
3. **提供迁移工具**：提供工具将现有的工作流配置自动迁移到新的架构

### 3.2 迁移步骤

1. **第一阶段**：引入新的 `ADD_TOOL` 节点类型和处理器
2. **第二阶段**：修改 `LLMExecutionCoordinator` 使用工具上下文管理器
3. **第三阶段**：标记 `dynamicTools` 为废弃，提供迁移指南
4. **第四阶段**：在后续版本中完全移除 `dynamicTools` 支持

## 四、使用示例

### 4.1 基本使用

```typescript
{
  "id": "add-tool-1",
  "type": "ADD_TOOL",
  "name": "添加搜索工具",
  "config": {
    "toolIds": ["web-search", "file-reader"],
    "scope": "THREAD"
  }
}
```

### 4.2 条件添加工具

```typescript
{
  "id": "route-1",
  "type": "ROUTE",
  "name": "根据用户需求选择工具",
  "config": {
    "conditions": [
      {
        "expression": "{{userIntent}} == 'search'",
        "targetNodeId": "add-search-tools"
      },
      {
        "expression": "{{userIntent}} == 'analysis'",
        "targetNodeId": "add-analysis-tools"
      }
    ]
  }
},
{
  "id": "add-search-tools",
  "type": "ADD_TOOL",
  "name": "添加搜索工具",
  "config": {
    "toolIds": ["web-search", "database-query"]
  }
},
{
  "id": "add-analysis-tools",
  "type": "ADD_TOOL",
  "name": "添加分析工具",
  "config": {
    "toolIds": ["data-analyzer", "chart-generator"]
  }
}
```

### 4.3 工作流级别工具

```typescript
{
  "id": "add-workflow-tools",
  "type": "ADD_TOOL",
  "name": "添加工作流工具",
  "config": {
    "toolIds": ["workflow-logger", "workflow-metrics"],
    "scope": "WORKFLOW"
  }
}
```

## 五、优势分析

### 5.1 职责分离
- LLM节点专注于LLM调用
- ADD_TOOL节点专注于工具管理
- 每个节点职责清晰，易于维护

### 5.2 灵活性提升
- 可以在工作流的任何位置添加工具
- 支持条件添加、批量添加等复杂场景
- 支持不同作用域的工具管理

### 5.3 可扩展性增强
- 可以轻松添加新的工具管理节点（如 REMOVE_TOOL、CLEAR_TOOLS）
- 可以实现更复杂的工具管理策略
- 便于集成第三方工具管理系统

### 5.4 可测试性改善
- 工具管理逻辑独立，易于单元测试
- 可以模拟工具上下文进行集成测试
- 减少测试复杂度

## 六、潜在风险与缓解措施

### 6.1 风险1：破坏现有工作流
**缓解措施**：
- 保留向后兼容性
- 提供自动迁移工具
- 充分的测试覆盖

### 6.2 风险2：性能影响
**缓解措施**：
- 优化工具上下文管理器的数据结构
- 使用缓存机制减少重复查询
- 性能测试和优化

### 6.3 风险3：学习成本
**缓解措施**：
- 提供详细的文档和示例
- 提供迁移指南
- 提供可视化工具辅助配置

## 七、实施计划

### 7.1 第一阶段：基础实现（1-2周）
- [ ] 新增 `ADD_TOOL` 节点类型
- [ ] 实现 `AddToolNodeConfig` 类型定义
- [ ] 实现 `ToolContextManager`
- [ ] 实现 `addToolHandler`
- [ ] 编写单元测试

### 7.2 第二阶段：集成（1周）
- [ ] 修改 `LLMExecutionCoordinator`
- [ ] 集成到 `ExecutionContext`
- [ ] 注册节点处理器
- [ ] 编写集成测试

### 7.3 第三阶段：迁移支持（1周）
- [ ] 实现向后兼容性
- [ ] 提供迁移工具
- [ ] 更新文档
- [ ] 编写迁移测试

### 7.4 第四阶段：优化与发布（1周）
- [ ] 性能优化
- [ ] 代码审查
- [ ] 发布说明
- [ ] 用户培训

## 八、总结

通过引入独立的 `ADD_TOOL` 节点，我们可以：

1. **解耦工具管理与LLM调用**，提高代码的可维护性
2. **增强工作流的灵活性**，支持更复杂的工具管理场景
3. **提升系统的可扩展性**，便于未来功能扩展
4. **改善代码的可测试性**，降低测试复杂度

这个设计方案遵循了单一职责原则和开闭原则，为系统的长期发展奠定了良好的基础。
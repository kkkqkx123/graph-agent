# Graph Agent SDK 设计方案

## 1. 设计目标

### 1.1 核心目标
- **简化工作流创建**：通过基本对象和函数式编程，避免完全依赖配置文件
- **类型安全**：提供完整的TypeScript类型支持
- **灵活性**：支持多种编程范式（Builder模式、函数式、对象创建）
- **兼容性**：与现有配置驱动系统无缝集成
- **架构一致性**：遵循项目的分层架构，SDK作为Application层的外部接口

### 1.2 解决的问题
- 配置文件复杂度高，难以维护
- 动态构建工作流困难
- 缺乏编程式的API
- 配置与代码分离导致开发效率低

## 2. SDK架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    SDK Module                        │   │
│  │  Builder API  │  Functional API  │  Object Creation  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │              SDK Core Types & Adapters               │   │
│  │  WorkflowBuilder │ NodeBuilder │ EdgeBuilder │ ...  │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    Services Layer (Existing)                 │
│  WorkflowExecution │ ThreadExecution │ NodeFactory │ ...    │
├─────────────────────────────────────────────────────────────┤
│                    Domain Layer (Existing)                   │
│  Workflow │ Node │ Edge │ Thread │ Session │ Checkpoint      │
├─────────────────────────────────────────────────────────────┤
│                  Infrastructure Layer (Existing)             │
│  Persistence │ Logging │ Config │ ...                        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 SDK模块划分（位于 `src/application/sdk/`）

#### 2.2.1 核心类型模块 (`src/application/sdk/types/`)
- 定义SDK使用的核心类型
- 提供类型安全的配置接口
- 与领域类型保持兼容

#### 2.2.2 Builder API模块 (`src/application/sdk/builders/`)
- 流式API实现
- 支持链式调用
- 提供类型推断

#### 2.2.3 函数式API模块 (`src/application/sdk/functional/`)
- 函数式组合接口
- 支持管道操作
- 提供高阶函数

#### 2.2.4 对象创建API模块 (`src/application/sdk/creators/`)
- 简化的对象创建接口
- 提供工厂方法
- 支持快速原型

#### 2.2.5 适配器模块 (`src/application/sdk/adapters/`)
- 负责SDK对象与领域对象之间的转换
- 实现WorkflowAdapter、NodeAdapter、EdgeAdapter等

#### 2.2.6 执行器模块 (`src/application/sdk/executor/`)
- 提供简化的执行接口
- 集成Services层的执行引擎

#### 2.2.7 工具函数模块 (`src/application/sdk/utils/`)
- 辅助函数
- 类型转换
- 验证工具

#### 2.2.8 主入口模块 (`src/application/sdk/index.ts`)
- 统一导出所有SDK功能
- 提供便捷的导入方式

## 3. 核心API设计

### 3.1 Builder API（流式API）

#### 3.1.1 WorkflowBuilder

```typescript
// 创建工作流构建器
const workflow = WorkflowBuilder.create('my-workflow')
  .name('我的工作流')
  .description('这是一个示例工作流')
  .addNode(
    NodeBuilder.start('start')
      .initialVariables({ input: 'hello' })
      .build()
  )
  .addNode(
    NodeBuilder.llm('llm-node')
      .wrapper({ type: 'direct', provider: 'openai', model: 'gpt-4o' })
      .prompt('请回答：{{input}}')
      .build()
  )
  .addNode(
    NodeBuilder.end('end')
      .returnVariables(['llm_response'])
      .build()
  )
  .addEdge('start', 'llm-node')
  .addEdge('llm-node', 'end')
  .build();
```

#### 3.1.2 NodeBuilder

```typescript
// LLM节点
const llmNode = NodeBuilder.llm('llm-1')
  .name('LLM调用')
  .wrapper({ type: 'pool', name: 'default_pool' })
  .prompt('分析以下内容：{{content}}')
  .systemPrompt('你是一个专业的分析师')
  .temperature(0.7)
  .maxTokens(2000)
  .build();

// 工具调用节点
const toolNode = NodeBuilder.tool('tool-1')
  .name('搜索工具')
  .toolName('search')
  .parameters({ query: '{{query}}' })
  .timeout(30000)
  .build();

// 条件节点
const conditionNode = NodeBuilder.condition('condition-1')
  .name('检查结果')
  .condition('has_tool_calls')
  .build();

// 数据转换节点
const transformNode = NodeBuilder.transform('transform-1')
  .name('过滤数据')
  .transformType('filter')
  .sourceData('results')
  .targetVariable('filtered')
  .transformConfig({ condition: 'item.score > 0.5' })
  .build();
```

#### 3.1.3 EdgeBuilder

```typescript
// 简单边
const edge = EdgeBuilder.create('edge-1')
  .from('node-1')
  .to('node-2')
  .build();

// 条件边
const conditionalEdge = EdgeBuilder.create('edge-2')
  .from('condition-node')
  .to('success-node')
  .condition({ type: 'function', functionId: 'has_tool_calls' })
  .build();

// 带权重的边
const weightedEdge = EdgeBuilder.create('edge-3')
  .from('node-1')
  .to('node-2')
  .weight(10)
  .build();
```

### 3.2 函数式API

#### 3.2.1 工作流组合

```typescript
import { workflow, node, edge, pipe } from '@graph-agent/sdk/functional';

// 使用函数式API创建工作流
const myWorkflow = workflow('my-workflow', {
  name: '我的工作流',
  nodes: [
    node.start('start', { initialVariables: { input: 'hello' } }),
    node.llm('llm', {
      wrapper: { type: 'direct', provider: 'openai', model: 'gpt-4o' },
      prompt: '{{input}}'
    }),
    node.end('end', { returnVariables: ['llm_response'] })
  ],
  edges: [
    edge('start', 'llm'),
    edge('llm', 'end')
  ]
});

// 使用管道操作符组合节点
const pipeline = pipe(
  node.start('start'),
  node.llm('llm', { prompt: '{{input}}' }),
  node.tool('tool', { toolName: 'search' }),
  node.end('end')
);
```

#### 3.2.2 高阶函数

```typescript
// map操作
const mappedNodes = map(nodes, n => ({
  ...n,
  properties: { ...n.properties, timeout: 30000 }
}));

// filter操作
const activeNodes = filter(nodes, n => n.status === 'active');

// reduce操作
const nodeCount = reduce(nodes, 0, (acc, n) => acc + 1);

// 组合操作
const processed = pipe(
  filter(nodes, n => n.type === 'llm'),
  map(n => ({ ...n, temperature: 0.7 })),
  reduce({}, (acc, n) => ({ ...acc, [n.id]: n }))
);
```

### 3.3 对象创建API

#### 3.3.1 简化的对象创建

```typescript
import { createWorkflow, createNode, createEdge } from '@graph-agent/sdk/creators';

// 创建工作流
const workflow = createWorkflow({
  id: 'my-workflow',
  name: '我的工作流',
  nodes: [
    createNode.start('start', { initialVariables: { input: 'hello' } }),
    createNode.llm('llm', {
      wrapper: { type: 'direct', provider: 'openai', model: 'gpt-4o' },
      prompt: '{{input}}'
    }),
    createNode.end('end')
  ],
  edges: [
    createEdge('start', 'llm'),
    createEdge('llm', 'end')
  ]
});
```

#### 3.3.2 快速创建常用节点

```typescript
// 快速创建LLM节点
const quickLLM = createNode.quickLLM('请回答：{{input}}', {
  provider: 'openai',
  model: 'gpt-4o'
});

// 快速创建工具节点
const quickTool = createNode.quickTool('search', {
  query: '{{query}}'
});

// 快速创建条件分支
const quickBranch = createNode.quickBranch(
  'condition-node',
  {
    condition: 'has_tool_calls',
    trueBranch: 'tool-node',
    falseBranch: 'end-node'
  }
);
```

## 4. Thread API设计

### 4.1 ThreadBuilder

```typescript
// 创建线程
const thread = ThreadBuilder.create('my-thread')
  .workflow(workflow)
  .inputData({ input: 'hello world' })
  .options({
    enableCheckpoints: true,
    checkpointInterval: 5,
    timeout: 300000
  })
  .build();

// 执行线程
const result = await thread.execute();

// 从检查点恢复
const resumedResult = await thread.resumeFromCheckpoint('checkpoint-id');
```

### 4.2 函数式Thread API

```typescript
import { thread, execute, resume } from '@graph-agent/sdk/functional';

// 创建并执行线程
const result = await execute('my-thread', {
  workflow: myWorkflow,
  inputData: { input: 'hello' },
  options: { enableCheckpoints: true }
});

// 从检查点恢复
const resumed = await resume('my-thread', 'checkpoint-id');
```

## 5. 类型系统设计

### 5.1 核心类型定义

```typescript
// src/application/sdk/types/index.ts

/**
 * SDK配置类型
 */
export interface SDKConfig {
  enableLogging?: boolean;
  defaultTimeout?: number;
  defaultCheckpointInterval?: number;
}

/**
 * Wrapper配置
 */
export interface WrapperConfig {
  type: 'pool' | 'group' | 'direct';
  name?: string; // pool或group类型
  provider?: string; // direct类型
  model?: string; // direct类型
}

/**
 * 提示词配置
 */
export interface PromptConfig {
  type: 'direct' | 'template' | 'reference';
  content: string;
  variables?: Record<string, any>;
}

/**
 * 节点配置基类
 */
export interface BaseNodeConfig {
  id: string;
  name?: string;
  description?: string;
  position?: { x: number; y: number };
}

/**
 * LLM节点配置
 */
export interface LLMNodeConfig extends BaseNodeConfig {
  type: 'llm';
  wrapper: WrapperConfig;
  prompt: PromptConfig;
  systemPrompt?: PromptConfig;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/**
 * 工具节点配置
 */
export interface ToolNodeConfig extends BaseNodeConfig {
  type: 'tool';
  toolName: string;
  parameters?: Record<string, any>;
  timeout?: number;
}

/**
 * 条件节点配置
 */
export interface ConditionNodeConfig extends BaseNodeConfig {
  type: 'condition';
  condition: string;
  variables?: Record<string, any>;
}

/**
 * 数据转换节点配置
 */
export interface TransformNodeConfig extends BaseNodeConfig {
  type: 'data-transform';
  transformType: 'map' | 'filter' | 'reduce' | 'sort' | 'group';
  sourceData: string;
  targetVariable: string;
  transformConfig?: Record<string, any>;
}

/**
 * 节点配置联合类型
 */
export type NodeConfig =
  | LLMNodeConfig
  | ToolNodeConfig
  | ConditionNodeConfig
  | TransformNodeConfig
  | { type: 'start'; initialVariables?: Record<string, any> }
  | { type: 'end'; returnVariables?: string[] };

/**
 * 边配置
 */
export interface EdgeConfig {
  id?: string;
  from: string;
  to: string;
  condition?: { type: 'function'; functionId: string; config?: Record<string, any> };
  weight?: number;
}

/**
 * 工作流配置
 */
export interface WorkflowConfig {
  id: string;
  name?: string;
  description?: string;
  nodes: NodeConfig[];
  edges: EdgeConfig[];
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * 线程配置
 */
export interface ThreadConfig {
  id: string;
  workflow: Workflow;
  inputData?: Record<string, any>;
  options?: {
    enableCheckpoints?: boolean;
    checkpointInterval?: number;
    timeout?: number;
    maxSteps?: number;
  };
}
```

## 6. 与现有系统集成

### 6.1 转换层设计

```typescript
// src/application/sdk/adapters/workflow-adapter.ts

/**
 * 工作流适配器
 * 负责在SDK对象和领域对象之间转换
 */
export class WorkflowAdapter {
  /**
   * 将SDK工作流配置转换为领域Workflow对象
   */
  static toDomain(config: WorkflowConfig, nodeFactory: NodeFactory): Workflow {
    // 使用Services层的NodeFactory创建节点
    
    const nodes = config.nodes.map(nodeConfig => {
      return nodeFactory.create(this.toNodeConfig(nodeConfig));
    });
    
    // 创建Workflow对象
    const workflow = Workflow.create(
      config.name || config.id,
      config.description
    );
    
    // 添加节点和边
    nodes.forEach(node => {
      workflow = workflow.addNode(node);
    });
    
    config.edges.forEach(edgeConfig => {
      workflow = workflow.addEdge(
        EdgeId.fromString(edgeConfig.id || generateId()),
        EdgeType.sequence(),
        NodeId.fromString(edgeConfig.from),
        NodeId.fromString(edgeConfig.to),
        edgeConfig.condition,
        edgeConfig.weight
      );
    });
    
    return workflow;
  }
  
  /**
   * 将领域Workflow对象转换为SDK配置
   */
  static fromDomain(workflow: Workflow): WorkflowConfig {
    const nodes = workflow.getNodes().map(node => 
      this.fromNode(node)
    );
    
    const edges = workflow.getEdges().map(edge => ({
      id: edge.id.toString(),
      from: edge.fromNodeId.toString(),
      to: edge.toNodeId.toString(),
      condition: edge.condition,
      weight: edge.weight
    }));
    
    return {
      id: workflow.workflowId.toString(),
      name: workflow.name,
      description: workflow.description,
      nodes,
      edges,
      tags: workflow.tags,
      metadata: workflow.metadata
    };
  }
  
  /**
   * 转换节点配置
   */
  private static toNodeConfig(config: NodeConfig): any {
    // 根据节点类型转换为NodeFactory需要的格式
    switch (config.type) {
      case 'llm':
        return {
          type: 'llm',
          id: config.id,
          name: config.name,
          description: config.description,
          position: config.position,
          wrapper_type: config.wrapper.type,
          wrapper_name: config.wrapper.name,
          wrapper_provider: config.wrapper.provider,
          wrapper_model: config.wrapper.model,
          prompt: config.prompt,
          systemPrompt: config.systemPrompt,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          stream: config.stream
        };
      // ... 其他节点类型
    }
  }
}
```

### 6.2 执行集成

```typescript
// src/application/sdk/executor/sdk-executor.ts

/**
 * SDK执行器
 * 提供简化的执行接口
 */
export class SDKExecutor {
  constructor(
    private readonly workflowExecutionEngine: WorkflowExecutionEngine,
    private readonly threadExecution: ThreadExecution,
    private readonly nodeFactory: NodeFactory,
    private readonly logger: ILogger
  ) {}
  
  /**
   * 执行工作流
   */
  async executeWorkflow(
    workflowConfig: WorkflowConfig,
    inputData?: Record<string, any>
  ): Promise<WorkflowExecutionResult> {
    // 通过适配器转换为领域对象
    const workflow = WorkflowAdapter.toDomain(workflowConfig, this.nodeFactory);
    
    // 执行工作流
    const executionId = generateId();
    return await this.workflowExecutionEngine.execute(workflow, executionId);
  }
  
  /**
   * 执行线程
   */
  async executeThread(
    threadConfig: ThreadConfig
  ): Promise<ThreadExecutionResult> {
    // 转换工作流配置为领域对象
    const workflow = WorkflowAdapter.toDomain(threadConfig.workflow, this.nodeFactory);
    
    // 创建领域Thread对象
    const thread = Thread.create(
      threadConfig.id,
      workflow.workflowId,
      threadConfig.inputData || {}
    );
    
    // 执行线程
    return await this.threadExecution.executeThread(
      thread.id.toString(),
      threadConfig.inputData,
      threadConfig.options
    );
  }
}
```

## 7. 使用示例

### 7.1 简单对话工作流

```typescript
import { WorkflowBuilder, NodeBuilder } from '@graph-agent/sdk';

// 使用Builder API
const chatWorkflow = WorkflowBuilder.create('chat-workflow')
  .name('简单对话')
  .addNode(
    NodeBuilder.start('start')
      .initialVariables({ userMessage: '你好' })
      .build()
  )
  .addNode(
    NodeBuilder.llm('llm')
      .wrapper({ type: 'direct', provider: 'openai', model: 'gpt-4o' })
      .prompt('{{userMessage}}')
      .temperature(0.7)
      .build()
  )
  .addNode(
    NodeBuilder.end('end')
      .returnVariables(['llm_response'])
      .build()
  )
  .addEdge('start', 'llm')
  .addEdge('llm', 'end')
  .build();

// 执行工作流
const executor = new SDKExecutor(workflowEngine, threadExecution);
const result = await executor.executeWorkflow(chatWorkflow, {
  userMessage: '你好，请介绍一下自己'
});
```

### 7.2 复杂工作流（带条件分支）

```typescript
import { workflow, node, edge, pipe } from '@graph-agent/sdk/functional';

// 使用函数式API
const complexWorkflow = workflow('complex-workflow', {
  name: '复杂工作流',
  nodes: [
    node.start('start', { initialVariables: { query: '搜索内容' } }),
    node.llm('llm', {
      wrapper: { type: 'direct', provider: 'openai', model: 'gpt-4o' },
      prompt: '分析查询：{{query}}，判断是否需要搜索'
    }),
    node.condition('check-search', {
      condition: 'has_tool_calls'
    }),
    node.tool('search', {
      toolName: 'search',
      parameters: { query: '{{query}}' }
    }),
    node.llm('answer', {
      wrapper: { type: 'direct', provider: 'openai', model: 'gpt-4o' },
      prompt: '基于搜索结果回答：{{query}}'
    }),
    node.end('end', { returnVariables: ['llm_response'] })
  ],
  edges: [
    edge('start', 'llm'),
    edge('llm', 'check-search'),
    edge('check-search', 'search', {
      condition: { type: 'function', functionId: 'has_tool_calls' }
    }),
    edge('check-search', 'answer', {
      condition: { type: 'function', functionId: 'no_tool_calls' }
    }),
    edge('search', 'answer'),
    edge('answer', 'end')
  ]
});
```

### 7.3 动态工作流构建

```typescript
import { createWorkflow, createNode, createEdge } from '@graph-agent/sdk/creators';

// 根据配置动态构建工作流
function buildDynamicWorkflow(config: any) {
  const nodes = [];
  const edges = [];
  
  // 添加开始节点
  nodes.push(createNode.start('start', {
    initialVariables: config.initialVariables
  }));
  
  // 动态添加处理节点
  config.steps.forEach((step, index) => {
    const nodeId = `step-${index}`;
    
    if (step.type === 'llm') {
      nodes.push(createNode.llm(nodeId, {
        wrapper: step.wrapper,
        prompt: step.prompt
      }));
    } else if (step.type === 'tool') {
      nodes.push(createNode.tool(nodeId, {
        toolName: step.toolName,
        parameters: step.parameters
      }));
    }
    
    // 添加边
    const prevNodeId = index === 0 ? 'start' : `step-${index - 1}`;
    edges.push(createEdge(prevNodeId, nodeId));
  });
  
  // 添加结束节点
  nodes.push(createNode.end('end'));
  edges.push(createEdge(`step-${config.steps.length - 1}`, 'end'));
  
  return createWorkflow({
    id: config.id,
    name: config.name,
    nodes,
    edges
  });
}
```

## 8. 实施计划

### 8.1 阶段一：核心类型和适配器
- [ ] 在`src/application/sdk/types/`定义SDK核心类型
- [ ] 在`src/application/sdk/adapters/`实现WorkflowAdapter
- [ ] 在`src/application/sdk/adapters/`实现NodeAdapter
- [ ] 在`src/application/sdk/adapters/`实现EdgeAdapter
- [ ] 在`src/application/sdk/adapters/`实现ThreadAdapter

### 8.2 阶段二：Builder API
- [ ] 在`src/application/sdk/builders/`实现WorkflowBuilder
- [ ] 在`src/application/sdk/builders/`实现NodeBuilder
- [ ] 在`src/application/sdk/builders/`实现EdgeBuilder
- [ ] 在`src/application/sdk/builders/`实现ThreadBuilder

### 8.3 阶段三：函数式API
- [ ] 在`src/application/sdk/functional/`实现workflow函数
- [ ] 在`src/application/sdk/functional/`实现node函数集合
- [ ] 在`src/application/sdk/functional/`实现edge函数
- [ ] 在`src/application/sdk/functional/`实现pipe等高阶函数

### 8.4 阶段四：对象创建API
- [ ] 在`src/application/sdk/creators/`实现createWorkflow
- [ ] 在`src/application/sdk/creators/`实现createNode
- [ ] 在`src/application/sdk/creators/`实现createEdge
- [ ] 在`src/application/sdk/creators/`实现快速创建方法

### 8.5 阶段五：执行集成
- [ ] 在`src/application/sdk/executor/`实现SDKExecutor
- [ ] 集成Services层的ThreadExecution
- [ ] 实现检查点支持
- [ ] 在`src/application/sdk/index.ts`创建统一入口

### 8.6 阶段六：文档和示例
- [ ] 编写API文档
- [ ] 创建使用示例
- [ ] 编写最佳实践指南
- [ ] 更新项目README

## 9. 优势总结

### 9.1 相比配置驱动的优势
1. **类型安全**：完整的TypeScript类型支持，编译时错误检查
2. **开发效率**：无需编写配置文件，直接使用代码
3. **灵活性**：支持动态构建工作流
4. **可维护性**：代码即文档，易于理解和维护
5. **测试友好**：易于编写单元测试和集成测试

### 9.2 保持的优势
1. **兼容性**：与现有配置系统完全兼容
2. **灵活性**：可以选择使用SDK或配置文件
3. **可扩展性**：不影响现有架构
4. **渐进式迁移**：可以逐步从配置迁移到SDK

## 10. 注意事项

### 10.1 设计原则
1. **遵循分层架构**：SDK严格位于Application层，只依赖Services层
2. **不破坏现有架构**：SDK是现有架构的补充，不是替代
3. **保持一致性**：SDK API风格与现有代码保持一致
4. **向后兼容**：不影响现有配置文件的使用
5. **性能优先**：避免不必要的转换开销
6. **依赖注入**：通过依赖注入获取Services层的服务

### 10.2 实施建议
1. **分阶段实施**：先实现核心功能，再逐步完善
2. **充分测试**：确保SDK与现有系统的兼容性
3. **文档先行**：提供清晰的API文档和使用示例
4. **社区反馈**：收集用户反馈，持续改进
5. **类型安全**：充分利用TypeScript的类型系统
6. **代码复用**：尽可能复用Services层的现有实现

### 10.3 目录结构

```
src/application/sdk/
├── index.ts                          # SDK主入口，统一导出
├── types/                            # 核心类型定义
│   ├── index.ts                      # 类型统一导出
│   ├── workflow.types.ts             # 工作流相关类型
│   ├── node.types.ts                 # 节点相关类型
│   ├── edge.types.ts                 # 边相关类型
│   └── thread.types.ts               # 线程相关类型
├── builders/                         # Builder API
│   ├── workflow-builder.ts           # 工作流构建器
│   ├── node-builder.ts               # 节点构建器
│   ├── edge-builder.ts               # 边构建器
│   └── thread-builder.ts             # 线程构建器
├── functional/                       # 函数式API
│   ├── index.ts                      # 函数式API统一导出
│   ├── workflow.ts                   # 工作流函数
│   ├── node.ts                       # 节点函数
│   ├── edge.ts                       # 边函数
│   └── operators.ts                  # 高阶函数（pipe, map等）
├── creators/                         # 对象创建API
│   ├── index.ts                      # 创建器统一导出
│   ├── workflow.ts                   # 工作流创建器
│   ├── node.ts                       # 节点创建器
│   └── edge.ts                       # 边创建器
├── adapters/                         # 适配器
│   ├── workflow-adapter.ts           # 工作流适配器
│   ├── node-adapter.ts               # 节点适配器
│   ├── edge-adapter.ts               # 边适配器
│   └── thread-adapter.ts             # 线程适配器
├── executor/                         # 执行器
│   ├── sdk-executor.ts               # SDK执行器
│   └── execution-context.ts          # 执行上下文
└── utils/                            # 工具函数
    ├── index.ts                      # 工具函数统一导出
    ├── validators.ts                 # 验证工具
    ├── converters.ts                 # 类型转换工具
    └── helpers.ts                    # 辅助函数
```

### 10.4 依赖关系

```
SDK (Application Layer)
    ↓ 依赖
Services Layer
    ↓ 依赖
Domain Layer
    ↓ 依赖
Infrastructure Layer
```

**重要**：
- SDK只能依赖Services层，不能直接依赖Domain层或Infrastructure层
- 所有领域对象必须通过Services层的服务获取或创建
- 适配器负责在SDK配置对象和领域对象之间转换
- 执行器通过依赖注入获取Services层的服务
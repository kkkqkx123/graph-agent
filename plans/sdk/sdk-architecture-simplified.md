# SDK架构简化方案

## 核心观点：SDK不需要传统Domain层

对于SDK库来说，传统的4层架构（Domain + Services + Infrastructure + Application）过于复杂。SDK应该采用更简洁的`core + types`设计：

- **core/** - 核心执行逻辑和引擎
- **types/** - 类型定义和接口

---

## 一、简化后的SDK目录结构

```
sdk/
├── core/                          # 核心执行逻辑
│   ├── execution/                 # 执行引擎
│   │   ├── workflow-executor.ts   # 工作流执行器
│   │   ├── function-executor.ts   # 函数执行器
│   │   └── node-executor.ts       # 节点执行器
│   ├── state/                     # 状态管理
│   │   ├── thread-state.ts        # 线程状态
│   │   └── workflow-context.ts    # 工作流上下文
│   ├── llm/                       # LLM集成
│   │   ├── wrapper.ts             # LLM包装器
│   │   ├── wrapper-manager.ts     # 包装器管理器
│   │   └── client-factory.ts      # 客户端工厂
│   ├── tools/                     # 工具执行
│   │   ├── tool-service.ts        # 工具服务
│   │   ├── executor-base.ts       # 执行器基类
│   │   └── executors/             # 具体执行器
│   └── validation/                # 验证
│       └── workflow-validator.ts  # 工作流验证
│
├── types/                         # 类型定义
│   ├── workflow.ts                # 工作流类型
│   ├── thread.ts                  # 线程类型
│   ├── node.ts                    # 节点类型
│   ├── edge.ts                    # 边类型
│   ├── tool.ts                    # 工具类型
│   ├── llm.ts                     # LLM类型
│   ├── execution.ts               # 执行相关类型
│   ├── events.ts                  # 事件类型
│   └── repositories.ts            # 仓储接口
│
├── api/                           # 对外API
│   ├── sdk.ts                     # SDK主类
│   ├── options.ts                 # API选项
│   └── result.ts                  # API结果
│
└── utils/                         # 工具函数
    ├── id-generator.ts            # ID生成
    └── error-handler.ts           # 错误处理
```

---

## 二、模块职责划分

### 2.1 core/ - 核心执行逻辑

**职责**：包含所有执行相关的具体实现

- **execution/**：工作流、函数、节点的执行引擎
- **state/**：执行过程中的状态管理
- **llm/**：与LLM的交互逻辑
- **tools/**：工具的发现和执行逻辑
- **validation/**：工作流结构验证

**特点**：
- 包含具体实现代码
- 依赖types/中定义的类型
- 不依赖外部框架
- 可测试、可替换

### 2.2 types/ - 类型定义

**职责**：定义所有接口和类型

- **实体类型**：Workflow、Thread、Node、Edge、Tool
- **值对象类型**：ID、Status、各种配置选项
- **执行类型**：执行选项、执行结果、执行状态
- **事件类型**：执行事件、回调函数签名
- **仓储接口**：持久化接口定义

**特点**：
- 纯类型定义，无实现
- 使用TypeScript接口和类型别名
- 不依赖任何运行时库
- 作为core/和应用层的契约

### 2.3 api/ - 对外API

**职责**：提供简洁的SDK使用接口

- **sdk.ts**：主SDK类，提供executeWorkflow等方法
- **options.ts**：API参数类型
- **result.ts**：API返回结果类型

**特点**：
- 门面模式，隐藏内部复杂性
- 简单的调用接口
- 清晰的输入输出类型

### 2.4 utils/ - 工具函数

**职责**：通用工具函数

- **id-generator.ts**：生成唯一ID
- **error-handler.ts**：统一错误处理

**特点**：
- 无状态函数
- 可复用工具

---

## 三、类型定义示例

### 3.1 工作流类型（types/workflow.ts）

```typescript
// 工作流定义
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  config?: WorkflowConfig;
}

// 工作流配置
export interface WorkflowConfig {
  timeout?: number;
  maxSteps?: number;
  enableCheckpoints?: boolean;
}

// 工作流执行结果
export interface WorkflowExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
  nodeResults: NodeExecutionResult[];
}
```

### 3.2 节点类型（types/node.ts）

```typescript
// 节点类型枚举
export enum NodeType {
  START = 'start',
  END = 'end',
  FUNCTION = 'function',
  CONDITION = 'condition',
  TRIGGER = 'trigger',
}

// 节点定义
export interface Node {
  id: string;
  type: NodeType;
  name: string;
  config: NodeConfig;
}

// 节点配置
export type NodeConfig = 
  | FunctionNodeConfig
  | ConditionNodeConfig
  | TriggerNodeConfig;

// 函数节点配置
export interface FunctionNodeConfig {
  functionId: string;
  parameters?: Record<string, any>;
  timeout?: number;
  retries?: number;
}
```

### 3.3 执行类型（types/execution.ts）

```typescript
// 执行选项
export interface ExecutionOptions {
  threadId?: string;
  input?: Record<string, any>;
  context?: WorkflowContext;
  maxSteps?: number;
  timeout?: number;
  enableCheckpoints?: boolean;
  onNodeExecuted?: (event: NodeExecutedEvent) => void;
  onToolCalled?: (event: ToolCalledEvent) => void;
}

// 节点执行结果
export interface NodeExecutionResult {
  nodeId: string;
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
  toolCalls?: ToolCall[];
}
```

### 3.4 仓储接口（types/repositories.ts）

```typescript
// 工作流仓储接口
export interface WorkflowRepository {
  findById(id: string): Promise<Workflow | null>;
  save(workflow: Workflow): Promise<void>;
}

// 线程仓储接口
export interface ThreadRepository {
  findById(id: string): Promise<Thread | null>;
  save(thread: Thread): Promise<void>;
}

// 工具仓储接口
export interface ToolRepository {
  findById(id: string): Promise<Tool | null>;
  findByType(type: string): Promise<Tool[]>;
}
```

---

## 四、core实现示例

### 4.1 工作流执行器（core/execution/workflow-executor.ts）

```typescript
import { WorkflowExecutor } from '../../types/execution';
import { Workflow } from '../../types/workflow';
import { ExecutionOptions, WorkflowExecutionResult } from '../../types/execution';
import { FunctionExecutor } from './function-executor';
import { ThreadState } from '../state/thread-state';

export class WorkflowExecutorImpl implements WorkflowExecutor {
  constructor(
    private functionExecutor: FunctionExecutor,
    private threadState: ThreadState
  ) {}

  async execute(
    workflow: Workflow,
    options: ExecutionOptions
  ): Promise<WorkflowExecutionResult> {
    // 1. 初始化状态
    this.threadState.initialize(workflow, options.input);

    // 2. 执行开始节点
    const startNode = workflow.nodes.find(n => n.type === NodeType.START);
    if (!startNode) {
      throw new Error('Workflow must have a start node');
    }

    // 3. 遍历执行节点
    let currentNode = startNode;
    while (currentNode.type !== NodeType.END) {
      // 执行当前节点
      const result = await this.functionExecutor.execute(currentNode, this.threadState);
      
      // 更新状态
      this.threadState.updateNodeResult(currentNode.id, result);

      // 路由到下一个节点
      currentNode = this.routeToNextNode(workflow, currentNode, result);
    }

    // 4. 返回结果
    return {
      success: true,
      output: this.threadState.getOutput(),
      executionTime: this.threadState.getExecutionTime(),
      nodeResults: this.threadState.getNodeResults()
    };
  }

  private routeToNextNode(
    workflow: Workflow,
    currentNode: Node,
    result: NodeExecutionResult
  ): Node {
    // 根据边和条件路由到下一个节点
    const edges = workflow.edges.filter(e => e.source === currentNode.id);
    
    for (const edge of edges) {
      if (this.evaluateCondition(edge.condition, result)) {
        return workflow.nodes.find(n => n.id === edge.target)!;
      }
    }

    throw new Error(`No valid route from node ${currentNode.id}`);
  }

  private evaluateCondition(condition: string, result: NodeExecutionResult): boolean {
    // 评估条件表达式
    // 简化实现，实际可以使用Jexl等表达式引擎
    return true;
  }
}
```

### 4.2 函数执行器（core/execution/function-executor.ts）

```typescript
import { Node, FunctionNodeConfig } from '../../types/node';
import { NodeExecutionResult } from '../../types/execution';
import { ThreadState } from '../state/thread-state';
import { ToolService } from '../tools/tool-service';

export class FunctionExecutor {
  constructor(
    private toolService: ToolService
  ) {}

  async execute(node: Node, threadState: ThreadState): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      // 1. 获取节点配置
      const config = node.config as FunctionNodeConfig;
      
      // 2. 准备参数（从上下文中解析变量）
      const parameters = this.resolveParameters(config.parameters, threadState);
      
      // 3. 执行函数
      const result = await this.toolService.execute(config.functionId, parameters);
      
      // 4. 返回结果
      return {
        nodeId: node.id,
        success: true,
        output: result.output,
        executionTime: Date.now() - startTime,
        toolCalls: result.toolCalls
      };
    } catch (error) {
      return {
        nodeId: node.id,
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  private resolveParameters(
    parameters: Record<string, any>,
    threadState: ThreadState
  ): Record<string, any> {
    // 解析参数中的变量引用，如 {{variableName}}
    const resolved: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string' && value.startsWith('{{')) {
        const variableName = value.slice(2, -2);
        resolved[key] = threadState.getVariable(variableName);
      } else {
        resolved[key] = value;
      }
    }
    
    return resolved;
  }
}
```

---

## 五、API设计

### 5.1 SDK主类（api/sdk.ts）

```typescript
import { WorkflowExecutor } from '../core/execution/workflow-executor';
import { WorkflowRepository, ThreadRepository } from '../types/repositories';
import { ExecutionOptions, WorkflowExecutionResult } from '../types/execution';
import { Workflow } from '../types/workflow';

export class AgentSDK {
  constructor(
    private workflowExecutor: WorkflowExecutor,
    private workflowRepository?: WorkflowRepository,
    private threadRepository?: ThreadRepository
  ) {}

  /**
   * 执行工作流
   */
  async executeWorkflow(
    workflow: Workflow | string,  // 支持直接传入或ID
    input?: Record<string, any>,
    options?: ExecutionOptions
  ): Promise<WorkflowExecutionResult> {
    // 1. 获取工作流
    let workflowToExecute: Workflow;
    if (typeof workflow === 'string') {
      if (!this.workflowRepository) {
        throw new Error('WorkflowRepository is required when using workflow ID');
      }
      workflowToExecute = await this.workflowRepository.findById(workflow);
      if (!workflowToExecute) {
        throw new Error(`Workflow not found: ${workflow}`);
      }
    } else {
      workflowToExecute = workflow;
    }

    // 2. 准备执行选项
    const executionOptions: ExecutionOptions = {
      input,
      ...options
    };

    // 3. 执行工作流
    return this.workflowExecutor.execute(workflowToExecute, executionOptions);
  }

  /**
   * 注册自定义节点执行器
   */
  registerNodeExecutor(nodeType: string, executor: NodeExecutor): void {
    this.workflowExecutor.registerNodeExecutor(nodeType, executor);
  }

  /**
   * 注册自定义工具执行器
   */
  registerToolExecutor(toolType: string, executor: ToolExecutor): void {
    // 委托给toolService
  }

  /**
   * 监听执行事件
   */
  on(event: string, listener: Function): void {
    // 事件监听
  }
}
```

### 5.2 使用示例

```typescript
import { AgentSDK } from '@agent-sdk/sdk';
import { OpenAIClient } from '@agent-sdk/llm';

// 1. 创建LLM客户端
const llmClient = new OpenAIClient({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4'
});

// 2. 创建SDK实例
const sdk = new AgentSDK({
  llmClient,
  workflowRepository: myWorkflowRepository,  // 可选
  threadRepository: myThreadRepository        // 可选
});

// 3. 定义工作流
const workflow = {
  id: 'example-workflow',
  name: 'Example Workflow',
  nodes: [
    {
      id: 'start',
      type: 'start',
      name: 'Start'
    },
    {
      id: 'process',
      type: 'function',
      name: 'Process Data',
      config: {
        functionId: 'process-data',
        parameters: {
          input: '{{input}}'
        }
      }
    },
    {
      id: 'llm-call',
      type: 'function',
      name: 'LLM Call',
      config: {
        functionId: 'llm-call',
        parameters: {
          prompt: 'Process this: {{process.output}}',
          model: 'gpt-4'
        }
      }
    },
    {
      id: 'end',
      type: 'end',
      name: 'End'
    }
  ],
  edges: [
    { source: 'start', target: 'process' },
    { source: 'process', target: 'llm-call' },
    { source: 'llm-call', target: 'end' }
  ]
};

// 4. 执行工作流
const result = await sdk.executeWorkflow(workflow, {
  input: 'Hello, World!'
});

console.log('Execution result:', result);
```

---

## 六、与旧架构对比

### 6.1 旧架构（4层）

```
src/
├── domain/          # 领域层 - 复杂
│   ├── entities/    # 实体类
│   ├── value-objects/ # 值对象
│   └── repositories/   # 仓储接口
├── services/        # 服务层 - 臃肿
│   ├── workflow/    # 工作流服务
│   ├── threads/     # 线程服务
│   └── ...
├── infrastructure/  # 基础设施层 - 耦合
│   ├── persistence/ # 持久化
│   ├── logging/     # 日志
│   └── config/      # 配置
└── application/     # 应用层 - 模糊
    └── ...
```

**问题**：
- 层次过多，职责不清
- 过度工程化
- 强制技术栈（TypeORM、Winston等）
- 不适合SDK库

### 6.2 新架构（core + types）

```
sdk/
├── core/            # 核心逻辑 - 简洁
│   ├── execution/   # 执行引擎
│   ├── state/       # 状态管理
│   ├── llm/         # LLM集成
│   └── tools/       # 工具执行
├── types/           # 类型定义 - 清晰
│   ├── workflow.ts  # 工作流类型
│   ├── node.ts      # 节点类型
│   └── ...
├── api/             # 对外API - 简单
│   └── sdk.ts       # SDK主类
└── utils/           # 工具函数
    └── ...
```

**优势**：
- 层次清晰，职责明确
- 轻量级，适合SDK
- 不强制技术栈
- 易于理解和维护

---

## 七、设计原则总结

### 7.1 SDK设计原则

1. **简洁性**：保持代码简洁，避免过度设计
2. **专注性**：专注于工作流执行，不做多余的事情
3. **灵活性**：通过接口和插件机制支持扩展
4. **无侵入**：不强制特定的技术栈或架构
5. **类型安全**：充分利用TypeScript类型系统

### 7.2 接口设计原则

1. **最小化API**：提供最少但足够的API
2. **清晰的输入输出**：明确定义参数和返回类型
3. **事件驱动**：通过事件提供扩展点
4. **插件机制**：支持自定义执行器
5. **仓储注入**：允许应用层控制持久化

### 7.3 实现原则

1. **依赖倒置**：依赖抽象（types），不依赖具体实现
2. **单一职责**：每个类只做一件事
3. **可测试性**：易于单元测试
4. **可替换性**：组件易于替换和扩展
5. **无状态**：SDK本身无状态，状态由应用层管理

---

## 八、结论

对于SDK库来说，传统的Domain-Driven Design架构过于复杂。采用`core + types`的简化架构：

- **types/**：定义接口和类型（纯TypeScript，无实现）
- **core/**：实现核心逻辑（依赖types，不依赖外部框架）
- **api/**：提供简洁的对外接口
- **utils/**：通用工具函数

这种架构：
- ✅ 更简洁，易于理解和维护
- ✅ 更轻量，适合SDK库
- ✅ 更灵活，不强制技术栈
- ✅ 更清晰，职责明确
- ✅ 更易于测试和扩展

旧项目的`src`目录作为参考，新SDK在`sdk`目录重新实现，保持简洁和专注。
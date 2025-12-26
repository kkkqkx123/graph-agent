# 图工作流示例

这是一个简化的、硬编码的图工作流示例，用于演示图工作流的核心概念和实现方式。

## 概述

本示例展示了如何使用函数式编程风格实现图工作流，包括：

- **节点实体**：LLM节点、工具节点、条件节点、转换节点等
- **边实体**：直接边和条件边，支持条件表达式评估
- **触发器实体**：时间触发器、事件触发器、状态触发器
- **执行引擎**：支持串行和并行执行策略
- **执行上下文**：管理工作流执行过程中的数据

## 项目结构

```
src/workflow-example/
├── types/                    # 类型定义
│   └── workflow-types.ts
├── entities/                 # 实体实现
│   ├── node.ts
│   ├── edge.ts
│   └── trigger.ts
├── functions/                # 函数实现
│   └── nodes/
│       └── node-functions.ts
├── engine/                   # 执行引擎
│   ├── execution-context.ts
│   └── workflow-engine.ts
├── examples/                 # 示例
│   └── text-analysis-workflow.ts
├── __tests__/               # 测试
│   └── workflow-example.test.ts
├── index.ts                 # 主入口
└── README.md               # 本文件
```

## 快速开始

### 运行示例

```typescript
import { runAllExamples } from './workflow-example/examples/text-analysis-workflow';

// 运行所有示例
runAllExamples();
```

### 创建简单工作流

```typescript
import {
  createWorkflowGraph,
  createWorkflowEngine,
  ExecutionStrategy
} from './workflow-example';

import {
  createStartNode,
  createLLMNode,
  createEndNode
} from './workflow-example';

import { createDirectEdge } from './workflow-example';

// 创建工作流图
const workflow = createWorkflowGraph('my-workflow');

// 创建节点
const startNode = createStartNode('start', '开始');
const llmNode = createLLMNode('llm', 'LLM节点', {
  prompt: '处理文本: {{input.text}}',
  model: 'gpt-3.5-turbo'
});
const endNode = createEndNode('end', '结束');

// 添加节点
workflow.addNode(startNode);
workflow.addNode(llmNode);
workflow.addNode(endNode);

// 创建边
workflow.addEdge(createDirectEdge('edge1', 'start', 'llm'));
workflow.addEdge(createDirectEdge('edge2', 'llm', 'end'));

// 创建执行引擎
const engine = createWorkflowEngine(ExecutionStrategy.SEQUENTIAL);

// 执行工作流
const result = await engine.execute(workflow, { text: '测试文本' });
console.log(result);
```

## 核心概念

### 节点类型

- **START**: 开始节点，接收工作流输入
- **LLM**: LLM节点，调用大语言模型
- **TOOL**: 工具节点，调用外部工具
- **CONDITION**: 条件节点，评估条件表达式
- **TRANSFORM**: 转换节点，转换数据格式
- **END**: 结束节点，返回工作流结果

### 边类型

- **DIRECT**: 直接边，无条件执行
- **CONDITIONAL**: 条件边，基于条件表达式决定是否执行

### 触发器类型

- **TIME**: 时间触发器，基于时间条件触发
- **EVENT**: 事件触发器，基于事件触发
- **STATE**: 状态触发器，基于状态变化触发

### 执行策略

- **SEQUENTIAL**: 串行执行，节点按顺序执行
- **PARALLEL**: 并行执行，无依赖节点并行执行

## 示例：智能文本分析工作流

智能文本分析工作流演示了如何使用图工作流处理文本：

1. 接收输入文本
2. 使用LLM对文本进行分类（新闻/评论/问答）
3. 根据分类结果走不同分支
4. 提取关键信息
5. 数据转换
6. 返回结果

### 运行文本分析示例

```typescript
import {
  example1_NewsAnalysis,
  example2_ReviewAnalysis,
  example3_QAExtraction
} from './workflow-example/examples/text-analysis-workflow';

// 新闻分析
await example1_NewsAnalysis();

// 评论情感分析
await example2_ReviewAnalysis();

// 问答提取
await example3_QAExtraction();
```

## 运行测试

```bash
# 运行所有测试
npm test src/workflow-example/__tests__/workflow-example.test.ts

# 运行特定测试
npm test src/workflow-example/__tests__/workflow-example.test.ts -t "Node实体"
```

## API 文档

### 创建节点

```typescript
import {
  createStartNode,
  createLLMNode,
  createToolNode,
  createConditionNode,
  createTransformNode,
  createEndNode
} from './workflow-example';

const node = createLLMNode(
  'node-id',           // 节点ID
  '节点名称',          // 节点名称
  {                    // 节点配置
    prompt: '提示词',
    model: 'gpt-3.5-turbo',
    temperature: 0.7
  },
  '节点描述'           // 可选描述
);
```

### 创建边

```typescript
import {
  createDirectEdge,
  createConditionalEdge
} from './workflow-example';

// 直接边
const edge = createDirectEdge(
  'edge-id',
  'from-node-id',
  'to-node-id',
  1  // 权重
);

// 条件边
const conditionalEdge = createConditionalEdge(
  'edge-id',
  'from-node-id',
  'to-node-id',
  {
    expression: '{{node.result.success}} == true',
    operator: ConditionOperator.EQUALS,
    expectedValue: true
  },
  1  // 权重
);
```

### 创建触发器

```typescript
import {
  createTimeoutTrigger,
  createErrorTrigger
} from './workflow-example';

// 超时触发器
const timeoutTrigger = createTimeoutTrigger(
  'trigger-id',
  30000,  // 30秒超时
  'target-node-id'  // 目标节点
);

// 错误触发器
const errorTrigger = createErrorTrigger(
  'trigger-id',
  'node-id'  // 监控的节点
);
```

## 扩展指南

### 添加自定义节点类型

1. 定义节点函数：

```typescript
import { NodeFunction } from './workflow-example/types/workflow-types';

const customNodeFunction: NodeFunction = async (input, config, context) => {
  // 实现节点逻辑
  return {
    success: true,
    data: { result: 'custom result' }
  };
};
```

2. 注册节点函数：

```typescript
import { registerNodeFunction } from './workflow-example/functions/nodes/node-functions';

registerNodeFunction('custom', customNodeFunction);
```

3. 使用自定义节点：

```typescript
const customNode = createNode(
  'custom-node',
  'custom',  // 节点类型
  '自定义节点',
  { /* 配置 */ }
);
```

## 注意事项

1. **模拟实现**：本示例中的LLM调用和工具调用都是模拟实现，实际应用中需要替换为真实的API调用。

2. **安全限制**：表达式求值只支持预定义的运算符和函数，不支持任意代码执行。

3. **性能考虑**：对于大型工作流，建议使用并行执行策略提高效率。

4. **错误处理**：节点执行失败会停止工作流执行，可以通过配置修改错误处理策略。

## 许可证

MIT License
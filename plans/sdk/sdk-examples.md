# Graph Agent SDK 使用示例

## 目录
1. [快速开始](#快速开始)
2. [Builder API 示例](#builder-api-示例)
3. [函数式 API 示例](#函数式-api-示例)
4. [对象创建 API 示例](#对象创建-api-示例)
5. [Thread 执行示例](#thread-执行示例)
6. [高级用法](#高级用法)
7. [与配置文件混合使用](#与配置文件混合使用)

---

## 快速开始

### 安装和初始化

```typescript
import { SDK } from '@graph-agent/sdk';

// 初始化SDK
const sdk = new SDK({
  enableLogging: true,
  defaultTimeout: 300000,
  defaultCheckpointInterval: 5
});
```

### 最简单的工作流

```typescript
import { WorkflowBuilder, NodeBuilder } from '@graph-agent/sdk';

// 创建一个简单的对话工作流
const workflow = WorkflowBuilder.create('simple-chat')
  .addNode(NodeBuilder.start('start').build())
  .addNode(
    NodeBuilder.llm('llm')
      .wrapper({ type: 'direct', provider: 'openai', model: 'gpt-4o' })
      .prompt('你好，请介绍一下自己')
      .build()
  )
  .addNode(NodeBuilder.end('end').build())
  .addEdge('start', 'llm')
  .addEdge('llm', 'end')
  .build();

// 执行工作流
const result = await sdk.execute(workflow, {});
console.log(result);
```

---

## Builder API 示例

### 示例1：简单对话工作流

```typescript
import { WorkflowBuilder, NodeBuilder } from '@graph-agent/sdk';

const chatWorkflow = WorkflowBuilder.create('chat-workflow')
  .name('简单对话')
  .description('使用LLM进行简单对话')
  .addNode(
    NodeBuilder.start('start')
      .initialVariables({ 
        userMessage: '你好',
        conversationHistory: []
      })
      .build()
  )
  .addNode(
    NodeBuilder.llm('llm')
      .name('LLM对话节点')
      .wrapper({ 
        type: 'direct', 
        provider: 'openai', 
        model: 'gpt-4o' 
      })
      .prompt('{{userMessage}}')
      .systemPrompt('你是一个友好的助手')
      .temperature(0.7)
      .maxTokens(2000)
      .build()
  )
  .addNode(
    NodeBuilder.end('end')
      .name('结束节点')
      .returnVariables(['llm_response'])
      .collectResults(true)
      .build()
  )
  .addEdge('start', 'llm')
  .addEdge('llm', 'end')
  .build();

// 执行
const result = await sdk.execute(chatWorkflow, {
  userMessage: '请解释什么是人工智能'
});
```

### 示例2：带工具调用的工作流

```typescript
import { WorkflowBuilder, NodeBuilder } from '@graph-agent/sdk';

const searchWorkflow = WorkflowBuilder.create('search-workflow')
  .name('搜索工作流')
  .addNode(
    NodeBuilder.start('start')
      .initialVariables({ query: '人工智能最新进展' })
      .build()
  )
  .addNode(
    NodeBuilder.llm('llm')
      .wrapper({ type: 'direct', provider: 'openai', model: 'gpt-4o' })
      .prompt('用户想要搜索：{{query}}，请判断是否需要使用搜索工具')
      .build()
  )
  .addNode(
    NodeBuilder.condition('check-tool')
      .name('检查工具调用')
      .condition('has_tool_calls')
      .build()
  )
  .addNode(
    NodeBuilder.tool('search')
      .name('搜索工具')
      .toolName('search')
      .parameters({ query: '{{query}}' })
      .timeout(30000)
      .build()
  )
  .addNode(
    NodeBuilder.llm('answer')
      .wrapper({ type: 'direct', provider: 'openai', model: 'gpt-4o' })
      .prompt('基于搜索结果回答用户的问题：{{query}}')
      .build()
  )
  .addNode(
    NodeBuilder.end('end')
      .returnVariables(['llm_response'])
      .build()
  )
  .addEdge('start', 'llm')
  .addEdge('llm', 'check-tool')
  .addEdge('check-tool', 'search', {
    condition: { type: 'function', functionId: 'has_tool_calls' }
  })
  .addEdge('check-tool', 'answer', {
    condition: { type: 'function', functionId: 'no_tool_calls' }
  })
  .addEdge('search', 'answer')
  .addEdge('answer', 'end')
  .build();
```

### 示例3：数据转换工作流

```typescript
import { WorkflowBuilder, NodeBuilder } from '@graph-agent/sdk';

const transformWorkflow = WorkflowBuilder.create('transform-workflow')
  .name('数据转换工作流')
  .addNode(
    NodeBuilder.start('start')
      .initialVariables({ 
        data: [
          { id: 1, score: 0.8, name: 'item1' },
          { id: 2, score: 0.3, name: 'item2' },
          { id: 3, score: 0.9, name: 'item3' }
        ]
      })
      .build()
  )
  .addNode(
    NodeBuilder.transform('filter')
      .name('过滤数据')
      .transformType('filter')
      .sourceData('data')
      .targetVariable('filteredData')
      .transformConfig({ 
        condition: 'item.score > 0.5' 
      })
      .build()
  )
  .addNode(
    NodeBuilder.transform('sort')
      .name('排序数据')
      .transformType('sort')
      .sourceData('filteredData')
      .targetVariable('sortedData')
      .transformConfig({ 
        sortBy: 'score',
        order: 'desc'
      })
      .build()
  )
  .addNode(
    NodeBuilder.llm('summarize')
      .wrapper({ type: 'direct', provider: 'openai', model: 'gpt-4o' })
      .prompt('请总结以下数据：{{sortedData}}')
      .build()
  )
  .addNode(
    NodeBuilder.end('end')
      .returnVariables(['llm_response'])
      .build()
  )
  .addEdge('start', 'filter')
  .addEdge('filter', 'sort')
  .addEdge('sort', 'summarize')
  .addEdge('summarize', 'end')
  .build();
```

### 示例4：使用Pool和Group

```typescript
import { WorkflowBuilder, NodeBuilder } from '@graph-agent/sdk';

const poolWorkflow = WorkflowBuilder.create('pool-workflow')
  .name('使用Pool的工作流')
  .addNode(
    NodeBuilder.start('start')
      .initialVariables({ prompt: '分析这段文本' })
      .build()
  )
  .addNode(
    NodeBuilder.llm('llm-fast')
      .name('快速分析')
      .wrapper({ 
        type: 'pool', 
        name: 'fast_pool' 
      })
      .prompt('{{prompt}}')
      .temperature(0.5)
      .build()
  )
  .addNode(
    NodeBuilder.llm('llm-quality')
      .name('高质量分析')
      .wrapper({ 
        type: 'group', 
        name: 'high_quality_group' 
      })
      .prompt('详细分析：{{prompt}}')
      .temperature(0.7)
      .maxTokens(4000)
      .build()
  )
  .addNode(
    NodeBuilder.end('end')
      .returnVariables(['llm_response'])
      .build()
  )
  .addEdge('start', 'llm-fast')
  .addEdge('llm-fast', 'llm-quality')
  .addEdge('llm-quality', 'end')
  .build();
```

---

## 函数式 API 示例

### 示例1：基础函数式工作流

```typescript
import { workflow, node, edge } from '@graph-agent/sdk/functional';

const functionalWorkflow = workflow('functional-workflow', {
  name: '函数式工作流',
  nodes: [
    node.start('start', { 
      initialVariables: { input: 'hello' } 
    }),
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

// 执行
const result = await sdk.execute(functionalWorkflow, { input: '你好' });
```

### 示例2：使用管道操作符

```typescript
import { pipe, node } from '@graph-agent/sdk/functional';

// 创建线性工作流管道
const pipeline = pipe(
  node.start('start', { initialVariables: { data: 'input' } }),
  node.llm('process', {
    wrapper: { type: 'direct', provider: 'openai', model: 'gpt-4o' },
    prompt: '处理：{{data}}'
  }),
  node.transform('transform', {
    transformType: 'map',
    sourceData: 'llm_response',
    targetVariable: 'processed'
  }),
  node.end('end', { returnVariables: ['processed'] })
);

// 执行
const result = await sdk.execute(pipeline, {});
```

### 示例3：高阶函数组合

```typescript
import { map, filter, reduce, pipe } from '@graph-agent/sdk/functional';

// 定义节点集合
const nodes = [
  node.llm('llm1', { wrapper: { type: 'direct', provider: 'openai', model: 'gpt-4o' }, prompt: '任务1' }),
  node.llm('llm2', { wrapper: { type: 'direct', provider: 'openai', model: 'gpt-4o' }, prompt: '任务2' }),
  node.llm('llm3', { wrapper: { type: 'direct', provider: 'openai', model: 'gpt-4o' }, prompt: '任务3' })
];

// 使用map添加超时配置
const nodesWithTimeout = map(nodes, n => ({
  ...n,
  properties: { ...n.properties, timeout: 30000 }
}));

// 使用filter筛选特定节点
const llmNodes = filter(nodes, n => n.type === 'llm');

// 使用reduce统计节点数量
const nodeCount = reduce(nodes, 0, (acc, n) => acc + 1);

// 组合操作
const processed = pipe(
  nodes,
  filter(n => n.type === 'llm'),
  map(n => ({ ...n, temperature: 0.7 })),
  reduce({}, (acc, n) => ({ ...acc, [n.id]: n }))
);
```

### 示例4：条件分支函数式实现

```typescript
import { workflow, node, edge, branch } from '@graph-agent/sdk/functional';

const conditionalWorkflow = workflow('conditional-workflow', {
  name: '条件分支工作流',
  nodes: [
    node.start('start', { initialVariables: { score: 85 } }),
    node.condition('check-score', {
      condition: 'variable_equals',
      variables: { variable: 'score', value: 85 }
    }),
    node.llm('high-score', {
      wrapper: { type: 'direct', provider: 'openai', model: 'gpt-4o' },
      prompt: '优秀！分数是{{score}}'
    }),
    node.llm('low-score', {
      wrapper: { type: 'direct', provider: 'openai', model: 'gpt-4o' },
      prompt: '继续努力，分数是{{score}}'
    }),
    node.end('end', { returnVariables: ['llm_response'] })
  ],
  edges: [
    edge('start', 'check-score'),
    edge('check-score', 'high-score', {
      condition: { type: 'function', functionId: 'variable_equals', config: { variable: 'score', value: 85 } }
    }),
    edge('check-score', 'low-score', {
      condition: { type: 'function', functionId: 'variable_not_equals', config: { variable: 'score', value: 85 } }
    }),
    edge('high-score', 'end'),
    edge('low-score', 'end')
  ]
});
```

---

## 对象创建 API 示例

### 示例1：简单对象创建

```typescript
import { createWorkflow, createNode, createEdge } from '@graph-agent/sdk/creators';

const simpleWorkflow = createWorkflow({
  id: 'simple-workflow',
  name: '简单工作流',
  description: '使用对象创建API',
  nodes: [
    createNode.start('start', { 
      initialVariables: { input: 'hello' } 
    }),
    createNode.llm('llm', {
      wrapper: { type: 'direct', provider: 'openai', model: 'gpt-4o' },
      prompt: '{{input}}'
    }),
    createNode.end('end', { returnVariables: ['llm_response'] })
  ],
  edges: [
    createEdge('start', 'llm'),
    createEdge('llm', 'end')
  ],
  tags: ['simple', 'example'],
  metadata: { version: '1.0.0' }
});
```

### 示例2：快速创建常用节点

```typescript
import { createNode, createWorkflow } from '@graph-agent/sdk/creators';

const quickWorkflow = createWorkflow({
  id: 'quick-workflow',
  name: '快速创建工作流',
  nodes: [
    createNode.start('start'),
    // 快速创建LLM节点
    createNode.quickLLM('请回答：{{input}}', {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.7
    }),
    // 快速创建工具节点
    createNode.quickTool('search', {
      query: '{{query}}'
    }),
    // 快速创建条件分支
    createNode.quickBranch('check-result', {
      condition: 'has_tool_calls',
      trueBranch: 'tool-node',
      falseBranch: 'end-node'
    }),
    createNode.end('end')
  ],
  edges: [
    createEdge('start', 'llm'),
    createEdge('llm', 'check-result'),
    createEdge('check-result', 'tool-node'),
    createEdge('check-result', 'end-node'),
    createEdge('tool-node', 'end')
  ]
});
```

### 示例3：动态构建工作流

```typescript
import { createWorkflow, createNode, createEdge } from '@graph-agent/sdk/creators';

// 根据配置动态构建工作流
function buildWorkflowFromConfig(config: {
  id: string;
  name: string;
  steps: Array<{
    type: 'llm' | 'tool' | 'transform';
    config: any;
  }>;
}) {
  const nodes = [];
  const edges = [];
  
  // 添加开始节点
  nodes.push(createNode.start('start', {
    initialVariables: config.steps[0]?.config?.initialVariables || {}
  }));
  
  // 动态添加处理节点
  config.steps.forEach((step, index) => {
    const nodeId = `step-${index}`;
    
    switch (step.type) {
      case 'llm':
        nodes.push(createNode.llm(nodeId, step.config));
        break;
      case 'tool':
        nodes.push(createNode.tool(nodeId, step.config));
        break;
      case 'transform':
        nodes.push(createNode.transform(nodeId, step.config));
        break;
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

// 使用示例
const dynamicWorkflow = buildWorkflowFromConfig({
  id: 'dynamic-workflow',
  name: '动态工作流',
  steps: [
    {
      type: 'llm',
      config: {
        wrapper: { type: 'direct', provider: 'openai', model: 'gpt-4o' },
        prompt: '分析：{{input}}'
      }
    },
    {
      type: 'tool',
      config: {
        toolName: 'search',
        parameters: { query: '{{query}}' }
      }
    },
    {
      type: 'llm',
      config: {
        wrapper: { type: 'direct', provider: 'openai', model: 'gpt-4o' },
        prompt: '总结结果'
      }
    }
  ]
});
```

---

## Thread 执行示例

### 示例1：基本Thread执行

```typescript
import { ThreadBuilder } from '@graph-agent/sdk';

// 创建线程
const thread = ThreadBuilder.create('my-thread')
  .workflow(chatWorkflow)
  .inputData({ userMessage: '你好，请介绍一下自己' })
  .options({
    enableCheckpoints: true,
    checkpointInterval: 5,
    timeout: 300000,
    maxSteps: 1000
  })
  .build();

// 执行线程
const result = await thread.execute();
console.log('执行结果:', result);

if (result.success) {
  console.log('最终结果:', result.result);
} else {
  console.error('执行失败:', result.error);
}
```

### 示例2：从检查点恢复

```typescript
import { ThreadBuilder } from '@graph-agent/sdk';

// 创建线程
const thread = ThreadBuilder.create('resumable-thread')
  .workflow(complexWorkflow)
  .inputData({ query: '人工智能最新进展' })
  .options({
    enableCheckpoints: true,
    checkpointInterval: 3
  })
  .build();

// 执行线程（可能被中断）
const result = await thread.execute();

// 如果执行失败，从检查点恢复
if (!result.success && result.error?.includes('timeout')) {
  // 获取检查点列表
  const checkpoints = await thread.getCheckpoints();
  console.log('可用检查点:', checkpoints);
  
  // 从最新检查点恢复
  const latestCheckpoint = checkpoints[checkpoints.length - 1];
  const resumedResult = await thread.resumeFromCheckpoint(latestCheckpoint.id);
  
  console.log('恢复执行结果:', resumedResult);
}
```

### 示例3：监控执行进度

```typescript
import { ThreadBuilder } from '@graph-agent/sdk';

const thread = ThreadBuilder.create('monitored-thread')
  .workflow(longRunningWorkflow)
  .inputData({ data: largeDataset })
  .options({
    enableCheckpoints: true,
    checkpointInterval: 10
  })
  .build();

// 启动执行（不等待完成）
const executionPromise = thread.execute();

// 定期检查进度
const progressInterval = setInterval(async () => {
  const status = await thread.getStatus();
  console.log(`执行进度: ${status.progress}%`);
  console.log(`当前步骤: ${status.currentStep}`);
  
  if (status.status === 'completed' || status.status === 'failed') {
    clearInterval(progressInterval);
  }
}, 5000);

// 等待执行完成
const result = await executionPromise;
console.log('最终结果:', result);
```

### 示例4：取消执行

```typescript
import { ThreadBuilder } from '@graph-agent/sdk';

const thread = ThreadBuilder.create('cancellable-thread')
  .workflow(longRunningWorkflow)
  .inputData({ data: largeDataset })
  .build();

// 启动执行
const executionPromise = thread.execute();

// 设置超时取消
const timeoutId = setTimeout(async () => {
  console.log('执行超时，正在取消...');
  await thread.cancel('执行超时');
  clearTimeout(timeoutId);
}, 60000); // 60秒后取消

try {
  const result = await executionPromise;
  console.log('执行结果:', result);
} catch (error) {
  console.error('执行被取消或失败:', error);
}
```

---

## 高级用法

### 示例1：并行执行

```typescript
import { WorkflowBuilder, NodeBuilder } from '@graph-agent/sdk';

const parallelWorkflow = WorkflowBuilder.create('parallel-workflow')
  .name('并行执行工作流')
  .addNode(
    NodeBuilder.start('start')
      .initialVariables({ 
        tasks: ['task1', 'task2', 'task3'] 
      })
      .build()
  )
  .addNode(
    NodeBuilder.fork('fork')
      .name('分叉节点')
      .build()
  )
  .addNode(
    NodeBuilder.llm('llm1')
      .wrapper({ type: 'direct', provider: 'openai', model: 'gpt-4o' })
      .prompt('处理任务1')
      .build()
  )
  .addNode(
    NodeBuilder.llm('llm2')
      .wrapper({ type: 'direct', provider: 'openai', model: 'gpt-4o' })
      .prompt('处理任务2')
      .build()
  )
  .addNode(
    NodeBuilder.llm('llm3')
      .wrapper({ type: 'direct', provider: 'openai', model: 'gpt-4o' })
      .prompt('处理任务3')
      .build()
  )
  .addNode(
    NodeBuilder.join('join')
      .name('合并节点')
      .build()
  )
  .addNode(
    NodeBuilder.llm('aggregate')
      .wrapper({ type: 'direct', provider: 'openai', model: 'gpt-4o' })
      .prompt('汇总所有任务结果')
      .build()
  )
  .addNode(
    NodeBuilder.end('end')
      .returnVariables(['llm_response'])
      .build()
  )
  .addEdge('start', 'fork')
  .addEdge('fork', 'llm1')
  .addEdge('fork', 'llm2')
  .addEdge('fork', 'llm3')
  .addEdge('llm1', 'join')
  .addEdge('llm2', 'join')
  .addEdge('llm3', 'join')
  .addEdge('join', 'aggregate')
  .addEdge('aggregate', 'end')
  .build();
```

### 示例2：错误处理

```typescript
import { WorkflowBuilder, NodeBuilder } from '@graph-agent/sdk';

const errorHandlingWorkflow = WorkflowBuilder.create('error-handling-workflow')
  .name('错误处理工作流')
  .addNode(
    NodeBuilder.start('start')
      .initialVariables({ input: 'test' })
      .build()
  )
  .addNode(
    NodeBuilder.llm('llm')
      .wrapper({ type: 'direct', provider: 'openai', model: 'gpt-4o' })
      .prompt('{{input}}')
      .build()
  )
  .addNode(
    NodeBuilder.condition('check-error')
      .condition('has_errors')
      .build()
  )
  .addNode(
    NodeBuilder.llm('error-handler')
      .wrapper({ type: 'direct', provider: 'openai', model: 'gpt-4o' })
      .prompt('处理错误：{{error}}')
      .build()
  )
  .addNode(
    NodeBuilder.llm('success-handler')
      .wrapper({ type: 'direct', provider: 'openai', model: 'gpt-4o' })
      .prompt('处理成功结果：{{result}}')
      .build()
  )
  .addNode(
    NodeBuilder.end('end')
      .returnVariables(['llm_response'])
      .build()
  )
  .addEdge('start', 'llm')
  .addEdge('llm', 'check-error')
  .addEdge('check-error', 'error-handler', {
    condition: { type: 'function', functionId: 'has_errors' }
  })
  .addEdge('check-error', 'success-handler', {
    condition: { type: 'function', functionId: 'no_errors' }
  })
  .addEdge('error-handler', 'end')
  .addEdge('success-handler', 'end')
  .build();
```

### 示例3：循环执行

```typescript
import { WorkflowBuilder, NodeBuilder } from '@graph-agent/sdk';

const loopWorkflow = WorkflowBuilder.create('loop-workflow')
  .name('循环执行工作流')
  .addNode(
    NodeBuilder.start('start')
      .initialVariables({ 
        items: [1, 2, 3, 4, 5],
        currentIndex: 0,
        results: []
      })
      .build()
  )
  .addNode(
    NodeBuilder.condition('check-loop')
      .condition('max_iterations_reached')
      .variables({ maxIterations: 5 })
      .build()
  )
  .addNode(
    NodeBuilder.llm('process-item')
      .wrapper({ type: 'direct', provider: 'openai', model: 'gpt-4o' })
      .prompt('处理项目：{{items[currentIndex]}}')
      .build()
  )
  .addNode(
    NodeBuilder.transform('update-index')
      .transformType('map')
      .sourceData('currentIndex'
      .targetVariable('currentIndex')
      .transformConfig({ 
        operation: 'increment' 
      })
      .build()
  )
  .addNode(
    NodeBuilder.end('end')
      .returnVariables(['results'])
      .build()
  )
  .addEdge('start', 'check-loop')
  .addEdge('check-loop', 'process-item', {
    condition: { type: 'function', functionId: 'max_iterations_not_reached' }
  })
  .addEdge('check-loop', 'end', {
    condition: { type: 'function', functionId: 'max_iterations_reached' }
  })
  .addEdge('process-item', 'update-index')
  .addEdge('update-index', 'check-loop')
  .build();
```

### 示例4：子工作流引用

```typescript
import { WorkflowBuilder, NodeBuilder } from '@graph-agent/sdk';

// 创建基础子工作流
const baseLLMCall = WorkflowBuilder.create('base-llm-call')
  .type('base')
  .addNode(
    NodeBuilder.llm('llm')
      .wrapper({ type: 'direct', provider: 'openai', model: 'gpt-4o' })
      .prompt('{{prompt}}')
      .build()
  )
  .addNode(
    NodeBuilder.condition('check-tools')
      .condition('has_tool_calls')
      .build()
  )
  .addNode(
    NodeBuilder.tool('tool')
      .toolName('auto')
      .build()
  )
  .addEdge('llm', 'check-tools')
  .addEdge('check-tools', 'tool', {
    condition: { type: 'function', functionId: 'has_tool_calls' }
  })
  .build();

// 在主工作流中引用子工作流
const mainWorkflow = WorkflowBuilder.create('main-workflow')
  .name('主工作流')
  .addNode(
    NodeBuilder.start('start')
      .initialVariables({ prompt: '分析这段文本' })
      .build()
  )
  .addNode(
    NodeBuilder.subworkflow('llm-call')
      .name('LLM调用')
      .subworkflowId('base-llm-call')
      .parameters({ prompt: '{{prompt}}' })
      .build()
  )
  .addNode(
    NodeBuilder.llm('summarize')
      .wrapper({ type: 'direct', provider: 'openai', model: 'gpt-4o' })
      .prompt('总结结果')
      .build()
  )
  .addNode(
    NodeBuilder.end('end')
      .returnVariables(['llm_response'])
      .build()
  )
  .addEdge('start', 'llm-call')
  .addEdge('llm-call', 'summarize')
  .addEdge('summarize', 'end')
  .build();
```

---

## 与配置文件混合使用

### 示例1：加载配置文件并使用SDK修改

```typescript
import { WorkflowBuilder, NodeBuilder } from '@graph-agent/sdk';
import { WorkflowManagement } from '@graph-agent/services';

// 从配置文件加载工作流
const workflowManagement = new WorkflowManagement(/* dependencies */);
const loadedWorkflow = await workflowManagement.loadWorkflow('simple-chat');

// 转换为SDK格式
const sdkWorkflow = WorkflowBuilder.fromDomain(loadedWorkflow);

// 使用SDK添加新节点
const modifiedWorkflow = sdkWorkflow
  .addNode(
    NodeBuilder.llm('additional-llm')
      .wrapper({ type: 'direct', provider: 'openai', model: 'gpt-4o' })
      .prompt('额外处理：{{llm_response}}')
      .build()
  )
  .addEdge('llm', 'additional-llm')
  .addEdge('additional-llm', 'end')
  .build();

// 执行修改后的工作流
const result = await sdk.execute(modifiedWorkflow, { prompt: '测试' });
```

### 示例2：使用SDK创建工作流并保存为配置

```typescript
import { WorkflowBuilder, NodeBuilder } from '@graph-agent/sdk';

// 使用SDK创建工作流
const sdkWorkflow = WorkflowBuilder.create('new-workflow')
  .name('新工作流')
  .addNode(
    NodeBuilder.start('start')
      .initialVariables({ input: 'test' })
      .build()
  )
  .addNode(
    NodeBuilder.llm('llm')
      .wrapper({ type: 'direct', provider: 'openai', model: 'gpt-4o' })
      .prompt('{{input}}')
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

// 转换为领域对象
const domainWorkflow = WorkflowBuilder.toDomain(sdkWorkflow);

// 保存为配置文件
await workflowManagement.saveWorkflow(domainWorkflow);
```

### 示例3：混合使用配置和SDK

```typescript
import { WorkflowBuilder, NodeBuilder } from '@graph-agent/sdk';

// 加载基础配置
const baseWorkflow = await workflowManagement.loadWorkflow('base-llm-call');

// 使用SDK扩展
const extendedWorkflow = WorkflowBuilder.fromDomain(baseWorkflow)
  .addNode(
    NodeBuilder.llm('post-process')
      .wrapper({ type: 'direct', provider: 'openai', model: 'gpt-4o' })
      .prompt('后处理：{{llm_response}}')
      .build()
  )
  .addEdge('llm', 'post-process')
  .addEdge('post-process', 'end')
  .build();

// 执行
const result = await sdk.execute(extendedWorkflow, { prompt: '测试' });
```

---

## 最佳实践

### 1. 选择合适的API风格

```typescript
// 简单场景：使用对象创建API
const simple = createWorkflow({ /* config */ });

// 中等复杂度：使用Builder API
const medium = WorkflowBuilder.create('workflow')
  .addNode(/* ... */)
  .build();

// 复杂场景：使用函数式API
const complex = workflow('workflow', {
  nodes: [/* ... */],
  edges: [/* ... */]
});
```

### 2. 错误处理

```typescript
try {
  const result = await sdk.execute(workflow, inputData);
  if (!result.success) {
    console.error('执行失败:', result.error);
    // 处理错误
  }
} catch (error) {
  console.error('执行异常:', error);
  // 处理异常
}
```

### 3. 资源清理

```typescript
const thread = ThreadBuilder.create('thread')
  .workflow(workflow)
  .build();

try {
  const result = await thread.execute();
} finally {
  // 确保资源被清理
  await thread.cleanup();
}
```

### 4. 类型安全

```typescript
// 使用TypeScript类型确保类型安全
interface MyWorkflowInput {
  query: string;
  maxResults?: number;
}

const typedWorkflow = WorkflowBuilder.create('typed-workflow')
  .addNode(
    NodeBuilder.llm('llm')
      .prompt('{{query}}')
      .build()
  )
  .build();

// 类型安全的执行
const result = await sdk.execute<MyWorkflowInput>(
  typedWorkflow,
  { query: 'test', maxResults: 10 }
);
```

### 5. 测试

```typescript
import { WorkflowBuilder, NodeBuilder } from '@graph-agent/sdk';

describe('My Workflow', () => {
  it('should execute successfully', async () => {
    const workflow = WorkflowBuilder.create('test-workflow')
      .addNode(NodeBuilder.start('start').build())
      .addNode(
        NodeBuilder.llm('llm')
          .wrapper({ type: 'direct', provider: 'mock', model: 'test' })
          .prompt('test')
          .build()
      )
      .addNode(NodeBuilder.end('end').build())
      .addEdge('start', 'llm')
      .addEdge('llm', 'end')
      .build();

    const result = await sdk.execute(workflow, {});
    expect(result.success).toBe(true);
  });
});
```

---

## 总结

本示例文档展示了Graph Agent SDK的各种使用方式：

1. **Builder API**：适合构建中等复杂度的工作流，提供流式接口
2. **函数式API**：适合复杂场景，支持函数组合和高阶函数
3. **对象创建API**：适合简单场景，提供快速创建接口
4. **Thread执行**：支持完整的线程生命周期管理
5. **高级用法**：支持并行、错误处理、循环等复杂场景
6. **混合使用**：可以与现有配置文件系统无缝集成

选择合适的API风格取决于具体的使用场景和团队偏好。SDK提供了灵活的选择，同时保持了类型安全和易用性。
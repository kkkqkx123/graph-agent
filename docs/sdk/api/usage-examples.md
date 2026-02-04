# SDK API使用示例

## WorkflowBuilder使用示例

### 基本工作流构建

```typescript
import { WorkflowBuilder, NodeType } from '@graph-agent/sdk';

// 创建简单的工作流
const workflow = WorkflowBuilder
  .create('simple-workflow')
  .name('简单工作流')
  .description('这是一个简单的工作流示例')
  .version('1.0.0')
  .addStartNode()
  .addLLMNode('process', 'gpt-4', '处理这个任务')
  .addEndNode()
  .addEdge('start', 'process')
  .addEdge('process', 'end')
  .build();

// 注册工作流
await sdk.workflows.register(workflow);
```

### 添加变量

```typescript
const workflow = WorkflowBuilder
  .create('variable-workflow')
  .addVariable('userName', 'string', {
    defaultValue: 'Alice',
    description: '用户名称',
    required: true
  })
  .addVariable('userAge', 'number', {
    defaultValue: 25,
    description: '用户年龄'
  })
  .addStartNode()
  .addEndNode()
  .addEdge('start', 'end')
  .build();
```

### 条件路由

```typescript
const workflow = WorkflowBuilder
  .create('route-workflow')
  .addStartNode()
  .addRouteNode('router', [
    { condition: '{{status}} === "success"', targetNodeId: 'success' },
    { condition: '{{status}} === "failure"', targetNodeId: 'failure' }
  ], 'default')
  .addEndNode('success')
  .addEndNode('failure')
  .addEndNode('default')
  .addEdge('start', 'router')
  .addEdge('router', 'success')
  .addEdge('router', 'failure')
  .addEdge('router', 'default')
  .build();
```

## ExecutionBuilder使用示例

### 基本执行

```typescript
import { SDKV2 } from '@graph-agent/sdk';

const sdk = await SDKV2.create();

// 执行工作流
const result = await sdk
  .execute('my-workflow')
  .withInput({ data: 'test' })
  .withTimeout(30000)
  .withMaxSteps(100)
  .execute();
```

### 带回调的执行

```typescript
const result = await sdk
  .execute('my-workflow')
  .withInput({ data: 'test' })
  .onProgress(progress => {
    console.log('进度:', progress);
  })
  .onError(error => {
    console.error('错误:', error);
  })
  .onNodeExecuted(nodeResult => {
    console.log('节点执行完成:', nodeResult);
  })
  .execute();
```

### Promise风格

```typescript
// 使用then/catch
await sdk
  .execute('my-workflow')
  .withInput({ data: 'test' })
  .then(result => {
    console.log('执行成功:', result);
  })
  .catch(error => {
    console.error('执行失败:', error);
  });

// 使用finally
await sdk
  .execute('my-workflow')
  .withInput({ data: 'test' })
  .finally(() => {
    console.log('执行完成');
  });
```

## Result类型使用示例

### 基本使用

```typescript
import { ok, err, tryCatch, tryCatchAsync } from '@graph-agent/sdk';

// 创建成功结果
const success = ok(42);
console.log(success.isOk()); // true
console.log(success.unwrap()); // 42

// 创建失败结果
const failure = err(new Error('something went wrong'));
console.log(failure.isErr()); // true
console.log(failure.error.message); // 'something went wrong'
```

### 链式操作

```typescript
const result = ok(10)
  .map(x => x * 2)
  .andThen(x => ok(x + 5))
  .map(x => x / 3);

if (result.isOk()) {
  console.log('结果:', result.value); // 25/3
}
```

### 错误处理

```typescript
const result = ok(10)
  .map(x => x * 2)
  .andThen(x => err(new Error('failed')))
  .orElse(() => ok(42))
  .map(x => x * 2);

console.log(result.unwrap()); // 84
```

### 异常捕获

```typescript
// 同步异常捕获
const result = tryCatch(() => {
  return JSON.parse('invalid json');
});

if (result.isErr()) {
  console.error('解析失败:', result.error);
}

// 异步异常捕获
const asyncResult = await tryCatchAsync(
  fetch('https://api.example.com/data')
);

if (asyncResult.isOk()) {
  const response = asyncResult.value;
  console.log('数据:', response);
}
```

### 组合操作

```typescript
// 组合多个Result
const results = [
  tryCatch(() => 1),
  tryCatch(() => 2),
  tryCatch(() => 3)
];

const combined = all(results);
if (combined.isOk()) {
  console.log('所有结果:', combined.value); // [1, 2, 3]
}

// 获取第一个成功的结果
const firstOk = any([
  err(new Error('failed')),
  ok(42),
  err(new Error('failed'))
]);

console.log(firstOk.unwrap()); // 42
```

## SDKV2使用示例

### 创建SDK实例

```typescript
import { SDKV2 } from '@graph-agent/sdk';

const sdk = await SDKV2.create({
  enableVersioning: true,
  maxVersions: 10
});
```

### 工作流管理

```typescript
// 使用WorkflowBuilder创建工作流
const workflow = sdk
  .workflow('my-workflow')
  .name('我的工作流')
  .addStartNode()
  .addLLMNode('process', 'gpt-4', '处理任务')
  .addEndNode()
  .addEdge('start', 'process')
  .addEdge('process', 'end')
  .build();

// 注册工作流
await sdk.workflows.register(workflow);

// 执行工作流
const result = await sdk
  .execute('my-workflow')
  .withInput({ data: 'test' })
  .execute();
```

### 工具使用

```typescript
// 执行工具
const result = await sdk
  .tool('calculator')
  .execute({ a: 1, b: 2 });

// 测试工具
const testResult = await sdk
  .tool('calculator')
  .test({ a: 1, b: 2 });
```

### 完整示例

```typescript
import { SDKV2, WorkflowBuilder, NodeType, ok, err, tryCatch } from '@graph-agent/sdk';

// 创建SDK实例
const sdk = await SDKV2.create();

// 创建工作流
const workflow = WorkflowBuilder
  .create('data-processing')
  .name('数据处理工作流')
  .description('处理输入数据并返回结果')
  .addVariable('input', 'string', { required: true })
  .addVariable('output', 'string')
  .addStartNode()
  .addLLMNode('process', 'gpt-4', '处理数据: {{input}}')
  .addEndNode()
  .addEdge('start', 'process')
  .addEdge('process', 'end')
  .build();

// 注册工作流
await sdk.workflows.register(workflow);

// 执行工作流（使用Result类型）
const result = await tryCatch(() =>
  sdk
    .execute('data-processing')
    .withInput({ input: 'Hello, World!' })
    .withTimeout(30000)
    .onProgress(progress => console.log('进度:', progress))
    .execute()
);

if (result.isOk()) {
  console.log('执行成功:', result.value);
} else {
  console.error('执行失败:', result.error);
}

// 关闭SDK
await sdk.shutdown();
```

## 最佳实践

### 1. 使用Result类型进行错误处理

```typescript
// 好的做法
const result = await tryCatchAsync(
  sdk.execute('workflow').withInput({ data }).execute()
);

if (result.isOk()) {
  // 处理成功结果
} else {
  // 处理错误
}

// 不好的做法
try {
  const result = await sdk.execute('workflow').withInput({ data }).execute();
} catch (error) {
  // 错误处理
}
```

### 2. 使用链式调用提高可读性

```typescript
// 好的做法
const workflow = WorkflowBuilder
  .create('workflow')
  .name('工作流')
  .addStartNode()
  .addEndNode()
  .addEdge('start', 'end')
  .build();

// 不好的做法
const builder = WorkflowBuilder.create('workflow');
builder.name('工作流');
builder.addStartNode();
builder.addEndNode();
builder.addEdge('start', 'end');
const workflow = builder.build();
```

### 3. 使用回调进行监控

```typescript
const result = await sdk
  .execute('workflow')
  .withInput({ data })
  .onProgress(progress => {
    // 更新UI进度
  })
  .onError(error => {
    // 记录错误日志
  })
  .onNodeExecuted(nodeResult => {
    // 记录节点执行结果
  })
  .execute();
```

### 4. 使用配置对象管理复杂配置

```typescript
const workflowConfig = {
  id: 'workflow',
  name: '工作流',
  nodes: [
    { id: 'start', type: NodeType.START },
    { id: 'end', type: NodeType.END }
  ],
  edges: [
    { from: 'start', to: 'end' }
  ]
};

const workflow = WorkflowBuilder
  .create(workflowConfig.id)
  .name(workflowConfig.name)
  .build();
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
import { SDK } from '@graph-agent/sdk';

const sdk = await SDK.create();

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

## SDK使用示例

### 创建SDK实例

```typescript
import { SDK } from '@graph-agent/sdk';

const sdk = await SDK.create({
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
import { SDK, WorkflowBuilder, NodeType, ok, err, tryCatch } from '@graph-agent/sdk';

// 创建SDK实例
const sdk = await SDK.create();

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

## Observable使用示例

### 基本使用

```typescript
import { of, fromArray, fromPromise, map, filter } from '@graph-agent/sdk';

// 创建Observable
const observable = of(1, 2, 3, 4, 5);

// 订阅Observable
observable.subscribe({
  next: (value) => console.log('值:', value),
  complete: () => console.log('完成')
});

// 使用操作符
of(1, 2, 3, 4, 5)
  .pipe(
    map(x => x * 2),
    filter(x => x > 5)
  )
  .subscribe({
    next: (value) => console.log('过滤后的值:', value)
  });
```

### 从Promise创建Observable

```typescript
import { fromPromise } from '@graph-agent/sdk';

const promise = fetch('https://api.example.com/data');
const observable = fromPromise(promise);

observable.subscribe({
  next: (response) => console.log('响应:', response),
  error: (error) => console.error('错误:', error),
  complete: () => console.log('请求完成')
});
```

### 组合操作符

```typescript
import { merge, concat, combineLatest } from '@graph-agent/sdk';

// 合并多个Observable
merge(of(1, 2), of(3, 4)).subscribe({
  next: (value) => console.log('合并:', value)
});

// 串联多个Observable
concat(of(1, 2), of(3, 4)).subscribe({
  next: (value) => console.log('串联:', value)
});

// 组合最新值
combineLatest(of(1, 2), of(3, 4)).subscribe({
  next: (values) => console.log('组合:', values)
});
```

### 错误处理

```typescript
import { catchError, retry } from '@graph-agent/sdk';

// 捕获错误
create((observer) => {
  observer.next(1);
  observer.error(new Error('发生错误'));
})
  .pipe(catchError(() => of(42)))
  .subscribe({
    next: (value) => console.log('值:', value)
  });

// 重试
create((observer) => {
  if (Math.random() > 0.5) {
    observer.next(42);
  } else {
    observer.error(new Error('随机错误'));
  }
})
  .pipe(retry(3))
  .subscribe({
    next: (value) => console.log('成功:', value),
    error: (error) => console.error('重试失败:', error)
  });
```

## executeAsync使用示例

### 基本异步执行

```typescript
import { SDK } from '@graph-agent/sdk';

const sdk = await SDK.create();

// 使用Observable执行工作流
sdk.execute('my-workflow')
  .withInput({ data: 'test' })
  .executeAsync()
  .subscribe({
    next: (event) => {
      switch (event.type) {
        case 'start':
          console.log('开始执行:', event.workflowId);
          break;
        case 'complete':
          console.log('执行完成:', event.result);
          break;
        case 'error':
          console.error('执行错误:', event.error);
          break;
        case 'cancelled':
          console.log('执行取消:', event.reason);
          break;
      }
    },
    error: (error) => console.error('订阅错误:', error),
    complete: () => console.log('流结束')
  });
```

### 进度监控

```typescript
// 监控执行进度
sdk.execute('my-workflow')
  .withInput({ data: 'test' })
  .observeProgress()
  .subscribe({
    next: (event) => {
      console.log('进度:', event.progress);
      // 更新UI进度条
      updateProgressBar(event.progress);
    }
  });

// 同时执行并监控
sdk.execute('my-workflow')
  .withInput({ data: 'test' })
  .executeAsync()
  .pipe(
    filter(event => event.type === 'progress')
  )
  .subscribe({
    next: (event) => {
      console.log('进度更新:', event.progress);
    }
  });
```

### 节点执行监控

```typescript
// 监控节点执行
sdk.execute('my-workflow')
  .withInput({ data: 'test' })
  .observeNodeExecuted()
  .subscribe({
    next: (event) => {
      console.log('节点执行完成:', event.nodeResult);
      // 记录节点执行日志
      logNodeExecution(event.nodeResult);
    }
  });
```

### 错误监控

```typescript
// 监控错误
sdk.execute('my-workflow')
  .withInput({ data: 'test' })
  .observeError()
  .subscribe({
    next: (event) => {
      console.error('发生错误:', event.error);
      // 发送错误通知
      sendErrorNotification(event.error);
    }
  });
```

### 取消执行

```typescript
// 创建可取消的执行
const execution = sdk.execute('my-workflow')
  .withInput({ data: 'test' })
  .executeAsync();

const subscription = execution.subscribe({
  next: (event) => console.log('事件:', event),
  error: (error) => console.error('错误:', error)
});

// 5秒后取消执行
setTimeout(() => {
  subscription.unsubscribe();
  console.log('执行已取消');
}, 5000);
```

### 组合多个监控

```typescript
// 监控所有事件
sdk.execute('my-workflow')
  .withInput({ data: 'test' })
  .observeAll()
  .subscribe({
    next: (event) => {
      switch (event.type) {
        case 'progress':
          console.log('进度:', event.progress);
          break;
        case 'nodeExecuted':
          console.log('节点:', event.nodeResult);
          break;
        case 'error':
          console.error('错误:', event.error);
          break;
      }
    }
  });
```

## WorkflowComposer使用示例

### 串联执行

```typescript
import { WorkflowComposer, sequential } from '@graph-agent/sdk';

// 创建串联组合
const composer = new WorkflowComposer();
composer
  .addWorkflow(workflow1, 'workflow-1', { data: 'input1' })
  .addWorkflow(workflow2, 'workflow-2', { data: 'input2' })
  .addWorkflow(workflow3, 'workflow-3', { data: 'input3' })
  .setType('sequential');

// 执行组合
const result = await composer.execute(async (workflowId, input) => {
  return await sdk.execute(workflowId).withInput(input).execute();
});

console.log('执行结果:', result);
console.log('合并结果:', result.mergedResult);
```

### 并联执行

```typescript
// 创建并联组合
const composer = new WorkflowComposer();
composer
  .addWorkflow(workflow1, 'workflow-1', { data: 'input1' })
  .addWorkflow(workflow2, 'workflow-2', { data: 'input2' })
  .addWorkflow(workflow3, 'workflow-3', { data: 'input3' })
  .setType('parallel');

// 执行组合
const result = await composer.execute(async (workflowId, input) => {
  return await sdk.execute(workflowId).withInput(input).execute();
});

console.log('所有工作流并行执行完成');
console.log('执行时间:', result.executionTime);
```

### 结果合并策略

```typescript
// 使用first策略
const composer1 = new WorkflowComposer();
composer1
  .addWorkflow(workflow1, 'workflow-1')
  .addWorkflow(workflow2, 'workflow-2')
  .setMergeStrategy('first');

// 使用last策略
const composer2 = new WorkflowComposer();
composer2
  .addWorkflow(workflow1, 'workflow-1')
  .addWorkflow(workflow2, 'workflow-2')
  .setMergeStrategy('last');

// 使用all策略
const composer3 = new WorkflowComposer();
composer3
  .addWorkflow(workflow1, 'workflow-1')
  .addWorkflow(workflow2, 'workflow-2')
  .setMergeStrategy('all');

// 使用自定义合并函数
const composer4 = new WorkflowComposer();
composer4
  .addWorkflow(workflow1, 'workflow-1')
  .addWorkflow(workflow2, 'workflow-2')
  .setCustomMergeFn((results) => {
    return {
      status: 'completed',
      output: {
        combined: true,
        count: results.length,
        data: results.map(r => r.output)
      }
    };
  });
```

### 错误处理

```typescript
// 在错误时停止执行
const composer1 = new WorkflowComposer();
composer1
  .addWorkflow(workflow1, 'workflow-1')
  .addWorkflow(workflow2, 'workflow-2')
  .setContinueOnError(false);

// 在错误时继续执行
const composer2 = new WorkflowComposer();
composer2
  .addWorkflow(workflow1, 'workflow-1')
  .addWorkflow(workflow2, 'workflow-2')
  .setContinueOnError(true);

const result = await composer2.execute(async (workflowId, input) => {
  return await sdk.execute(workflowId).withInput(input).execute();
});

console.log('成功:', result.success);
console.log('错误:', result.errors);
```

### 超时控制

```typescript
const composer = new WorkflowComposer();
composer
  .addWorkflow(workflow1, 'workflow-1')
  .addWorkflow(workflow2, 'workflow-2')
  .setTimeout(30000); // 30秒超时

const result = await composer.execute(async (workflowId, input) => {
  return await sdk.execute(workflowId).withInput(input).execute();
});

if (!result.success) {
  console.error('执行超时或失败:', result.errors);
}
```

### 异步执行

```typescript
// 使用Observable执行组合
const composer = new WorkflowComposer();
composer
  .addWorkflow(workflow1, 'workflow-1')
  .addWorkflow(workflow2, 'workflow-2')
  .setType('parallel');

composer.executeAsync(async (workflowId, input) => {
  return await sdk.execute(workflowId).withInput(input).execute();
}).subscribe({
  next: (event) => {
    switch (event.type) {
      case 'start':
        console.log('开始组合执行:', event.compositionType);
        break;
      case 'complete':
        console.log('组合执行完成:', event.result);
        break;
      case 'error':
        console.error('组合执行错误:', event.error);
        break;
    }
  }
});
```

### 辅助函数

```typescript
import { sequential, parallel, mergeWorkflows } from '@graph-agent/sdk';

// 使用sequential辅助函数
const seqComposer = sequential(
  { workflow: workflow1, workflowId: 'workflow-1' },
  { workflow: workflow2, workflowId: 'workflow-2' }
);

// 使用parallel辅助函数
const parComposer = parallel(
  { workflow: workflow1, workflowId: 'workflow-1' },
  { workflow: workflow2, workflowId: 'workflow-2' }
);

// 使用merge辅助函数
const mergeComposer = mergeWorkflows(
  { workflow: workflow1, workflowId: 'workflow-1' },
  { workflow: workflow2, workflowId: 'workflow-2' }
);
```

## 响应式编程最佳实践

### 1. 使用Observable处理异步流

```typescript
// 好的做法
sdk.execute('workflow')
  .executeAsync()
  .pipe(
    filter(event => event.type === 'complete'),
    map(event => event.result)
  )
  .subscribe({
    next: (result) => console.log('结果:', result)
  });

// 不好的做法
const result = await sdk.execute('workflow').execute();
```

### 2. 使用操作符转换数据

```typescript
// 好的做法
of(1, 2, 3, 4, 5)
  .pipe(
    map(x => x * 2),
    filter(x => x > 5),
    take(3)
  )
  .subscribe({
    next: (value) => console.log('值:', value)
  });

// 不好的做法
const values = [1, 2, 3, 4, 5];
const doubled = values.map(x => x * 2);
const filtered = doubled.filter(x => x > 5);
const taken = filtered.slice(0, 3);
taken.forEach(value => console.log('值:', value));
```

### 3. 正确处理错误

```typescript
// 好的做法
sdk.execute('workflow')
  .executeAsync()
  .pipe(
    catchError((error) => {
      console.error('错误:', error);
      return of({ status: 'failed', error });
    })
  )
  .subscribe({
    next: (event) => console.log('事件:', event)
  });

// 不好的做法
try {
  const result = await sdk.execute('workflow').execute();
} catch (error) {
  console.error('错误:', error);
}
```

### 4. 及时取消订阅

```typescript
// 好的做法
const subscription = sdk.execute('workflow')
  .executeAsync()
  .subscribe({
    next: (event) => console.log('事件:', event)
  });

// 在组件卸载时取消
onUnmount(() => {
  subscription.unsubscribe();
});

// 不好的做法
sdk.execute('workflow')
  .executeAsync()
  .subscribe({
    next: (event) => console.log('事件:', event)
  });
// 没有取消订阅，可能导致内存泄漏
```

### 5. 使用组合操作符

```typescript
// 好的做法
merge(
  sdk.execute('workflow1').executeAsync(),
  sdk.execute('workflow2').executeAsync(),
  sdk.execute('workflow3').executeAsync()
).subscribe({
  next: (event) => console.log('事件:', event)
});

// 不好的做法
const results = await Promise.all([
  sdk.execute('workflow1').execute(),
  sdk.execute('workflow2').execute(),
  sdk.execute('workflow3').execute()
]);
results.forEach(result => console.log('结果:', result));
```
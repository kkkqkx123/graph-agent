# SDK Command模式使用指南

## 概述

SDK现在支持Command模式，提供更统一、灵活的API接口。Command模式将所有操作封装为Command对象，通过CommandExecutor执行。

## 基本使用

### 1. 创建CommandExecutor

```typescript
import { CommandExecutor } from 'sdk/api';

const executor = new CommandExecutor();
```

### 2. 添加中间件（可选）

```typescript
import { LoggingMiddleware, ValidationMiddleware, CacheMiddleware } from 'sdk/api';

// 添加日志中间件
executor.addMiddleware(new LoggingMiddleware());

// 添加验证中间件
executor.addMiddleware(new ValidationMiddleware());

// 添加缓存中间件
executor.addMiddleware(new CacheMiddleware());
```

### 3. 执行Command

```typescript
import { ExecuteWorkflowCommand } from 'sdk/api';

const command = new ExecuteWorkflowCommand(
  { workflowId: 'my-workflow' },
  lifecycleCoordinator
);

const result = await executor.execute(command);

if (result.success) {
  console.log('执行成功:', result.data);
  console.log('执行时间:', result.executionTime, 'ms');
} else {
  console.error('执行失败:', result.error);
}
```

## 核心API使用示例

### 1. 执行工作流

```typescript
import { ExecuteWorkflowCommand, PauseThreadCommand, ResumeThreadCommand, CancelThreadCommand } from 'sdk/api';

// 执行工作流
const executeCommand = new ExecuteWorkflowCommand(
  { workflowId: 'workflow-123' },
  lifecycleCoordinator
);
const executeResult = await executor.execute(executeCommand);

// 暂停线程
const pauseCommand = new PauseThreadCommand(
  executeResult.data.threadId,
  lifecycleCoordinator
);
await executor.execute(pauseCommand);

// 恢复线程
const resumeCommand = new ResumeThreadCommand(
  executeResult.data.threadId,
  lifecycleCoordinator
);
await executor.execute(resumeCommand);

// 取消线程
const cancelCommand = new CancelThreadCommand(
  executeResult.data.threadId,
  lifecycleCoordinator
);
await executor.execute(cancelCommand);
```

### 2. LLM调用

```typescript
import { GenerateCommand, GenerateBatchCommand } from 'sdk/api';

// 单次生成
const generateCommand = new GenerateCommand(
  {
    model: 'gpt-4',
    messages: [
      { role: 'user', content: 'Hello, how are you?' }
    ]
  },
  llmWrapper
);
const generateResult = await executor.execute(generateCommand);

// 批量生成
const batchCommand = new GenerateBatchCommand(
  [
    {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Question 1' }]
    },
    {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Question 2' }]
    }
  ],
  llmWrapper
);
const batchResult = await executor.execute(batchCommand);
```

### 3. 工具执行

```typescript
import { ExecuteToolCommand, ExecuteBatchCommand, TestToolCommand } from 'sdk/api';

// 执行单个工具
const executeToolCommand = new ExecuteToolCommand(
  'my-tool',
  { param1: 'value1', param2: 'value2' }
);
const toolResult = await executor.execute(executeToolCommand);

// 批量执行工具
const batchToolCommand = new ExecuteBatchCommand([
  { toolName: 'tool1', parameters: { param: 'value1' } },
  { toolName: 'tool2', parameters: { param: 'value2' } }
]);
const batchToolResult = await executor.execute(batchToolCommand);

// 测试工具
const testToolCommand = new TestToolCommand(
  'my-tool',
  { param1: 'test-value' }
);
const testResult = await executor.execute(testToolCommand);
```

### 4. 脚本执行

```typescript
import { ExecuteScriptCommand, ExecuteBatchCommand, TestScriptCommand } from 'sdk/api';

// 执行脚本
const executeScriptCommand = new ExecuteScriptCommand(
  'my-script',
  { timeout: 5000 }
);
const scriptResult = await executor.execute(executeScriptCommand);

// 批量执行脚本
const batchScriptCommand = new ExecuteBatchCommand([
  { scriptName: 'script1', options: { timeout: 3000 } },
  { scriptName: 'script2', options: { timeout: 5000 } }
]);
const batchScriptResult = await executor.execute(batchScriptCommand);

// 测试脚本
const testScriptCommand = new TestScriptCommand(
  'my-script',
  { timeout: 5000 }
);
const testScriptResult = await executor.execute(testScriptCommand);
```

## 监控API使用示例

### 1. 消息查询

```typescript
import { GetMessagesCommand, GetRecentMessagesCommand, SearchMessagesCommand, GetMessageStatsCommand, ExportMessagesCommand } from 'sdk/api';

// 获取消息列表
const getMessagesCommand = new GetMessagesCommand({
  threadId: 'thread-123',
  limit: 10,
  orderBy: 'desc'
});
const messagesResult = await executor.execute(getMessagesCommand);

// 获取最近消息
const recentMessagesCommand = new GetRecentMessagesCommand({
  threadId: 'thread-123',
  count: 5
});
const recentMessagesResult = await executor.execute(recentMessagesCommand);

// 搜索消息
const searchMessagesCommand = new SearchMessagesCommand({
  threadId: 'thread-123',
  query: 'error'
});
const searchResult = await executor.execute(searchMessagesCommand);

// 获取消息统计
const statsCommand = new GetMessageStatsCommand({
  threadId: 'thread-123'
});
const statsResult = await executor.execute(statsCommand);

// 导出消息
const exportCommand = new ExportMessagesCommand({
  threadId: 'thread-123',
  format: 'json'
});
const exportResult = await executor.execute(exportCommand);
```

### 2. 事件监听

```typescript
import { OnEventCommand, OnceEventCommand, OffEventCommand, WaitForEventCommand } from 'sdk/api';
import { EventType } from 'sdk/types/events';

// 注册事件监听器
const onEventCommand = new OnEventCommand({
  eventType: EventType.THREAD_COMPLETED,
  listener: (event) => {
    console.log('Thread completed:', event);
  }
});
const unsubscribe = await executor.execute(onEventCommand);

// 注册一次性事件监听器
const onceEventCommand = new OnceEventCommand({
  eventType: EventType.NODE_COMPLETED,
  listener: (event) => {
    console.log('Node completed once:', event);
  }
});
const onceUnsubscribe = await executor.execute(onceEventCommand);

// 等待事件
const waitForEventCommand = new WaitForEventCommand({
  eventType: EventType.THREAD_COMPLETED,
  timeout: 5000
});
const eventResult = await executor.execute(waitForEventCommand);

// 注销事件监听器
const offEventCommand = new OffEventCommand({
  eventType: EventType.THREAD_COMPLETED,
  listener: (event) => {
    console.log('Thread completed:', event);
  }
});
await executor.execute(offEventCommand);
```

### 3. 状态查询

```typescript
import { GetVariablesCommand, GetVariableCommand, HasVariableCommand, GetVariableDefinitionsCommand } from 'sdk/api';

// 获取所有变量
const getVariablesCommand = new GetVariablesCommand({
  threadId: 'thread-123'
});
const variablesResult = await executor.execute(getVariablesCommand);

// 获取单个变量
const getVariableCommand = new GetVariableCommand({
  threadId: 'thread-123',
  name: 'userName'
});
const variableResult = await executor.execute(getVariableCommand);

// 检查变量是否存在
const hasVariableCommand = new HasVariableCommand({
  threadId: 'thread-123',
  name: 'userName'
});
const hasVariableResult = await executor.execute(hasVariableCommand);

// 获取变量定义
const getDefinitionsCommand = new GetVariableDefinitionsCommand({
  threadId: 'thread-123'
});
const definitionsResult = await executor.execute(getDefinitionsCommand);
```

## 管理API使用示例

### 1. 检查点管理

```typescript
import { CreateCheckpointCommand, RestoreFromCheckpointCommand, GetCheckpointsCommand, DeleteCheckpointCommand } from 'sdk/api';

// 创建检查点
const createCheckpointCommand = new CreateCheckpointCommand({
  threadId: 'thread-123',
  metadata: { description: 'Before critical operation' }
});
const checkpointResult = await executor.execute(createCheckpointCommand);

// 从检查点恢复
const restoreCommand = new RestoreFromCheckpointCommand({
  checkpointId: checkpointResult.data.id
});
const restoreResult = await executor.execute(restoreCommand);

// 获取检查点列表
const getCheckpointsCommand = new GetCheckpointsCommand({
  filter: { threadId: 'thread-123' }
});
const checkpointsResult = await executor.execute(getCheckpointsCommand);

// 删除检查点
const deleteCheckpointCommand = new DeleteCheckpointCommand({
  checkpointId: 'checkpoint-456'
});
await executor.execute(deleteCheckpointCommand);
```

### 2. 触发器管理

```typescript
import { GetTriggersCommand, EnableTriggerCommand, DisableTriggerCommand } from 'sdk/api';

// 获取触发器列表
const getTriggersCommand = new GetTriggersCommand({
  threadId: 'thread-123'
});
const triggersResult = await executor.execute(getTriggersCommand);

// 启用触发器
const enableTriggerCommand = new EnableTriggerCommand({
  threadId: 'thread-123',
  triggerId: 'trigger-789'
});
await executor.execute(enableTriggerCommand);

// 禁用触发器
const disableTriggerCommand = new DisableTriggerCommand({
  threadId: 'thread-123',
  triggerId: 'trigger-789'
});
await executor.execute(disableTriggerCommand);
```

## 批量执行

### 并行执行

```typescript
import { ExecuteWorkflowCommand, GetMessagesCommand } from 'sdk/api';

const commands = [
  new ExecuteWorkflowCommand(
    { workflowId: 'workflow-1' },
    lifecycleCoordinator
  ),
  new ExecuteWorkflowCommand(
    { workflowId: 'workflow-2' },
    lifecycleCoordinator
  ),
  new GetMessagesCommand({ threadId: 'thread-123' })
];

const results = await executor.executeBatch(commands, { mode: 'parallel' });

results.forEach((result, index) => {
  if (result.success) {
    console.log(`Command ${index} succeeded:`, result.data);
  } else {
    console.error(`Command ${index} failed:`, result.error);
  }
});
```

### 串行执行

```typescript
const results = await executor.executeBatch(commands, { mode: 'serial' });

// 串行执行时，如果某个Command失败，后续Command不会执行
results.forEach((result, index) => {
  if (result.success) {
    console.log(`Command ${index} succeeded:`, result.data);
  } else {
    console.error(`Command ${index} failed:`, result.error);
  }
});
```

## 错误处理

### 统一错误处理

```typescript
const result = await executor.execute(command);

if (result.success) {
  // 处理成功结果
  console.log('Success:', result.data);
} else {
  // 处理错误
  console.error('Error:', result.error);
}
```

### 使用辅助函数

```typescript
import { isSuccess, getData, getError } from 'sdk/api';

const result = await executor.execute(command);

if (isSuccess(result)) {
  const data = getData(result);
  console.log('Data:', data);
} else {
  const error = getError(result);
  console.error('Error:', error);
}
```

## 中间件使用

### 自定义中间件

```typescript
import { CommandMiddleware } from 'sdk/api';

class CustomMiddleware implements CommandMiddleware {
  async beforeExecute<T>(command: Command<T>): Promise<void> {
    console.log(`Executing command: ${command.getMetadata().name}`);
  }

  async afterExecute<T>(command: Command<T>, result: ExecutionResult<T>): Promise<void> {
    console.log(`Command executed in ${result.executionTime}ms`);
  }

  async onError<T>(command: Command<T>, error: Error): Promise<void> {
    console.error(`Command failed: ${error.message}`);
  }
}

executor.addMiddleware(new CustomMiddleware());
```

### 重试中间件

```typescript
import { RetryMiddleware } from 'sdk/api';

const retryMiddleware = new RetryMiddleware({
  maxRetries: 3,
  retryDelay: 1000,
  retryableErrors: ['NetworkError', 'TimeoutError']
});

executor.addMiddleware(retryMiddleware);
```

## 最佳实践

### 1. 复用CommandExecutor

```typescript
// 创建全局CommandExecutor实例
const globalExecutor = new CommandExecutor();
globalExecutor.addMiddleware(new LoggingMiddleware());
globalExecutor.addMiddleware(new ValidationMiddleware());

// 在整个应用中使用
export { globalExecutor as executor };
```

### 2. 使用依赖注入

```typescript
class MyService {
  constructor(
    private readonly executor: CommandExecutor,
    private readonly lifecycleCoordinator: ThreadLifecycleCoordinator
  ) {}

  async executeWorkflow(workflowId: string) {
    const command = new ExecuteWorkflowCommand(
      { workflowId },
      this.lifecycleCoordinator
    );
    return await this.executor.execute(command);
  }
}
```

### 3. 错误处理和重试

```typescript
async function executeWithRetry(command: Command<any>, maxRetries: number = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await executor.execute(command);
    if (result.success) {
      return result;
    }
    
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  return result;
}
```

### 4. 批量操作优化

```typescript
// 对于大量操作，使用批量执行
async function processManyWorkflows(workflowIds: string[]) {
  const commands = workflowIds.map(id => 
    new ExecuteWorkflowCommand({ workflowId: id }, lifecycleCoordinator)
  );
  
  return await executor.executeBatch(commands, { mode: 'parallel' });
}
```

## 总结

Command模式提供了以下优势：

1. **统一的接口**：所有操作都通过Command执行
2. **灵活的中间件**：通过中间件系统轻松添加功能
3. **更好的可测试性**：Command可以独立测试
4. **批量执行支持**：支持并行和串行批量执行
5. **统一的错误处理**：所有操作返回统一的ExecutionResult类型

通过合理使用Command模式，可以构建更清晰、更可维护的代码。
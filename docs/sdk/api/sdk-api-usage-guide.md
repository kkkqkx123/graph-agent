# SDK API 使用指南

本文档介绍SDK API层重构后的使用方法，包括工厂模式、装饰器、错误处理、事件系统和审计日志等功能。

## 目录

1. [快速开始](#快速开始)
2. [API工厂](#api工厂)
3. [装饰器](#装饰器)
4. [错误处理](#错误处理)
5. [事件系统](#事件系统)
6. [审计日志](#审计日志)
7. [最佳实践](#最佳实践)

## 快速开始

### 基本使用

```typescript
import { sdk } from '@your-sdk/sdk';

// 使用全局SDK实例
const workflow = await sdk.workflows.getWorkflow('workflow-id');
const tools = await sdk.tools.getTools();
```

### 使用工厂创建API

```typescript
import { apiFactory } from '@your-sdk/sdk';

// 配置工厂
apiFactory.configure({
  workflow: { enableCache: true, cacheTTL: 60000 },
  tool: { enableLogging: true }
});

// 创建API实例
const workflowAPI = apiFactory.createWorkflowAPI();
const toolAPI = apiFactory.createToolAPI();

// 使用API
const workflow = await workflowAPI.getWorkflow('workflow-id');
```

## API工厂

### 配置工厂

```typescript
import { apiFactory, type SDKAPIConfig } from '@your-sdk/sdk';

const config: SDKAPIConfig = {
  workflow: {
    enableCache: true,
    cacheTTL: 300000, // 5分钟
    enableValidation: true,
    enableLogging: false
  },
  tool: {
    enableCache: true,
    cacheTTL: 300000,
    enableValidation: true,
    enableLogging: true
  }
};

apiFactory.configure(config);
```

### 创建单个API

```typescript
// 创建工作流API
const workflowAPI = apiFactory.createWorkflowAPI();

// 创建工具API
const toolAPI = apiFactory.createToolAPI();

// 创建线程API
const threadAPI = apiFactory.createThreadAPI();

// 创建脚本API
const scriptAPI = apiFactory.createScriptAPI();

// 创建Profile API
const profileAPI = apiFactory.createProfileAPI();

// 创建节点模板API
const nodeTemplateAPI = apiFactory.createNodeTemplateAPI();

// 创建触发器模板API
const triggerTemplateAPI = apiFactory.createTriggerTemplateAPI();
```

### 创建所有API

```typescript
const apis = apiFactory.createAllAPIs();

// 访问各个API
const workflow = await apis.workflows.getWorkflow('workflow-id');
const tools = await apis.tools.getTools();
```

### 覆盖配置

```typescript
// 使用自定义配置创建API
const workflowAPI = apiFactory.createWorkflowAPI({
  enableCache: false,
  enableLogging: true
});
```

## 装饰器

### 缓存装饰器

```typescript
import { withCache } from '@your-sdk/sdk';

const workflowAPI = apiFactory.createWorkflowAPI();

// 应用缓存装饰器
const cachedAPI = withCache(workflowAPI, {
  ttl: 60000, // 1分钟
  keyPrefix: 'workflow'
});

// 使用装饰后的API
const workflow = await cachedAPI.get('workflow-id');

// 获取缓存统计
const stats = (cachedAPI as any).getCacheStats();
console.log('Cache stats:', stats);

// 清除缓存
(cachedAPI as any).clearCache();
```

### 日志装饰器

```typescript
import { withLogging } from '@your-sdk/sdk';

const toolAPI = apiFactory.createToolAPI();

// 应用日志装饰器
const loggedAPI = withLogging(toolAPI, {
  level: 'info',
  logArgs: true,
  logResult: true,
  logExecutionTime: true
});

// 使用装饰后的API
const tools = await loggedAPI.getTools();
```

### 性能监控装饰器

```typescript
import { withPerformance } from '@your-sdk/sdk';

const scriptAPI = apiFactory.createScriptAPI();

// 应用性能监控装饰器
const monitoredAPI = withPerformance(scriptAPI, {
  slowQueryThreshold: 1000, // 1秒
  enableStats: true
});

// 使用装饰后的API
const scripts = await monitoredAPI.getScripts();

// 获取性能统计
const stats = (monitoredAPI as any).getPerformanceStats();
console.log('Performance stats:', stats);

// 重置统计
(monitoredAPI as any).resetPerformanceStats();
```

### 重试装饰器

```typescript
import { withRetry } from '@your-sdk/sdk';

const profileAPI = apiFactory.createProfileAPI();

// 应用重试装饰器
const retryAPI = withRetry(profileAPI, {
  maxRetries: 3,
  retryDelay: 1000,
  backoffFactor: 2,
  retryableErrors: ['TIMEOUT', 'SERVICE_UNAVAILABLE']
});

// 使用装饰后的API
const profile = await retryAPI.getProfile('profile-id');
```

### 组合装饰器

```typescript
import { decorate, withCache, withLogging, withPerformance } from '@your-sdk/sdk';

const workflowAPI = apiFactory.createWorkflowAPI();

// 组合多个装饰器
const enhancedAPI = decorate(workflowAPI, [
  (api) => withCache(api, { ttl: 60000 }),
  (api) => withLogging(api, { level: 'info' }),
  (api) => withPerformance(api, { slowQueryThreshold: 1000 })
]);

// 使用增强后的API
const workflow = await enhancedAPI.get('workflow-id');
```

## 错误处理

### 使用APIError

```typescript
import { APIError, APIErrorCode } from '@your-sdk/sdk';

// 创建错误
const error = APIError.resourceNotFound('Workflow', 'workflow-id');
console.log(error.code); // RESOURCE_NOT_FOUND
console.log(error.message); // Workflow with ID 'workflow-id' not found

// 转换为JSON
const json = error.toJSON();
console.log(json);

// 转换为字符串
const str = error.toString();
console.log(str);
```

### 错误处理器

```typescript
import { DefaultErrorHandler, ErrorHandlerRegistry } from '@your-sdk/sdk';

// 使用默认错误处理器
const handler = new DefaultErrorHandler();
const error = handler.handle(new Error('Not found'));

// 注册自定义错误处理器
ErrorHandlerRegistry.getInstance().register('CUSTOM', {
  handle: (error: unknown) => {
    // 自定义错误处理逻辑
    return APIError.internal('Custom error');
  }
});

// 获取错误处理器
const customHandler = ErrorHandlerRegistry.getInstance().get('CUSTOM');
```

### 在API中使用错误处理

```typescript
import { APIError, APIErrorCode } from '@your-sdk/sdk';

try {
  const workflow = await workflowAPI.get('workflow-id');
  if (!workflow.success) {
    throw APIError.resourceNotFound('Workflow', 'workflow-id');
  }
} catch (error) {
  if (error instanceof APIError) {
    console.error(`[${error.code}] ${error.message}`);
    // 处理API错误
  } else {
    console.error('Unknown error:', error);
  }
}
```

## 事件系统

### 订阅事件

```typescript
import { apiEventBus, APIEventType } from '@your-sdk/sdk';

// 订阅资源创建事件
const unsubscribe = apiEventBus.on(APIEventType.RESOURCE_CREATED, (event) => {
  console.log('Resource created:', event);
});

// 订阅一次性事件
apiEventBus.once(APIEventType.RESOURCE_CREATED, (event) => {
  console.log('Resource created (once):', event);
});

// 取消订阅
unsubscribe();
```

### 发布事件

```typescript
import { apiEventBus, APIEventBuilder, APIEventType } from '@your-sdk/sdk';

// 使用事件构建器
const event = new APIEventBuilder()
  .type(APIEventType.RESOURCE_CREATED)
  .resourceType('Workflow')
  .resourceId('workflow-id')
  .operation('CREATE')
  .data({ name: 'Test Workflow' })
  .build();

// 发布事件
await apiEventBus.emit(event);
```

### 事件过滤

```typescript
// 使用过滤条件
apiEventBus.on(APIEventType.RESOURCE_CREATED, (event) => {
  console.log('Workflow created:', event);
}, {
  filter: (event) => event.resourceType === 'Workflow'
});
```

### 事件优先级

```typescript
// 设置监听器优先级
apiEventBus.on(APIEventType.RESOURCE_CREATED, (event) => {
  console.log('High priority listener');
}, { priority: 10 });

apiEventBus.on(APIEventType.RESOURCE_CREATED, (event) => {
  console.log('Low priority listener');
}, { priority: 1 });
```

### 事件历史

```typescript
// 获取事件历史
const history = apiEventBus.getHistory({
  eventType: APIEventType.RESOURCE_CREATED,
  resourceType: 'Workflow',
  startTime: Date.now() - 3600000 // 最近1小时
});

console.log('Event history:', history);

// 清除历史
apiEventBus.clearHistory();
```

## 审计日志

### 记录审计日志

```typescript
import { auditLogger, AuditLogLevel } from '@your-sdk/sdk';

// 记录操作
await auditLogger.log({
  level: AuditLogLevel.INFO,
  operation: 'CREATE',
  resourceType: 'Workflow',
  resourceId: 'workflow-id',
  result: 'SUCCESS',
  executionTime: 100,
  userId: 'user-123',
  sessionId: 'session-456'
});
```

### 查询审计日志

```typescript
// 查询日志
const logs = await auditLogger.query({
  resourceType: 'Workflow',
  result: 'SUCCESS',
  startTime: Date.now() - 86400000, // 最近24小时
  limit: 100
});

console.log('Audit logs:', logs);
```

### 获取统计信息

```typescript
// 获取统计信息
const stats = await auditLogger.getStatistics({
  resourceType: 'Workflow',
  startTime: Date.now() - 86400000
});

console.log('Statistics:', stats);
// {
//   total: 100,
//   byLevel: { DEBUG: 10, INFO: 80, WARN: 8, ERROR: 2 },
//   byOperation: { CREATE: 50, UPDATE: 30, DELETE: 20 },
//   byResourceType: { Workflow: 100 },
//   byResult: { SUCCESS: 95, FAILURE: 5 },
//   avgExecutionTime: 150
// }
```

### 自定义存储

```typescript
import { AuditLogger, AuditLogLevel, type AuditLogStorage, type AuditLogEntry } from '@your-sdk/sdk';

// 实现自定义存储
class CustomStorage implements AuditLogStorage {
  async write(entry: AuditLogEntry): Promise<void> {
    // 写入数据库或文件
  }

  async query(filter: any): Promise<AuditLogEntry[]> {
    // 查询数据库或文件
    return [];
  }

  async clear(beforeTime?: number): Promise<void> {
    // 清除数据
  }
}

// 使用自定义存储
const customLogger = new AuditLogger({
  storage: new CustomStorage(),
  enabled: true,
  defaultLevel: AuditLogLevel.INFO,
  logSuccess: true,
  logFailure: true,
  logPerformance: true
});
```

## 最佳实践

### 1. 使用工厂模式管理API实例

```typescript
// 推荐：使用工厂创建API
const workflowAPI = apiFactory.createWorkflowAPI();

// 不推荐：直接实例化
const workflowAPI = new WorkflowRegistryAPI();
```

### 2. 合理使用装饰器

```typescript
// 推荐：组合使用装饰器
const enhancedAPI = decorate(workflowAPI, [
  (api) => withCache(api, { ttl: 60000 }),
  (api) => withLogging(api, { level: 'info' })
]);

// 不推荐：过度使用装饰器
const overDecoratedAPI = decorate(workflowAPI, [
  (api) => withCache(api),
  (api) => withLogging(api),
  (api) => withPerformance(api),
  (api) => withRetry(api)
]);
```

### 3. 统一错误处理

```typescript
// 推荐：使用APIError
try {
  const result = await workflowAPI.get('workflow-id');
  if (!result.success) {
    throw APIError.resourceNotFound('Workflow', 'workflow-id');
  }
} catch (error) {
  if (error instanceof APIError) {
    // 处理API错误
  }
}

// 不推荐：使用通用Error
throw new Error('Workflow not found');
```

### 4. 使用事件系统解耦

```typescript
// 推荐：使用事件系统
apiEventBus.on(APIEventType.RESOURCE_CREATED, (event) => {
  // 处理资源创建事件
});

// 不推荐：直接调用
workflowAPI.registerWorkflow(workflow);
notifyListeners(workflow);
```

### 5. 启用审计日志

```typescript
// 推荐：启用审计日志
auditLogger.enable();

// 不推荐：禁用审计日志
auditLogger.disable();
```

### 6. 配置缓存策略

```typescript
// 推荐：根据资源特性配置缓存
apiFactory.configure({
  workflow: { enableCache: true, cacheTTL: 300000 }, // 工作流变化较少
  thread: { enableCache: true, cacheTTL: 5000 },     // 线程状态变化频繁
  tool: { enableCache: true, cacheTTL: 300000 }      // 工具定义变化较少
});

// 不推荐：统一配置
apiFactory.configure({
  workflow: { enableCache: true, cacheTTL: 300000 },
  thread: { enableCache: true, cacheTTL: 300000 },
  tool: { enableCache: true, cacheTTL: 300000 }
});
```

## 迁移指南

### 从旧API迁移到新API

```typescript
// 旧方式
import { WorkflowRegistryAPI } from '@your-sdk/sdk';
const workflowAPI = new WorkflowRegistryAPI();
const workflow = await workflowAPI.getWorkflow('workflow-id');

// 新方式
import { apiFactory } from '@your-sdk/sdk';
const workflowAPI = apiFactory.createWorkflowAPI();
const result = await workflowAPI.get('workflow-id');
const workflow = result.success ? result.data : null;
```

### 向后兼容性

新API保持向后兼容，旧代码无需修改即可继续使用：

```typescript
// 旧代码仍然有效
const workflow = await sdk.workflows.getWorkflow('workflow-id');
```

## 总结

SDK API层重构提供了以下改进：

1. **工厂模式**：统一管理API实例创建和配置
2. **装饰器模式**：动态添加缓存、日志、性能监控等功能
3. **统一错误处理**：标准化的错误码和错误处理机制
4. **事件系统**：解耦组件，支持事件驱动架构
5. **审计日志**：记录所有操作，便于追踪和调试

通过合理使用这些功能，可以构建更加健壮、可维护的应用程序。
# Hook处理器模块

## 概述

Hook处理器模块提供统一的Hook执行接口和注册机制，支持在节点执行前后触发自定义逻辑。模块采用插件化架构，通过注册机制支持扩展不同类型的Hook处理器。

## 架构设计

### 目录结构

```
hook-handlers/
├── index.ts                    # 统一导出和注册管理
├── hook-handler.ts             # 主执行逻辑
├── custom-hook-handler.ts      # 自定义Hook处理器
├── notification-hook-handler.ts # 通知类Hook处理器
├── validation-hook-handler.ts  # 验证类Hook处理器
└── utils/                      # 工具函数
    ├── context-builder.ts      # 上下文构建
    ├── event-emitter.ts        # 事件发射
    ├── payload-generator.ts    # 载荷生成
    └── index.ts                # 工具函数导出
```

### 核心组件

#### 1. Hook处理器接口

```typescript
export type HookHandler = (
  context: HookExecutionContext,
  hook: NodeHook,
  emitEvent: (event: NodeCustomEvent) => Promise<void>
) => Promise<void>;
```

#### 2. 注册机制

```typescript
// 注册Hook处理器
registerHookHandler(hookName: string, handler: HookHandler): void

// 获取Hook处理器
getHookHandler(hookName: string): HookHandler
```

#### 3. 主执行函数

```typescript
executeHook(
  context: HookExecutionContext,
  hookType: HookType,
  emitEvent: (event: NodeCustomEvent) => Promise<void>
): Promise<void>
```

## 内置Hook处理器

### 1. 默认处理器 (default)

执行标准的Hook逻辑：
- 条件评估
- 事件载荷生成
- 事件触发

### 2. 自定义处理器 (custom)

支持通过`eventPayload.handler`参数传入自定义处理函数：

```typescript
{
  hookName: 'custom',
  hookType: HookType.AFTER_EXECUTE,
  eventName: 'custom.event',
  eventPayload: {
    handler: async (context, hook) => {
      // 自定义逻辑
    }
  }
}
```

### 3. 通知处理器 (notification)

专门用于处理通知相关的Hook，支持通知类型和优先级：

```typescript
{
  hookName: 'notification',
  hookType: HookType.AFTER_EXECUTE,
  eventName: 'notification.send',
  eventPayload: {
    notificationType: 'email',
    priority: 'high'
  }
}
```

### 4. 验证处理器 (validation)

支持数据验证和权限检查：

```typescript
{
  hookName: 'validation',
  hookType: HookType.BEFORE_EXECUTE,
  eventName: 'validation.check',
  eventPayload: {
    validationRules: [
      {
        expression: 'output.result > 0',
        message: '结果必须大于0'
      }
    ]
  }
}
```

## 使用示例

### 基本使用

```typescript
import { executeHook, HookType } from './handlers/hook-handlers';

// 执行节点执行前的Hook
await executeHook(
  {
    thread: threadInstance,
    node: nodeDefinition
  },
  HookType.BEFORE_EXECUTE,
  emitEventFunction
);

// 执行节点执行后的Hook
await executeHook(
  {
    thread: threadInstance,
    node: nodeDefinition,
    result: nodeExecutionResult
  },
  HookType.AFTER_EXECUTE,
  emitEventFunction
);
```

### 注册自定义Hook处理器

```typescript
import { registerHookHandler } from './handlers/hook-handlers';

async function myCustomHandler(
  context: HookExecutionContext,
  hook: NodeHook,
  emitEvent: (event: NodeCustomEvent) => Promise<void>
): Promise<void> {
  // 自定义逻辑
  console.log(`Executing custom hook: ${hook.hookName}`);
  
  // 触发事件
  await emitHookEvent(context, hook.eventName, { customData: 'value' }, emitEvent);
}

// 注册处理器
registerHookHandler('myCustom', myCustomHandler);
```

### 在节点配置中使用Hook

```typescript
const node: Node = {
  id: 'node-1',
  type: NodeType.LLM,
  name: 'LLM节点',
  config: { /* ... */ },
  hooks: [
    {
      hookName: 'notification',
      hookType: HookType.AFTER_EXECUTE,
      eventName: 'node.completed',
      condition: 'output.status === "COMPLETED"',
      eventPayload: {
        notificationType: 'email',
        priority: 'normal'
      },
      weight: 10,
      enabled: true
    },
    {
      hookName: 'validation',
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'node.validate',
      eventPayload: {
        validationRules: [
          {
            expression: 'variables.userId != null',
            message: '用户ID不能为空'
          }
        ]
      },
      weight: 20,
      enabled: true
    }
  ]
};
```

## 工具函数

### 上下文构建

```typescript
import { buildHookEvaluationContext, convertToEvaluationContext } from './handlers/hook-handlers/utils';

// 构建Hook评估上下文
const evalContext = buildHookEvaluationContext(context);

// 转换为条件评估上下文
const conditionContext = convertToEvaluationContext(evalContext);
```

### 事件载荷生成

```typescript
import { generateHookEventData } from './handlers/hook-handlers/utils';

// 生成事件载荷
const eventData = generateHookEventData(hook, evalContext);
```

### 事件发射

```typescript
import { emitHookEvent } from './handlers/hook-handlers/utils';

// 触发Hook事件
await emitHookEvent(context, eventName, eventData, emitEvent);
```

## Hook执行流程

1. **筛选Hook**: 根据Hook类型和enabled状态筛选符合条件的Hook
2. **排序**: 按权重排序（权重高的先执行）
3. **并行执行**: 异步执行所有Hook，不阻塞节点执行
4. **获取处理器**: 根据hookName获取对应的处理器
5. **执行处理器**: 调用处理器执行Hook逻辑
6. **错误隔离**: Hook执行失败不影响节点正常执行

## 扩展指南

### 创建新的Hook处理器

1. 创建新的处理器文件（如`logging-hook-handler.ts`）
2. 实现HookHandler接口
3. 使用`registerHookHandler`注册处理器
4. 在`index.ts`中导出

示例：

```typescript
// logging-hook-handler.ts
import type { NodeHook } from '../../../../types/node';
import type { HookExecutionContext } from './hook-handler';
import type { NodeCustomEvent } from '../../../../types/events';
import { registerHookHandler } from './index';

async function loggingHookHandler(
  context: HookExecutionContext,
  hook: NodeHook,
  emitEvent: (event: NodeCustomEvent) => Promise<void>
): Promise<void> {
  // 日志记录逻辑
  console.log(`[Hook] ${hook.hookName} executed at ${new Date().toISOString()}`);
  
  // 触发事件
  await emitHookEvent(context, hook.eventName, { timestamp: Date.now() }, emitEvent);
}

registerHookHandler('logging', loggingHookHandler);
export { loggingHookHandler };
```

## 注意事项

1. **异步执行**: Hook是异步执行的，不会阻塞节点执行
2. **错误隔离**: Hook执行失败不会影响节点正常执行，只会记录错误日志
3. **条件评估**: Hook支持条件表达式，只有条件满足时才会触发
4. **权重排序**: 支持通过weight参数控制Hook执行顺序
5. **事件载荷**: 支持自定义事件载荷，可以使用模板变量

## 与Trigger处理器的对比

| 特性 | Hook处理器 | Trigger处理器 |
|------|-----------|---------------|
| 触发时机 | 节点执行前后 | 触发器条件满足时 |
| 执行方式 | 异步并行 | 同步执行 |
| 错误处理 | 隔离，不影响主流程 | 返回执行结果 |
| 注册机制 | 按hookName注册 | 按actionType注册 |
| 文件组织 | 按Hook类型拆分 | 按动作类型拆分 |

## 迁移指南

如果你之前直接从`hook-handler.ts`导入，现在需要从`index.ts`导入：

```typescript
// 旧方式
import { executeHook } from './handlers/hook-handlers/hook-handler';

// 新方式
import { executeHook } from './handlers/hook-handlers';
```

所有导出的API保持不变，确保向后兼容。
# Hook处理器模块（简化版）

## 概述

Hook处理器模块提供统一的Hook执行接口，支持在节点执行前后触发自定义逻辑。模块采用简化架构，所有Hook使用统一的处理器，复杂操作通过eventPayload传递。

## 架构设计

### 目录结构

```
hook-handlers/
├── index.ts                    # 统一导出
├── hook-handler.ts             # 主执行逻辑（统一处理器）
└── utils/                      # 工具函数
    ├── context-builder.ts      # 上下文构建
    ├── event-emitter.ts        # 事件发射
    ├── payload-generator.ts    # 载荷生成
    └── index.ts                # 工具函数导出
```

### 核心组件

#### 1. Hook执行上下文

```typescript
export interface HookExecutionContext {
  /** Thread实例 */
  thread: Thread;
  /** 节点定义 */
  node: Node;
  /** 节点执行结果（AFTER_EXECUTE时可用） */
  result?: NodeExecutionResult;
}
```

#### 2. 主执行函数

```typescript
executeHook(
  context: HookExecutionContext,
  hookType: HookType,
  emitEvent: (event: NodeCustomEvent) => Promise<void>
): Promise<void>
```

## Hook配置

### NodeHook接口

```typescript
export interface NodeHook {
  /** Hook类型 */
  hookType: HookType;
  /** 触发条件表达式（可选） */
  condition?: string;
  /** 要触发的自定义事件名称 */
  eventName: string;
  /** 事件载荷生成逻辑（可选） */
  eventPayload?: Record<string, any>;
  /** 是否启用（默认true） */
  enabled?: boolean;
  /** 权重（数字越大优先级越高） */
  weight?: number;
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

### 在节点配置中使用Hook

```typescript
const node: Node = {
  id: 'node-1',
  type: NodeType.LLM,
  name: 'LLM节点',
  config: { /* ... */ },
  hooks: [
    {
      hookType: HookType.AFTER_EXECUTE,
      eventName: 'node.completed',
      condition: 'output.status === "COMPLETED"',
      eventPayload: {
        message: '节点执行完成',
        timestamp: '{{executionTime}}'
      },
      weight: 10,
      enabled: true
    },
    {
      hookType: HookType.BEFORE_EXECUTE,
      eventName: 'validation.check',
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

### 通知Hook示例

```typescript
{
  hookType: HookType.AFTER_EXECUTE,
  eventName: 'notification.send',
  condition: 'status === "COMPLETED"',
  eventPayload: {
    notificationType: 'email',
    priority: 'high',
    recipients: ['user@example.com'],
    message: '节点执行完成，状态: {{status}}'
  },
  weight: 10,
  enabled: true
}
```

### 验证Hook示例

```typescript
{
  hookType: HookType.BEFORE_EXECUTE,
  eventName: 'validation.check',
  eventPayload: {
    validationRules: [
      {
        expression: 'variables.userId != null',
        message: '用户ID不能为空'
      },
      {
        expression: 'variables.amount > 0',
        message: '金额必须大于0'
      }
    ],
    blockOnFailure: true
  },
  weight: 20,
  enabled: true
}
```

### 自定义Hook示例

```typescript
{
  hookType: HookType.AFTER_EXECUTE,
  eventName: 'custom.analytics',
  eventPayload: {
    handler: async (context, hook, eventData) => {
      // 自定义逻辑：发送到分析系统
      await sendToAnalytics({
        nodeId: context.node.id,
        status: eventData.status,
        executionTime: eventData.executionTime
      });
    },
    metrics: {
      trackPerformance: true,
      trackErrors: true
    }
  },
  weight: 5,
  enabled: true
}
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
4. **条件评估**: 评估Hook的触发条件（如果有）
5. **载荷生成**: 生成事件载荷数据
6. **自定义处理**: 执行eventPayload中的handler函数（如果有）
7. **事件触发**: 触发自定义事件
8. **错误隔离**: Hook执行失败不影响节点正常执行

## eventPayload详解

### 1. 事件数据模板

eventPayload可以用作事件数据模板，支持模板变量替换：

```typescript
{
  hookType: HookType.AFTER_EXECUTE,
  eventName: 'node.completed',
  eventPayload: {
    message: '节点 {{node.id}} 执行完成',
    status: '{{status}}',
    executionTime: '{{executionTime}}ms',
    result: '{{output.result}}'
  }
}
```

### 2. 自定义处理函数

eventPayload可以包含自定义处理函数：

```typescript
{
  hookType: HookType.AFTER_EXECUTE,
  eventName: 'custom.process',
  eventPayload: {
    handler: async (context, hook, eventData) => {
      // 自定义逻辑
      console.log('Processing hook:', hook.eventName);
      console.log('Event data:', eventData);
    }
  }
}
```

### 3. 混合使用

可以同时使用模板和自定义处理函数：

```typescript
{
  hookType: HookType.AFTER_EXECUTE,
  eventName: 'custom.complex',
  eventPayload: {
    message: '状态: {{status}}',
    handler: async (context, hook, eventData) => {
      // 使用生成的事件数据
      await sendToExternalService(eventData);
    }
  }
}
```

## 注意事项

1. **异步执行**: Hook是异步执行的，不会阻塞节点执行
2. **错误隔离**: Hook执行失败不会影响节点正常执行，只会记录错误日志
3. **条件评估**: Hook支持条件表达式，只有条件满足时才会触发
4. **权重排序**: 支持通过weight参数控制Hook执行顺序
5. **事件载荷**: 支持自定义事件载荷，可以使用模板变量
6. **自定义处理**: 支持通过eventPayload.handler传入自定义处理函数

## 与Trigger处理器的对比

| 特性 | Hook处理器 | Trigger处理器 |
|------|-----------|---------------|
| 触发时机 | 节点执行前后 | 触发器条件满足时 |
| 执行方式 | 异步并行 | 同步执行 |
| 错误处理 | 隔离，不影响主流程 | 返回执行结果 |
| 文件组织 | 统一处理器 | 按动作类型拆分 |
| 灵活性 | 高（通过eventPayload） | 中（通过actionType） |

## 迁移指南

如果你之前使用了hookName属性，现在需要删除它：

```typescript
// 旧方式
{
  hookName: 'notification',
  hookType: HookType.AFTER_EXECUTE,
  eventName: 'notification.send',
  eventPayload: { /* ... */ }
}

// 新方式
{
  hookType: HookType.AFTER_EXECUTE,
  eventName: 'notification.send',
  eventPayload: { /* ... */ }
}
```

## 设计原则

1. **简化架构**: 删除不必要的Hook类型分类，统一使用一个处理器
2. **灵活性优先**: 通过eventPayload传递所有复杂配置
3. **向后兼容**: 保留所有核心功能，只是简化了实现
4. **易于扩展**: 用户可以通过eventPayload.handler实现任意自定义逻辑

## 单元测试

### 测试文件位置
`__tests__/hook-handler.test.ts`

### 测试覆盖范围
- **基本功能**: 16个测试用例
  - Hook执行和过滤
  - 权重排序
  - 禁用状态处理
  - 并行执行（Promise.allSettled）
  
- **条件评估**: 3个测试用例
  - 条件评估成功/失败
  - 异常处理

- **自定义handler**: 3个测试用例
  - Handler函数执行
  - 非函数类型处理
  - 异常捕获

- **错误处理**: 2个测试用例
  - Hook失败隔离
  - 模块导入失败

### 运行测试
```bash
cd sdk
npm test __tests__/hook-handler.test.ts
```

### 测试摘要
查看 `__tests__/TEST_SUMMARY.md` 了解详细的测试报告。
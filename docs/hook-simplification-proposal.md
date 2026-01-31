# Hook模块简化方案

## 问题分析

### 当前架构的问题

1. **过度设计**
   - 定义了三种Hook类型（CUSTOM、NOTIFICATION、VALIDATION）
   - 每种类型都有独立的处理器文件
   - 但核心功能都是：条件评估 → 生成事件数据 → 发送事件

2. **职责重复**
   - 三个处理器的逻辑高度相似
   - 唯一区别是eventPayload的内容不同
   - notification和validation处理器只是从eventPayload中提取特定字段

3. **维护成本高**
   - 新增Hook类型需要创建新的处理器文件
   - 需要更新注册机制
   - 需要维护多个相似的代码文件

4. **灵活性受限**
   - 预定义的Hook类型限制了扩展性
   - 用户无法自定义Hook行为
   - 复杂逻辑需要修改SDK代码

## 简化方案

### 核心思想

**Hook的核心功能就是根据条件评估结果发送事件，所有复杂操作都通过eventPayload传递。**

### 架构设计

#### 1. 简化NodeHook接口

删除`hookName`属性，保留核心功能：

```typescript
/**
 * 节点Hook配置（简化版）
 */
export interface NodeHook {
  /** Hook类型 */
  hookType: HookType;
  /** 触发条件表达式（可选） */
  condition?: string;
  /** 要触发的自定义事件名称 */
  eventName: string;
  /** 事件载荷（可选） */
  eventPayload?: Record<string, any>;
  /** 是否启用（默认true） */
  enabled?: boolean;
  /** 权重（数字越大优先级越高） */
  weight?: number;
}
```

#### 2. 删除HookName枚举

```typescript
// 删除以下内容
export enum HookName {
  CUSTOM = 'custom',
  NOTIFICATION = 'notification',
  VALIDATION = 'validation'
}
```

#### 3. 统一的Hook处理器

所有Hook使用同一个处理器，逻辑如下：

```typescript
/**
 * 统一的Hook处理器
 * @param context Hook执行上下文
 * @param hook Hook配置
 * @param emitEvent 事件发射函数
 */
async function unifiedHookHandler(
  context: HookExecutionContext,
  hook: NodeHook,
  emitEvent: (event: NodeCustomEvent) => Promise<void>
): Promise<void> {
  const { conditionEvaluator } = await import('../../../../utils/evalutor/condition-evaluator');
  const {
    buildHookEvaluationContext,
    convertToEvaluationContext,
    generateHookEventData,
    emitHookEvent
  } = await import('./utils');

  try {
    // 构建评估上下文
    const evalContext = buildHookEvaluationContext(context);

    // 评估触发条件（如果有）
    if (hook.condition) {
      let result: boolean;
      try {
        result = conditionEvaluator.evaluate(
          { expression: hook.condition },
          convertToEvaluationContext(evalContext)
        );
      } catch (error) {
        console.warn(
          `Hook condition evaluation failed for event "${hook.eventName}" on node "${context.node.id}":`,
          error
        );
        return;
      }

      if (!result) {
        return;
      }
    }

    // 生成事件载荷
    const eventData = generateHookEventData(hook, evalContext);

    // 如果eventPayload中有handler，执行自定义处理函数
    const customHandler = hook.eventPayload?.handler;
    if (customHandler && typeof customHandler === 'function') {
      try {
        await customHandler(context, hook, eventData);
      } catch (error) {
        console.error(
          `Custom handler execution failed for event "${hook.eventName}" on node "${context.node.id}":`,
          error
        );
      }
    }

    // 触发自定义事件
    await emitHookEvent(context, hook.eventName, eventData, emitEvent);

    console.log(
      `Hook triggered for event "${hook.eventName}" on node "${context.node.id}"`
    );
  } catch (error) {
    console.error(
      `Hook execution failed for event "${hook.eventName}" on node "${context.node.id}":`,
      error
    );
  }
}
```

#### 4. 更新hook-handler.ts

```typescript
/**
 * Hook处理器模块（简化版）
 * 提供通用的Hook执行函数
 * 执行时机由上层有状态模块（如ThreadExecutor）管理
 */

import type { Node, NodeHook } from '../../../../types/node';
import { HookType } from '../../../../types/node';
import type { Thread } from '../../../../types/thread';
import type { NodeExecutionResult } from '../../../../types/thread';
import type { NodeCustomEvent } from '../../../../types/events';

/**
 * Hook执行上下文接口
 */
export interface HookExecutionContext {
  /** Thread实例 */
  thread: Thread;
  /** 节点定义 */
  node: Node;
  /** 节点执行结果（AFTER_EXECUTE时可用） */
  result?: NodeExecutionResult;
}

/**
 * 执行指定类型的Hook
 * @param context Hook执行上下文
 * @param hookType Hook类型（BEFORE_EXECUTE 或 AFTER_EXECUTE）
 * @param emitEvent 事件发射函数
 */
export async function executeHook(
  context: HookExecutionContext,
  hookType: HookType,
  emitEvent: (event: NodeCustomEvent) => Promise<void>
): Promise<void> {
  const { node } = context;

  // 检查节点是否有Hook配置
  if (!node.hooks || node.hooks.length === 0) {
    return;
  }

  // 筛选指定类型的Hook，并按权重排序（权重高的先执行）
  const hooks = node.hooks
    .filter((hook: NodeHook) => hook.hookType === hookType && (hook.enabled !== false))
    .sort((a: NodeHook, b: NodeHook) => (b.weight || 0) - (a.weight || 0));

  // 异步执行所有Hook，不阻塞节点执行
  const promises = hooks.map((hook: NodeHook) => executeSingleHook(context, hook, emitEvent));
  await Promise.allSettled(promises);
}

/**
 * 执行单个Hook
 * @param context Hook执行上下文
 * @param hook Hook配置
 * @param emitEvent 事件发射函数
 */
async function executeSingleHook(
  context: HookExecutionContext,
  hook: NodeHook,
  emitEvent: (event: NodeCustomEvent) => Promise<void>
): Promise<void> {
  try {
    const { conditionEvaluator } = await import('../../../../utils/evalutor/condition-evaluator');
    const {
      buildHookEvaluationContext,
      convertToEvaluationContext,
      generateHookEventData,
      emitHookEvent
    } = await import('./utils');

    // 构建评估上下文
    const evalContext = buildHookEvaluationContext(context);

    // 评估触发条件（如果有）
    if (hook.condition) {
      let result: boolean;
      try {
        result = conditionEvaluator.evaluate(
          { expression: hook.condition },
          convertToEvaluationContext(evalContext)
        );
      } catch (error) {
        console.warn(
          `Hook condition evaluation failed for event "${hook.eventName}" on node "${context.node.id}":`,
          error
        );
        return;
      }

      if (!result) {
        return;
      }
    }

    // 生成事件载荷
    const eventData = generateHookEventData(hook, evalContext);

    // 如果eventPayload中有handler，执行自定义处理函数
    const customHandler = hook.eventPayload?.handler;
    if (customHandler && typeof customHandler === 'function') {
      try {
        await customHandler(context, hook, eventData);
      } catch (error) {
        console.error(
          `Custom handler execution failed for event "${hook.eventName}" on node "${context.node.id}":`,
          error
        );
      }
    }

    // 触发自定义事件
    await emitHookEvent(context, hook.eventName, eventData, emitEvent);

    console.log(
      `Hook triggered for event "${hook.eventName}" on node "${context.node.id}"`
    );
  } catch (error) {
    // Hook执行失败不应影响节点正常执行，记录错误日志
    console.error(
      `Hook execution failed for event "${hook.eventName}" on node "${context.node.id}":`,
      error
    );
  }
}

// 导出工具函数
export * from './utils';
```

## 使用示例

### 1. 通知Hook（原NOTIFICATION）

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

### 2. 验证Hook（原VALIDATION）

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

### 3. 自定义Hook（原CUSTOM）

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

### 4. 简单事件Hook

```typescript
{
  hookType: HookType.AFTER_EXECUTE,
  eventName: 'node.completed',
  eventPayload: {
    message: '节点 {{node.id}} 执行完成',
    timestamp: '{{executionTime}}'
  },
  weight: 0,
  enabled: true
}
```

## 迁移指南

### 删除的文件

```
sdk/core/execution/handlers/hook-handlers/
├── custom-hook-handler.ts      # 删除
├── notification-hook-handler.ts # 删除
├── validation-hook-handler.ts  # 删除
└── index.ts                    # 删除（或简化）
```

### 保留的文件

```
sdk/core/execution/handlers/hook-handlers/
├── hook-handler.ts             # 保留并简化
└── utils/                      # 保留
    ├── context-builder.ts
    ├── event-emitter.ts
    ├── payload-generator.ts
    └── index.ts
```

### 类型定义变更

#### 删除的内容

```typescript
// 删除HookName枚举
export enum HookName {
  CUSTOM = 'custom',
  NOTIFICATION = 'notification',
  VALIDATION = 'validation'
}
```

#### 简化的NodeHook接口

```typescript
// 之前
export interface NodeHook {
  hookName: HookName;           // 删除
  hookType: HookType;
  condition?: string;
  eventName: string;
  eventPayload?: Record<string, any>;
  enabled?: boolean;
  weight?: number;
}

// 之后
export interface NodeHook {
  hookType: HookType;
  condition?: string;
  eventName: string;
  eventPayload?: Record<string, any>;
  enabled?: boolean;
  weight?: number;
}
```

### 配置迁移

#### 之前（使用hookName）

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

#### 之后（删除hookName）

```typescript
{
  hookType: HookType.AFTER_EXECUTE,
  eventName: 'notification.send',
  eventPayload: {
    notificationType: 'email',
    priority: 'high'
  }
}
```

## 优势分析

### 1. 简化架构

- ✅ 删除3个处理器文件
- ✅ 删除HookName枚举
- ✅ 删除注册机制
- ✅ 统一为一个处理器

### 2. 提高灵活性

- ✅ 用户可以定义任意类型的Hook
- ✅ 通过eventPayload传递任意配置
- ✅ 通过handler函数实现自定义逻辑
- ✅ 不受预定义Hook类型限制

### 3. 降低维护成本

- ✅ 减少代码量约60%
- ✅ 减少文件数量约50%
- ✅ 统一的错误处理逻辑
- ✅ 更容易理解和维护

### 4. 保持功能完整

- ✅ 条件评估功能保留
- ✅ 事件数据生成功能保留
- ✅ 自定义处理函数支持保留
- ✅ 事件触发功能保留

### 5. 向后兼容

- ✅ 可以通过迁移工具自动转换
- ✅ eventPayload结构不变
- ✅ 事件名称不变
- ✅ 条件表达式不变

## 实施步骤

### 阶段1：准备阶段

1. 创建迁移工具，自动删除hookName属性
2. 更新文档，说明新的配置方式
3. 编写单元测试，验证简化后的功能

### 阶段2：实施阶段

1. 更新类型定义（删除HookName，简化NodeHook）
2. 简化hook-handler.ts（删除getHookHandler调用）
3. 删除custom-hook-handler.ts
4. 删除notification-hook-handler.ts
5. 删除validation-hook-handler.ts
6. 简化index.ts（删除注册机制）

### 阶段3：测试阶段

1. 运行所有单元测试
2. 运行集成测试
3. 验证现有配置的兼容性
4. 性能测试

### 阶段4：文档更新

1. 更新README.md
2. 更新API文档
3. 更新示例代码
4. 添加迁移指南

## 风险评估

### 低风险

- ✅ 核心功能不变
- ✅ eventPayload结构不变
- ✅ 事件触发机制不变
- ✅ 条件评估逻辑不变

### 中风险

- ⚠️ 需要迁移现有配置
- ⚠️ 需要更新文档和示例
- ⚠️ 需要测试所有使用场景

### 缓解措施

- 提供自动迁移工具
- 保留向后兼容的适配器
- 完善的测试覆盖
- 详细的迁移文档

## 总结

### 核心改进

1. **删除HookName枚举**：不再区分Hook类型
2. **删除独立处理器**：统一为一个处理器
3. **简化NodeHook接口**：删除hookName属性
4. **增强灵活性**：通过eventPayload和handler实现所有功能

### 预期效果

- 代码量减少约60%
- 文件数量减少约50%
- 维护成本降低
- 灵活性提高
- 功能完整性保持

### 推荐实施

**强烈推荐实施此简化方案**，理由如下：

1. 符合YAGNI原则（You Aren't Gonna Need It）
2. 符合KISS原则（Keep It Simple, Stupid）
3. 提高代码可维护性
4. 降低学习成本
5. 增强系统灵活性

### 迁移路径

1. **v1.x**：保持当前架构，标记为废弃
2. **v2.x**：实施简化方案，提供迁移工具
3. **v3.x**：完全移除旧代码

这个简化方案将使Hook模块更加简洁、灵活和易于维护，同时保持所有核心功能。
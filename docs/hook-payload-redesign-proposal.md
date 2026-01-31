# Hook Payload 接口改进方案

## 问题分析

### 当前问题

1. **类型安全缺失**
   - `eventPayload` 类型为 `Record<string, any>`，缺乏类型约束
   - 使用 `(hook.eventPayload as any)?.xxx` 访问，不够优雅且不安全

2. **职责混淆**
   - `eventPayload` 既用于Hook配置（如 `notificationType`、`validationRules`）
   - 又用于事件数据模板（如 `{{status}}`）
   - 两种用途混在一起，语义不清晰

3. **扩展性不足**
   - 新增Hook类型时，无法提供类型提示
   - 配置参数和事件数据模板无法区分

## 各类Hook的Payload需求

### 1. CUSTOM Hook
```typescript
// 当前用法
{
  hookName: 'custom',
  eventPayload: {
    handler: async (context, hook) => { /* 自定义逻辑 */ }
  }
}

// 或者
{
  hookName: 'custom',
  eventPayload: {
    message: 'Custom message',
    value: 42
  }
}
```

**需求**：
- 支持自定义处理函数
- 支持自定义事件数据模板

### 2. NOTIFICATION Hook
```typescript
// 当前用法
{
  hookName: 'notification',
  eventPayload: {
    notificationType: 'email',
    priority: 'high'
  }
}
```

**需求**：
- 通知类型配置（email、sms、webhook等）
- 优先级配置（normal、high、urgent）
- 可选的自定义事件数据模板

### 3. VALIDATION Hook
```typescript
// 当前用法
{
  hookName: 'validation',
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

**需求**：
- 验证规则数组
- 每个规则包含表达式和错误消息
- 可选的自定义事件数据模板

## 改进方案

### 方案一：分离配置和模板（推荐）

将 `eventPayload` 拆分为两个独立属性：

```typescript
export interface NodeHook {
  hookName: HookName;
  hookType: HookType;
  condition?: string;
  eventName: string;

  // Hook配置（处理器专用）
  hookConfig?: HookConfig;

  // 事件数据模板（用于生成事件数据）
  eventDataTemplate?: Record<string, any>;

  enabled?: boolean;
  weight?: number;
}
```

#### Hook配置类型定义

```typescript
/**
 * Hook配置联合类型
 */
export type HookConfig =
  | CustomHookConfig
  | NotificationHookConfig
  | ValidationHookConfig;

/**
 * 自定义Hook配置
 */
export interface CustomHookConfig {
  /** 自定义处理函数 */
  handler?: (context: HookExecutionContext, hook: NodeHook) => Promise<void>;
}

/**
 * 通知Hook配置
 */
export interface NotificationHookConfig {
  /** 通知类型 */
  notificationType: 'email' | 'sms' | 'webhook' | 'push';
  /** 优先级 */
  priority: 'normal' | 'high' | 'urgent';
  /** 收件人（可选） */
  recipients?: string[];
  /** 通知渠道配置（可选） */
  channelConfig?: Record<string, any>;
}

/**
 * 验证Hook配置
 */
export interface ValidationHookConfig {
  /** 验证规则数组 */
  validationRules: Array<{
    /** 验证表达式 */
    expression: string;
    /** 错误消息 */
    message: string;
    /** 严重级别（可选） */
    severity?: 'error' | 'warning' | 'info';
  }>;
  /** 验证失败时是否阻止执行（可选，默认false） */
  blockOnFailure?: boolean;
}
```

#### 使用示例

```typescript
// 自定义Hook
{
  hookName: 'custom',
  hookType: HookType.AFTER_EXECUTE,
  eventName: 'custom.event',
  hookConfig: {
    handler: async (context, hook) => {
      console.log('Custom logic');
    }
  },
  eventDataTemplate: {
    message: 'Status: {{status}}',
    timestamp: '{{executionTime}}'
  }
}

// 通知Hook
{
  hookName: 'notification',
  hookType: HookType.AFTER_EXECUTE,
  eventName: 'notification.send',
  hookConfig: {
    notificationType: 'email',
    priority: 'high',
    recipients: ['user@example.com']
  },
  eventDataTemplate: {
    subject: '节点执行完成',
    body: '节点 {{node.id}} 执行状态: {{status}}'
  }
}

// 验证Hook
{
  hookName: 'validation',
  hookType: HookType.BEFORE_EXECUTE,
  eventName: 'validation.check',
  hookConfig: {
    validationRules: [
      {
        expression: 'variables.userId != null',
        message: '用户ID不能为空',
        severity: 'error'
      }
    ],
    blockOnFailure: true
  },
  eventDataTemplate: {
    validationContext: '{{variables}}'
  }
}
```

#### 优势

1. **职责清晰**：配置和模板分离，语义明确
2. **类型安全**：每种Hook有明确的配置类型
3. **向后兼容**：可以通过适配器支持旧的 `eventPayload` 格式
4. **易于扩展**：新增Hook类型只需添加新的配置接口

#### 劣势

1. **破坏性变更**：需要修改现有配置
2. **迁移成本**：需要提供迁移工具或兼容层

### 方案二：保留eventPayload，增强类型（折中方案）

保留 `eventPayload`，但使用联合类型增强类型安全：

```typescript
export interface NodeHook {
  hookName: HookName;
  hookType: HookType;
  condition?: string;
  eventName: string;

  // 根据hookName类型化的eventPayload
  eventPayload?: HookEventPayloadMap[HookName];

  enabled?: boolean;
  weight?: number;
}

/**
 * Hook事件载荷映射
 */
export type HookEventPayloadMap = {
  [HookName.CUSTOM]: CustomEventPayload;
  [HookName.NOTIFICATION]: NotificationEventPayload;
  [HookName.VALIDATION]: ValidationEventPayload;
};

/**
 * 自定义Hook事件载荷
 */
export interface CustomEventPayload {
  /** 自定义处理函数 */
  handler?: (context: HookExecutionContext, hook: NodeHook) => Promise<void>;
  /** 其他自定义数据 */
  [key: string]: any;
}

/**
 * 通知Hook事件载荷
 */
export interface NotificationEventPayload {
  /** 通知类型 */
  notificationType?: 'email' | 'sms' | 'webhook' | 'push';
  /** 优先级 */
  priority?: 'normal' | 'high' | 'urgent';
  /** 收件人（可选） */
  recipients?: string[];
  /** 其他自定义数据 */
  [key: string]: any;
}

/**
 * 验证Hook事件载荷
 */
export interface ValidationEventPayload {
  /** 验证规则数组 */
  validationRules?: Array<{
    expression: string;
    message: string;
    severity?: 'error' | 'warning' | 'info';
  }>;
  /** 验证失败时是否阻止执行 */
  blockOnFailure?: boolean;
  /** 其他自定义数据 */
  [key: string]: any;
}
```

#### 使用示例

```typescript
// 自定义Hook
{
  hookName: 'custom',
  hookType: HookType.AFTER_EXECUTE,
  eventName: 'custom.event',
  eventPayload: {
    handler: async (context, hook) => { /* ... */ },
    message: 'Status: {{status}}'
  }
}

// 通知Hook
{
  hookName: 'notification',
  hookType: HookType.AFTER_EXECUTE,
  eventName: 'notification.send',
  eventPayload: {
    notificationType: 'email',
    priority: 'high',
    subject: '节点执行完成'
  }
}

// 验证Hook
{
  hookName: 'validation',
  hookType: HookType.BEFORE_EXECUTE,
  eventName: 'validation.check',
  eventPayload: {
    validationRules: [
      {
        expression: 'variables.userId != null',
        message: '用户ID不能为空'
      }
    ]
  }
}
```

#### 优势

1. **向后兼容**：保留 `eventPayload` 属性名
2. **类型安全**：根据 `hookName` 提供类型提示
3. **渐进式迁移**：可以逐步迁移现有代码

#### 劣势

1. **职责仍混淆**：配置和模板仍在同一个对象中
2. **类型推断复杂**：需要依赖 `hookName` 进行类型推断

### 方案三：完全类型化的配置（激进方案）

为每种Hook类型定义独立的配置接口：

```typescript
/**
 * 自定义Hook配置
 */
export interface CustomHook {
  hookName: HookName.CUSTOM;
  hookType: HookType;
  condition?: string;
  eventName: string;
  /** 自定义处理函数 */
  handler?: (context: HookExecutionContext, hook: CustomHook) => Promise<void>;
  /** 事件数据模板 */
  eventDataTemplate?: Record<string, any>;
  enabled?: boolean;
  weight?: number;
}

/**
 * 通知Hook配置
 */
export interface NotificationHook {
  hookName: HookName.NOTIFICATION;
  hookType: HookType;
  condition?: string;
  eventName: string;
  /** 通知类型 */
  notificationType: 'email' | 'sms' | 'webhook' | 'push';
  /** 优先级 */
  priority: 'normal' | 'high' | 'urgent';
  /** 收件人（可选） */
  recipients?: string[];
  /** 事件数据模板 */
  eventDataTemplate?: Record<string, any>;
  enabled?: boolean;
  weight?: number;
}

/**
 * 验证Hook配置
 */
export interface ValidationHook {
  hookName: HookName.VALIDATION;
  hookType: HookType;
  condition?: string;
  eventName: string;
  /** 验证规则数组 */
  validationRules: Array<{
    expression: string;
    message: string;
    severity?: 'error' | 'warning' | 'info';
  }>;
  /** 验证失败时是否阻止执行 */
  blockOnFailure?: boolean;
  /** 事件数据模板 */
  eventDataTemplate?: Record<string, any>;
  enabled?: boolean;
  weight?: number;
}

/**
 * Hook联合类型
 */
export type NodeHook = CustomHook | NotificationHook | ValidationHook;
```

#### 优势

1. **完全类型安全**：每种Hook有独立的配置接口
2. **编译时检查**：TypeScript可以在编译时检查配置的正确性
3. **IDE支持**：提供完整的类型提示和自动补全

#### 劣势

1. **破坏性变更**：完全改变配置结构
2. **迁移成本高**：需要重写所有现有配置
3. **灵活性降低**：难以支持动态扩展

## 推荐方案

### 采用方案一：分离配置和模板

**理由**：

1. **职责清晰**：配置和模板分离，符合单一职责原则
2. **易于理解**：开发者可以清楚地区分配置参数和事件数据
3. **向后兼容**：可以通过适配器支持旧的 `eventPayload` 格式
4. **扩展性好**：新增Hook类型只需添加新的配置接口

### 迁移策略

#### 阶段1：添加新属性（向后兼容）

```typescript
export interface NodeHook {
  hookName: HookName;
  hookType: HookType;
  condition?: string;
  eventName: string;

  // 旧属性（保留以兼容）
  eventPayload?: Record<string, any>;

  // 新属性
  hookConfig?: HookConfig;
  eventDataTemplate?: Record<string, any>;

  enabled?: boolean;
  weight?: number;
}
```

#### 阶段2：提供适配器

```typescript
/**
 * 适配器：将旧的eventPayload转换为新的hookConfig和eventDataTemplate
 */
function adaptHookPayload(hook: NodeHook): {
  hookConfig?: HookConfig;
  eventDataTemplate?: Record<string, any>;
} {
  // 如果已经使用新格式，直接返回
  if (hook.hookConfig || hook.eventDataTemplate) {
    return {
      hookConfig: hook.hookConfig,
      eventDataTemplate: hook.eventDataTemplate
    };
  }

  // 如果使用旧格式，进行转换
  if (!hook.eventPayload) {
    return {};
  }

  switch (hook.hookName) {
    case HookName.CUSTOM:
      return {
        hookConfig: {
          handler: (hook.eventPayload as any)?.handler
        },
        eventDataTemplate: omit(hook.eventPayload, ['handler'])
      };

    case HookName.NOTIFICATION:
      return {
        hookConfig: {
          notificationType: (hook.eventPayload as any)?.notificationType || 'email',
          priority: (hook.eventPayload as any)?.priority || 'normal',
          recipients: (hook.eventPayload as any)?.recipients
        },
        eventDataTemplate: omit(hook.eventPayload, [
          'notificationType',
          'priority',
          'recipients'
        ])
      };

    case HookName.VALIDATION:
      return {
        hookConfig: {
          validationRules: (hook.eventPayload as any)?.validationRules || [],
          blockOnFailure: (hook.eventPayload as any)?.blockOnFailure
        },
        eventDataTemplate: omit(hook.eventPayload, [
          'validationRules',
          'blockOnFailure'
        ])
      };

    default:
      return {
        eventDataTemplate: hook.eventPayload
      };
  }
}
```

#### 阶段3：更新处理器

```typescript
// notification-hook-handler.ts
async function notificationHookHandler(
  context: HookExecutionContext,
  hook: NodeHook,
  emitEvent: (event: NodeCustomEvent) => Promise<void>
): Promise<void> {
  // 使用适配器获取配置
  const { hookConfig, eventDataTemplate } = adaptHookPayload(hook);

  const config = hookConfig as NotificationHookConfig;

  // 生成事件载荷
  const eventData = generateHookEventData(
    eventDataTemplate || {},
    evalContext
  );

  // 添加通知特定的元数据
  eventData['notificationType'] = config.notificationType;
  eventData['priority'] = config.priority;

  // 触发事件
  await emitHookEvent(context, hook.eventName, eventData, emitEvent);
}
```

#### 阶段4：废弃旧属性

在文档中标记 `eventPayload` 为废弃属性，引导用户使用新的 `hookConfig` 和 `eventDataTemplate`。

#### 阶段5：移除旧属性（可选）

在下一个主版本中，移除 `eventPayload` 属性。

## 实现建议

### 1. 类型定义

在 `sdk/types/node.ts` 中添加新的类型定义：

```typescript
/**
 * Hook配置联合类型
 */
export type HookConfig =
  | CustomHookConfig
  | NotificationHookConfig
  | ValidationHookConfig;

/**
 * 自定义Hook配置
 */
export interface CustomHookConfig {
  /** 自定义处理函数 */
  handler?: (context: HookExecutionContext, hook: NodeHook) => Promise<void>;
}

/**
 * 通知Hook配置
 */
export interface NotificationHookConfig {
  /** 通知类型 */
  notificationType: 'email' | 'sms' | 'webhook' | 'push';
  /** 优先级 */
  priority: 'normal' | 'high' | 'urgent';
  /** 收件人（可选） */
  recipients?: string[];
  /** 通知渠道配置（可选） */
  channelConfig?: Record<string, any>;
}

/**
 * 验证Hook配置
 */
export interface ValidationHookConfig {
  /** 验证规则数组 */
  validationRules: Array<{
    /** 验证表达式 */
    expression: string;
    /** 错误消息 */
    message: string;
    /** 严重级别（可选） */
    severity?: 'error' | 'warning' | 'info';
  }>;
  /** 验证失败时是否阻止执行（可选，默认false） */
  blockOnFailure?: boolean;
}
```

### 2. 更新NodeHook接口

```typescript
export interface NodeHook {
  /** Hook名称，用于标识和调试 */
  hookName: HookName;
  /** Hook类型 */
  hookType: HookType;
  /** 触发条件表达式（可选） */
  condition?: string;
  /** 要触发的自定义事件名称 */
  eventName: string;

  // 旧属性（保留以兼容，标记为废弃）
  /** @deprecated 使用 hookConfig 和 eventDataTemplate 替代 */
  eventPayload?: Record<string, any>;

  // 新属性
  /** Hook配置（处理器专用） */
  hookConfig?: HookConfig;
  /** 事件数据模板（用于生成事件数据） */
  eventDataTemplate?: Record<string, any>;

  /** 是否启用（默认true） */
  enabled?: boolean;
  /** 权重（数字越大优先级越高） */
  weight?: number;
}
```

### 3. 创建适配器工具

在 `sdk/core/execution/handlers/hook-handlers/utils/` 中创建 `payload-adapter.ts`：

```typescript
/**
 * Hook载荷适配器
 * 负责将旧的eventPayload格式转换为新的hookConfig和eventDataTemplate格式
 */

import type { NodeHook, HookConfig } from '../../../../../types/node';
import { HookName } from '../../../../../types/node';

/**
 * 适配Hook载荷
 * @param hook Hook配置
 * @returns 适配后的配置和模板
 */
export function adaptHookPayload(hook: NodeHook): {
  hookConfig?: HookConfig;
  eventDataTemplate?: Record<string, any>;
} {
  // 如果已经使用新格式，直接返回
  if (hook.hookConfig || hook.eventDataTemplate) {
    return {
      hookConfig: hook.hookConfig,
      eventDataTemplate: hook.eventDataTemplate
    };
  }

  // 如果使用旧格式，进行转换
  if (!hook.eventPayload) {
    return {};
  }

  switch (hook.hookName) {
    case HookName.CUSTOM:
      return adaptCustomHookPayload(hook.eventPayload);

    case HookName.NOTIFICATION:
      return adaptNotificationHookPayload(hook.eventPayload);

    case HookName.VALIDATION:
      return adaptValidationHookPayload(hook.eventPayload);

    default:
      return {
        eventDataTemplate: hook.eventPayload
      };
  }
}

/**
 * 适配自定义Hook载荷
 */
function adaptCustomHookPayload(
  payload: Record<string, any>
): { hookConfig?: HookConfig; eventDataTemplate?: Record<string, any> } {
  const handler = payload.handler;
  const template = omit(payload, ['handler']);

  return {
    hookConfig: handler ? { handler } : undefined,
    eventDataTemplate: Object.keys(template).length > 0 ? template : undefined
  };
}

/**
 * 适配通知Hook载荷
 */
function adaptNotificationHookPayload(
  payload: Record<string, any>
): { hookConfig?: HookConfig; eventDataTemplate?: Record<string, any> } {
  const configKeys = ['notificationType', 'priority', 'recipients', 'channelConfig'];
  const config = pick(payload, configKeys);
  const template = omit(payload, configKeys);

  return {
    hookConfig: Object.keys(config).length > 0 ? config : undefined,
    eventDataTemplate: Object.keys(template).length > 0 ? template : undefined
  };
}

/**
 * 适配验证Hook载荷
 */
function adaptValidationHookPayload(
  payload: Record<string, any>
): { hookConfig?: HookConfig; eventDataTemplate?: Record<string, any> } {
  const configKeys = ['validationRules', 'blockOnFailure'];
  const config = pick(payload, configKeys);
  const template = omit(payload, configKeys);

  return {
    hookConfig: Object.keys(config).length > 0 ? config : undefined,
    eventDataTemplate: Object.keys(template).length > 0 ? template : undefined
  };
}

/**
 * 从对象中移除指定键
 */
function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}

/**
 * 从对象中提取指定键
 */
function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}
```

### 4. 更新payload-generator

```typescript
/**
 * 生成事件载荷
 * @param hook Hook配置
 * @param evalContext 评估上下文
 * @returns 事件载荷
 */
export function generateHookEventData(
  hook: NodeHook,
  evalContext: HookEvaluationContext
): Record<string, any> {
  // 使用适配器获取配置和模板
  const { eventDataTemplate } = adaptHookPayload(hook);

  // 如果配置了事件数据模板，使用它
  if (eventDataTemplate) {
    return resolvePayloadTemplate(eventDataTemplate, evalContext);
  }

  // 否则，使用默认的事件数据
  return {
    output: evalContext.output,
    status: evalContext.status,
    executionTime: evalContext.executionTime,
    error: evalContext.error,
    variables: evalContext.variables,
    config: evalContext.config,
    metadata: evalContext.metadata
  };
}
```

### 5. 更新Hook处理器

更新各个Hook处理器以使用适配器：

```typescript
// notification-hook-handler.ts
async function notificationHookHandler(
  context: HookExecutionContext,
  hook: NodeHook,
  emitEvent: (event: NodeCustomEvent) => Promise<void>
): Promise<void> {
  const { conditionEvaluator } = await import('../../../../utils/evalutor/condition-evaluator');
  const {
    buildHookEvaluationContext,
    convertToEvaluationContext,
    generateHookEventData,
    emitHookEvent,
    adaptHookPayload
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
          `Notification hook condition evaluation failed for hook "${hook.hookName}" on node "${context.node.id}":`,
          error
        );
        return;
      }

      if (!result) {
        return;
      }
    }

    // 使用适配器获取配置
    const { hookConfig } = adaptHookPayload(hook);
    const config = hookConfig as NotificationHookConfig;

    // 生成事件载荷
    const eventData = generateHookEventData(hook, evalContext);

    // 添加通知特定的元数据
    eventData['notificationType'] = config?.notificationType || 'email';
    eventData['priority'] = config?.priority || 'normal';

    // 触发自定义事件
    await emitHookEvent(context, hook.eventName, eventData, emitEvent);

    console.log(
      `Notification hook "${hook.hookName}" triggered for node "${context.node.id}"`
    );
  } catch (error) {
    console.error(
      `Notification hook execution failed for hook "${hook.hookName}" on node "${context.node.id}":`,
      error
    );
  }
}
```

## 总结

### 推荐方案

采用**方案一：分离配置和模板**，通过以下步骤实现：

1. **添加新属性**：在 `NodeHook` 接口中添加 `hookConfig` 和 `eventDataTemplate`
2. **保留旧属性**：保留 `eventPayload` 以向后兼容，标记为废弃
3. **提供适配器**：创建 `payload-adapter.ts` 工具，自动转换旧格式
4. **更新处理器**：更新所有Hook处理器以使用适配器
5. **更新文档**：在文档中说明新的配置方式，引导用户迁移

### 优势

- ✅ 职责清晰：配置和模板分离
- ✅ 类型安全：每种Hook有明确的配置类型
- ✅ 向后兼容：支持旧的 `eventPayload` 格式
- ✅ 易于扩展：新增Hook类型只需添加新的配置接口
- ✅ 渐进式迁移：可以逐步迁移现有配置

### 迁移路径

1. **v1.x**：添加新属性，提供适配器，保持向后兼容
2. **v2.x**：在文档中标记 `eventPayload` 为废弃
3. **v3.x**：移除 `eventPayload` 属性（可选）

### 预期效果

- 提高代码的可维护性和可读性
- 提供更好的类型安全和IDE支持
- 降低新用户的上手难度
- 为未来的扩展提供更好的基础
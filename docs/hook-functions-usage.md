# Hook函数使用指南

## 概述

Hook函数模块提供纯执行逻辑的函数实现，不定义具体的hook点。这些函数可以被Hook实体复用，实现可组合的执行逻辑。

## 架构设计

### 核心原则

1. **不关心hook点**：Hook函数不知道自己在哪个hook点执行
2. **纯执行逻辑**：只关注执行逻辑本身
3. **可复用性**：可以被多个Hook实体复用
4. **可组合性**：多个函数可以组合使用
5. **统一注册**：通过统一的FunctionRegistry进行注册和管理

### 组件结构

```
src/infrastructure/workflow/functions/
├── hooks/
│   ├── base-hook-function.ts          # Hook函数基类
│   ├── logging-hook-function.ts       # 日志记录函数
│   ├── validation-hook-function.ts    # 数据验证函数
│   ├── transformation-hook-function.ts # 数据转换函数
│   └── index.ts                       # 导出
└── registry/
    └── function-registry.ts           # 统一函数注册表
```

## 基类：BaseHookFunction

### 接口定义

```typescript
export abstract class BaseHookFunction {
  readonly id: string;                    // 函数唯一标识符
  readonly name: string;                  // 函数名称
  readonly description: string;           // 函数描述
  readonly version: string;               // 函数版本

  // 执行函数逻辑
  abstract execute(context: any, config?: Record<string, any>): Promise<HookFunctionResult>;

  // 验证配置参数（可选）
  validateConfig?(config: Record<string, any>): { valid: boolean; errors: string[] };

  // 获取函数元数据
  getMetadata(): HookFunctionMetadata;
}
```

### 执行结果接口

```typescript
export interface HookFunctionResult {
  success: boolean;           // 是否成功
  data?: any;                 // 返回数据
  error?: Error | string;     // 错误信息
  executionTime?: number;     // 执行时间（毫秒）
  shouldContinue?: boolean;   // 是否继续执行
}
```

## 内置Hook函数

### 1. LoggingHookFunction - 日志记录

记录Hook执行的日志信息。

#### 配置参数

```typescript
{
  level: 'info' | 'warn' | 'error' | 'debug';  // 日志级别
  message: string;                               // 日志消息
  includeContext: boolean;                       // 是否包含上下文信息
}
```

#### 使用示例

```typescript
import { LoggingHookFunction } from './infrastructure/workflow/functions/hooks';
import { FunctionRegistry } from './infrastructure/workflow/functions/registry/function-registry';

// 创建日志函数实例
const loggingFunction = new LoggingHookFunction();

// 创建注册表实例并注册
const registry = new FunctionRegistry();
registry.registerFunction(loggingFunction);

// 执行日志函数
const context = {
  hookId: 'hook-001',
  workflowId: 'workflow-001',
  nodeId: 'node-001',
  executionId: 'exec-001',
};

const config = {
  level: 'info',
  message: 'Hook执行开始',
  includeContext: true,
};

const result = await loggingFunction.execute(context, config);
console.log(result);
```

### 2. ValidationHookFunction - 数据验证

验证输入数据的完整性和有效性。

#### 配置参数

```typescript
{
  rules: Array<{
    field: string;           // 字段名
    type?: string;           // 类型：string, number, boolean, array, object
    required?: boolean;      // 是否必填
    min?: number;            // 最小值/最小长度
    max?: number;            // 最大值/最大长度
    pattern?: string;        // 正则表达式
    custom?: Function;       // 自定义验证函数
  }>;
  stopOnFailure?: boolean;   // 验证失败时是否停止
}
```

#### 使用示例

```typescript
import { ValidationHookFunction } from './infrastructure/workflow/functions/hooks';

const validationFunction = new ValidationHookFunction();

const context = {
  data: {
    username: 'john_doe',
    email: 'john@example.com',
    age: 25,
  },
};

const config = {
  rules: [
    {
      field: 'username',
      type: 'string',
      required: true,
      min: 3,
      max: 20,
    },
    {
      field: 'email',
      type: 'string',
      required: true,
      pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
    },
    {
      field: 'age',
      type: 'number',
      required: true,
      min: 18,
      max: 120,
    },
  ],
  stopOnFailure: true,
};

const result = await validationFunction.execute(context, config);

if (!result.success) {
  console.error('验证失败:', result.error);
} else {
  console.log('验证成功');
}
```

### 3. TransformationHookFunction - 数据转换

转换和修改数据格式。

#### 配置参数

```typescript
{
  transformations: Array<{
    type: 'set' | 'copy' | 'rename' | 'delete' | 'map' | 'transform' | 'uppercase' | 'lowercase' | 'trim' | 'parse' | 'stringify';
    field?: string;           // 目标字段
    value?: any;              // 设置的值
    sourceField?: string;     // 源字段
    mapping?: Record<string, string>;  // 字段映射
    function?: Function;      // 自定义转换函数
  }>;
}
```

#### 使用示例

```typescript
import { TransformationHookFunction } from './infrastructure/workflow/functions/hooks';

const transformationFunction = new TransformationHookFunction();

const context = {
  data: {
    firstName: 'john',
    lastName: 'doe',
    email: 'JOHN.DOE@EXAMPLE.COM',
    metadata: '{"key":"value"}',
  },
};

const config = {
  transformations: [
    // 转换为大写
    { type: 'uppercase', field: 'firstName' },
    // 转换为小写
    { type: 'lowercase', field: 'email' },
    // 复制字段
    { type: 'copy', sourceField: 'firstName', field: 'givenName' },
    // 解析JSON字符串
    { type: 'parse', field: 'metadata' },
    // 重命名字段
    { type: 'rename', sourceField: 'lastName', field: 'surname' },
  ],
};

const result = await transformationFunction.execute(context, config);

console.log('转换后的数据:', context.data);
// 输出: {
//   firstName: 'JOHN',
//   surname: 'doe',
//   email: 'john.doe@example.com',
//   metadata: { key: 'value' },
//   givenName: 'JOHN'
// }
```

## Hook函数注册表

Hook函数通过统一的FunctionRegistry进行注册和管理，支持CONDITION、ROUTING、TRIGGER、HOOK等多种函数类型。

### 使用注册表

```typescript
import { FunctionRegistry } from './infrastructure/workflow/functions/registry/function-registry';
import { LoggingHookFunction, ValidationHookFunction, TransformationHookFunction } from './infrastructure/workflow/functions/hooks';

// 创建注册表实例
const registry = new FunctionRegistry();

// 注册Hook函数
registry.registerFunction(new LoggingHookFunction());
registry.registerFunction(new ValidationHookFunction());
registry.registerFunction(new TransformationHookFunction());

// 获取Hook函数（通过ID）
const loggingFunction = registry.getFunction('logging-hook-function');
if (loggingFunction) {
  await loggingFunction.execute(context, config);
}

// 获取Hook函数（通过名称）
const validationFunction = registry.getFunctionByName('数据验证函数');
if (validationFunction) {
  await validationFunction.execute(context, config);
}

// 获取Hook函数（便捷方法）
const hookFunction = registry.getHookFunction('日志记录函数');
if (hookFunction) {
  await hookFunction.execute(context, config);
}

// 检查函数是否存在
if (registry.hasFunction('logging-hook-function')) {
  console.log('日志函数已注册');
}

// 获取所有函数
const allFunctions = registry.getAllFunctions();
console.log('已注册的函数:', allFunctions.map(f => f.name));

// 注销函数
registry.unregisterFunction('logging-hook-function');
```

## 在Hook实体中使用Hook函数

### 方式1：直接使用

```typescript
import { BeforeExecuteHook } from './infrastructure/workflow/hooks';
import { LoggingHookFunction, ValidationHookFunction } from './infrastructure/workflow/functions/hooks';

// 创建Hook实体
const hook = BeforeExecuteHook.create('验证和日志');

// 创建Hook函数实例
const loggingFunction = new LoggingHookFunction();
const validationFunction = new ValidationHookFunction();

// 在Hook的execute方法中使用
const originalExecute = hook.execute.bind(hook);
hook.execute = async (context) => {
  // 执行验证
  const validationResult = await validationFunction.execute(context, {
    rules: [
      { field: 'input', type: 'string', required: true },
    ],
  });

  if (!validationResult.success) {
    return {
      hookId: hook.id.value,
      success: false,
      error: validationResult.error,
      executionTime: validationResult.executionTime || 0,
      shouldContinue: false,
    };
  }

  // 执行日志
  await loggingFunction.execute(context, {
    level: 'info',
    message: 'Hook执行开始',
  });

  // 执行原始逻辑
  return originalExecute(context);
};
```

### 方式2：通过注册表使用

```typescript
import { BeforeExecuteHook } from './infrastructure/workflow/hooks';
import { FunctionRegistry } from './infrastructure/workflow/functions/registry/function-registry';
import { LoggingHookFunction, ValidationHookFunction } from './infrastructure/workflow/functions/hooks';

// 创建注册表实例
const registry = new FunctionRegistry();
registry.registerFunction(new LoggingHookFunction());
registry.registerFunction(new ValidationHookFunction());

// 创建Hook实体
const hook = BeforeExecuteHook.create('验证和日志');

// 在Hook的execute方法中使用
hook.execute = async (context) => {
  // 从注册表获取函数
  const validationFunction = registry.getFunction('validation-hook-function');
  const loggingFunction = registry.getFunction('logging-hook-function');

  if (!validationFunction || !loggingFunction) {
    throw new Error('Hook函数未注册');
  }

  // 执行验证
  const validationResult = await validationFunction.execute(context, {
    rules: [
      { field: 'input', type: 'string', required: true },
    ],
  });

  if (!validationResult.success) {
    return {
      hookId: hook.id.value,
      success: false,
      error: validationResult.error,
      executionTime: validationResult.executionTime || 0,
      shouldContinue: false,
    };
  }

  // 执行日志
  await loggingFunction.execute(context, {
    level: 'info',
    message: 'Hook执行开始',
  });

  // 返回成功结果
  return {
    hookId: hook.id.value,
    success: true,
    executionTime: 0,
    shouldContinue: true,
  };
};
```

## 创建自定义Hook函数

### 示例：创建一个缓存Hook函数

```typescript
import { BaseHookFunction, HookFunctionResult, createHookFunctionResult } from './base-hook-function';

export class CacheHookFunction extends BaseHookFunction {
  readonly id = 'cache-hook-function';
  readonly name = '缓存函数';
  readonly description = '提供数据缓存功能';
  readonly version = '1.0.0';

  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  async execute(context: any, config?: Record<string, any>): Promise<HookFunctionResult> {
    const startTime = Date.now();

    try {
      const key = config?.key;
      const ttl = config?.ttl || 60000; // 默认60秒

      if (!key) {
        throw new Error('缺少缓存key');
      }

      // 检查缓存
      const cached = this.cache.get(key);
      if (cached) {
        const now = Date.now();
        if (now - cached.timestamp < cached.ttl) {
          const executionTime = Date.now() - startTime;
          return createHookFunctionResult(
            true,
            { cached: true, data: cached.data },
            undefined,
            executionTime,
            true
          );
        } else {
          // 缓存过期，删除
          this.cache.delete(key);
        }
      }

      // 缓存未命中，返回空结果
      const executionTime = Date.now() - startTime;
      return createHookFunctionResult(
        true,
        { cached: false, data: null },
        undefined,
        executionTime,
        true
      );
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return createHookFunctionResult(
        false,
        undefined,
        error instanceof Error ? error : String(error),
        executionTime,
        false
      );
    }
  }

  /**
   * 设置缓存
   */
  set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || 60000,
    });
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  validateConfig(config: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config?.key) {
      errors.push('缺少必需的key参数');
    }

    if (config?.ttl && (typeof config.ttl !== 'number' || config.ttl <= 0)) {
      errors.push('ttl必须是正数');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
```

### 注册自定义Hook函数

```typescript
import { CacheHookFunction } from './cache-hook-function';
import { FunctionRegistry } from './infrastructure/workflow/functions/registry/function-registry';

const registry = new FunctionRegistry();
registry.registerFunction(new CacheHookFunction());

// 使用
const cacheFunction = registry.getFunction('cache-hook-function');
const result = await cacheFunction.execute(context, { key: 'user-123' });
```

## 最佳实践

1. **单一职责**：每个Hook函数只做一件事
2. **可配置性**：通过config参数提供灵活的配置
3. **错误处理**：妥善处理错误，返回清晰的错误信息
4. **性能考虑**：记录执行时间，避免长时间阻塞
5. **幂等性**：确保函数可以安全地多次执行
6. **文档完善**：为自定义函数添加详细的注释和文档

## 总结

Hook函数模块提供了灵活、可复用的执行逻辑实现。通过组合不同的Hook函数，可以快速构建复杂的Hook行为，而无需修改Hook实体本身。这种设计提高了代码的可维护性和可扩展性。
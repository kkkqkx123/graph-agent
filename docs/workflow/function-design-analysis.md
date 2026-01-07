# 工作流函数设计分析

## 文档背景

本文档分析 [`docs/FUNCTION_DESIGN.md`](docs/FUNCTION_DESIGN.md) 的合理性，重点评估**统一导出预实例化函数**方案在实际配置系统中的可行性。

**重要发现：** context-processor 的预实例化只是一种尝试。实际代码显示：
- **静态函数**（如 `human-context`、`system-context`、`tool-context`、`llm-context`）：逻辑完全固定，适合预实例化
- **动态函数**（如 `regex-filter`）：需要从配置文件读取正则表达式、行数等参数，需要动态配置加载

## 当前实现状态

### 1. 各模块导出方式

| 模块 | 当前导出方式 | 特点 |
|------|------------|------|
| **context-processors** | ✅ 预实例化函数 | 简洁，通过 `.toProcessor()` 转换 |
| **hooks** | ❌ 仅导出类 | 需要用户手动实例化 |
| **conditions** | ❌ 仅导出类 | 需要用户手动实例化 |
| **routing** | ❌ 仅导出类 | 需要用户手动实例化 |
| **triggers** | ❌ 仅导出类 | 需要用户手动实例化 |

### 2. Context Processor 实际情况分析

#### 静态 Context Processor（适合预实例化）

**特征：**
- 逻辑完全固定，无需配置
- 过滤规则硬编码在代码中
- 执行时不需要额外参数

**示例：**

| 函数 | 逻辑 | 配置需求 |
|------|------|---------|
| [`human-context.processor`](src/infrastructure/workflow/functions/context-processors/human-context.processor.ts:14) | 过滤 `user.*`、`human.*`、`input.*` 变量 | ❌ 无需配置 |
| [`system-context.processor`](src/infrastructure/workflow/functions/context-processors/system-context.processor.ts:14) | 过滤 `system.*`、`config.*`、`env.*` 变量 | ❌ 无需配置 |
| [`tool-context.processor`](src/infrastructure/workflow/functions/context-processors/tool-context.processor.ts:14) | 过滤 `tool.*`、`function.*` 变量 | ❌ 无需配置 |
| [`llm-context.processor`](src/infrastructure/workflow/functions/context-processors/llm-context.processor.ts:14) | 过滤 `llm.*`、`prompt.*`、`model.*` 变量 | ❌ 无需配置 |

**代码示例：**
```typescript
// 完全静态，无需配置
export class HumanContextProcessor extends BaseContextProcessor {
  process(context: PromptContext, config?: Record<string, unknown>): PromptContext {
    const humanVariables = new Map<string, unknown>();
    for (const [key, value] of context.variables.entries()) {
      if (key.startsWith('user.') || key.startsWith('human.') || key.startsWith('input.')) {
        humanVariables.set(key, value);
      }
    }
    return PromptContext.create(context.template, humanVariables, humanHistory, context.metadata);
  }
}
```

#### 动态 Context Processor（需要配置加载）

**特征：**
- 需要从配置文件读取参数
- 支持运行时配置变更
- 不同场景需要不同配置

**示例：**

| 函数 | 逻辑 | 配置需求 |
|------|------|---------|
| [`regex-filter.processor`](src/infrastructure/workflow/functions/context-processors/regex-filter.processor.ts:93) | 基于正则表达式过滤 | ✅ 需要 pattern、flags、linesBefore、linesAfter |

**代码示例：**
```typescript
// 需要配置参数
export class RegexFilterProcessor extends BaseContextProcessor {
  private readonly defaultConfig: Required<RegexFilterConfig> = {
    pattern: '',        // 需要从配置文件读取
    flags: 'gim',       // 需要从配置文件读取
    linesBefore: 3,     // 需要从配置文件读取
    linesAfter: 3,      // 需要从配置文件读取
    searchInVariables: true,
    searchInHistory: true,
    searchInTemplate: false,
  };

  process(context: PromptContext, config?: Record<string, unknown>): PromptContext {
    const mergedConfig = this.mergeConfig(config);  // 合并配置
    // ... 使用配置执行逻辑
  }
}
```

### 3. 配置系统现状

**ConfigLoadingModule 能力：**
- ✅ 支持运行时配置加载和重载
- ✅ 支持环境变量注入
- ✅ 支持配置验证
- ✅ 提供 `get<T>(key: string)` 接口获取配置

**关键代码：**
```typescript
// 配置加载模块支持热重载
async reload(basePath: string): Promise<void>

// 获取配置值
get<T = any>(key: string, defaultValue?: T): T
```

### 4. FunctionRegistry 现状

**当前实现：**
```typescript
export class FunctionRegistry {
  private functions: Map<string, IWorkflowFunction> = new Map();
  
  // 注册函数（单例模式）
  registerFunction(func: IWorkflowFunction): void {
    this.functions.set(func.id, func);
  }
  
  // 获取函数
  getFunction(id: string): IWorkflowFunction | null {
    return this.functions.get(id) || null;
  }
}
```

**问题：**
- 只支持单例模式
- 无法支持动态配置加载
- 无法支持同一函数类型的多个配置实例

## 核心问题分析

### 问题1：预实例化与动态配置的冲突

**现象：**
```typescript
// 当前实现 - 预实例化
export const regexFilterProcessor = new RegexFilterProcessor().toProcessor();

// 问题：实例在模块加载时创建，无法感知运行时配置变更
// 如果配置文件中修改了 pattern、flags 等参数，预实例化的实例无法感知
```

**问题：**
- 实例在模块加载时创建（应用启动时）
- 配置变更后需要重启应用才能生效
- 违背了配置系统的动态加载设计目标

### 问题2：单例模式与多配置场景的冲突

**实际场景：**
```typescript
// 同一个 regex-filter 在不同节点需要不同配置
node1: {
  context_processor: 'regex-filter',
  config: { pattern: '^user_.*', linesBefore: 2, linesAfter: 2 }
}

node2: {
  context_processor: 'regex-filter',
  config: { pattern: '^system_.*', linesBefore: 5, linesAfter: 5 }
}
```

**问题：**
- FunctionRegistry 只支持单例
- 无法支持同一函数类型的多个配置实例
- 需要支持"同一函数类型，多个配置实例"

### 问题3：配置作用域混淆

未区分两种配置类型：

| 配置类型 | 来源 | 变更频率 | 示例 |
|---------|------|---------|------|
| **函数元数据配置** | 配置文件 | 低 | id, name, description, version |
| **函数执行配置** | 运行时参数 | 高 | execute(context, config) 的 config |

**当前设计缺陷：**
- 元数据配置硬编码在构造函数
- 执行配置通过参数传递（正确）
- 但文档未明确区分两者

## 推荐方案：分类基类 + 配置加载支持

### 设计思路

**核心原则：**
1. **为每类函数创建专用基类**，而不是全局统一基类
2. **静态函数**使用专用静态基类，适合预实例化
3. **动态函数**使用支持配置加载的基类，支持运行时配置
4. **统一通过 FunctionRegistry 管理**，对外提供一致的接口

### 基类设计

#### 基类1：SingletonContextProcessor（静态上下文处理器）

**特征：**
- 逻辑完全固定，无需配置
- 适合预实例化
- 单例模式

**文件：** [`src/infrastructure/workflow/functions/context-processors/singleton-context-processor.ts`](src/infrastructure/workflow/functions/context-processors/singleton-context-processor.ts:1)

```typescript
/**
 * 静态上下文处理器基类
 *
 * 适用于逻辑完全固定、无需配置的上下文处理器
 * 特点：
 * - 过滤规则硬编码，不需要从配置文件读取参数
 * - 适合预实例化，使用单例模式
 * - 性能最优，无配置加载开销
 */
export abstract class SingletonContextProcessor {
  abstract readonly name: string;
  abstract readonly description: string;
  readonly version: string = '1.0.0';

  abstract process(context: PromptContext, config?: Record<string, unknown>): PromptContext;

  // 静态处理器通常不需要配置验证
  validateConfig?(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    return { valid: true, errors: [] };
  }

  toProcessor(): (context: PromptContext, config?: Record<string, unknown>) => PromptContext {
    return (context: PromptContext, config?: Record<string, unknown>) => {
      return this.process(context, config);
    };
  }
}
```

#### 基类2：支持配置加载的基类

**改造的基类：**

| 基类 | 文件 | 用途 |
|------|------|------|
| `BaseConditionFunction` | [`conditions/base-condition-function.ts`](src/infrastructure/workflow/functions/conditions/base-condition-function.ts:1) | 条件函数 |
| `BaseHookFunction` | [`hooks/base-hook-function.ts`](src/infrastructure/workflow/functions/hooks/base-hook-function.ts:1) | Hook函数 |
| `BaseConditionRoutingFunction` | [`routing/base-routing-function.ts`](src/infrastructure/workflow/functions/routing/base-routing-function.ts:21) | 条件路由函数 |
| `BaseTargetRoutingFunction` | [`routing/base-routing-function.ts`](src/infrastructure/workflow/functions/routing/base-routing-function.ts:179) | 目标路由函数 |
| `BaseTriggerFunction` | [`triggers/base-trigger-function.ts`](src/infrastructure/workflow/functions/triggers/base-trigger-function.ts:1) | 触发器函数 |

**共同特性：**

```typescript
/**
 * 支持配置加载的基类
 * 
 * 支持配置加载：
 * - 可以通过 setConfigLoader() 注入配置加载器
 * - 支持从配置文件加载基础配置
 * - 支持运行时配置覆盖
 */
export abstract class BaseXXXFunction {
  protected configLoader?: ConfigLoadingModule;
  protected baseConfig: Record<string, any> = {};

  /**
   * 设置配置加载器
   */
  setConfigLoader(loader: ConfigLoadingModule): void {
    this.configLoader = loader;
    this.loadBaseConfig();
  }
  
  /**
   * 加载基础配置
   * 从配置文件中加载函数的基础配置
   */
  protected loadBaseConfig(): void {
    if (!this.configLoader) return;
    
    // 使用函数类名作为配置路径
    const configPath = `functions.${this.constructor.name}`;
    this.baseConfig = this.configLoader.get(configPath, {});
  }
  
  /**
   * 获取配置
   * 合并基础配置和运行时配置
   */
  protected getConfig<T = any>(runtimeConfig?: Record<string, any>): T {
    return { ...this.baseConfig, ...runtimeConfig } as T;
  }
}
```

### FunctionRegistry 改造

**设计目标：**
- 支持单例模式（静态函数）
- 支持动态分发（动态函数）
- 支持多实例管理
- 对外提供统一接口

```typescript
/**
 * 函数注册表
 * 支持单例模式和动态分发
 */
export class FunctionRegistry {
  // 单例函数（静态函数）
  private singletonFunctions: Map<string, IWorkflowFunction> = new Map();
  
  // 动态函数工厂（动态函数）
  private functionFactories: Map<string, FunctionFactory> = new Map();
  
  // 配置加载器
  private configLoader?: ConfigLoadingModule;
  
  constructor(configLoader?: ConfigLoadingModule) {
    this.configLoader = configLoader;
  }
  
  /**
   * 注册单例函数（静态函数）
   */
  registerSingleton(func: IWorkflowFunction): void {
    if (this.singletonFunctions.has(func.id)) {
      throw new Error(`单例函数 ${func.id} 已存在`);
    }
    this.singletonFunctions.set(func.id, func);
  }
  
  /**
   * 注册动态函数工厂
   */
  registerFactory(type: string, factory: FunctionFactory): void {
    if (this.functionFactories.has(type)) {
      throw new Error(`函数工厂 ${type} 已存在`);
    }
    this.functionFactories.set(type, factory);
  }
  
  /**
   * 获取函数（统一接口）
   * @param id 函数ID
   * @param config 运行时配置（仅动态函数需要）
   */
  getFunction(id: string, config?: Record<string, any>): IWorkflowFunction {
    // 1. 先查找单例函数
    if (this.singletonFunctions.has(id)) {
      return this.singletonFunctions.get(id)!;
    }
    
    // 2. 通过工厂创建动态函数
    const factory = this.functionFactories.get(id);
    if (factory) {
      const func = factory.create(config);
      
      // 如果有配置加载器，注入到函数中
      if (this.configLoader && 'setConfigLoader' in func) {
        (func as any).setConfigLoader(this.configLoader);
      }
      
      return func;
    }
    
    throw new Error(`函数不存在: ${id}`);
  }
  
  /**
   * 检查函数是否存在
   */
  hasFunction(id: string): boolean {
    return this.singletonFunctions.has(id) || this.functionFactories.has(id);
  }
  
  /**
   * 获取所有函数ID
   */
  getAllFunctionIds(): string[] {
    return [
      ...Array.from(this.singletonFunctions.keys()),
      ...Array.from(this.functionFactories.keys())
    ];
  }
}

/**
 * 函数工厂接口
 */
export interface FunctionFactory {
  create(config?: Record<string, any>): IWorkflowFunction;
}
```

### 函数实现示例

#### 静态函数示例（HumanContextProcessor）

```typescript
/**
 * 人工交互上下文处理器（静态函数）
 * 逻辑完全固定，无需配置
 */
export class HumanContextProcessor extends SingletonContextProcessor {
  override readonly name = 'human_context';
  override readonly description = '保留用户交互相关数据';

  process(context: PromptContext, config?: Record<string, unknown>): PromptContext {
    // 保留用户交互相关变量
    const humanVariables = new Map<string, unknown>();
    for (const [key, value] of context.variables.entries()) {
      if (key.startsWith('user.') || key.startsWith('human.') || key.startsWith('input.')) {
        humanVariables.set(key, value);
      }
    }
    
    // 保留人工交互相关历史
    const humanHistory = context.history.filter(entry => entry.metadata?.['humanInteraction']);
    
    return PromptContext.create(context.template, humanVariables, humanHistory, context.metadata);
  }
}

// 导出预实例化函数
export const humanContextProcessor = new HumanContextProcessor().toProcessor();
```

#### 动态函数示例（RegexFilterProcessor）

```typescript
/**
 * 正则表达式过滤配置接口
 */
export interface RegexFilterConfig {
  pattern: string;
  flags?: string;
  linesBefore?: number;
  linesAfter?: number;
  searchInVariables?: boolean;
  searchInHistory?: boolean;
  searchInTemplate?: boolean;
}

/**
 * 正则表达式过滤处理器（动态函数）
 * 需要从配置文件读取参数
 */
export class RegexFilterProcessor extends BaseContextProcessor {
  override readonly name = 'regex_filter';
  override readonly description = '基于正则表达式提取局部上下文内容';

  process(context: PromptContext, config?: Record<string, unknown>): PromptContext {
    // 合并配置：基础配置 + 运行时配置
    const mergedConfig = this.getConfig<RegexFilterConfig>(config);
    
    // 使用配置执行逻辑
    const regex = new RegExp(mergedConfig.pattern, mergedConfig.flags || 'gim');
    // ... 执行过滤逻辑
    
    return context;
  }
}

// 导出工厂函数
export const createRegexFilterProcessor = (config?: RegexFilterConfig): RegexFilterProcessor => {
  return new RegexFilterProcessor();
};
```

### 注册和使用

#### 应用初始化

```typescript
// 应用启动时
const configLoader = new ConfigLoadingModule(logger);
await configLoader.initialize('./configs');

const registry = new FunctionRegistry(configLoader);

// 注册静态函数（单例）
registry.registerSingleton(new HumanContextProcessor());
registry.registerSingleton(new SystemContextProcessor());
registry.registerSingleton(new ToolContextProcessor());
registry.registerSingleton(new LlmContextProcessor());

// 注册动态函数（工厂）
registry.registerFactory('context:regex_filter', {
  create: (config?: Record<string, any>) => new RegexFilterProcessor()
});
```

#### 使用函数

```typescript
// 使用静态函数（单例）
const humanProcessor = registry.getFunction('context:human');
const result1 = await humanProcessor.execute(context);

// 使用动态函数（带配置）
const regexProcessor1 = registry.getFunction('context:regex_filter', {
  pattern: '^user_.*',
  linesBefore: 2,
  linesAfter: 2
});
const result2 = await regexProcessor1.execute(context);

// 使用动态函数（不同配置）
const regexProcessor2 = registry.getFunction('context:regex_filter', {
  pattern: '^system_.*',
  linesBefore: 5,
  linesAfter: 5
});
const result3 = await regexProcessor2.execute(context);
```

## 函数分类策略

### 分类维度

#### 维度1：配置需求
- **静态型**：逻辑完全固定，无需配置
- **动态型**：需要从配置文件读取参数

#### 维度2：实例模式
- **单例型**：全局唯一实例
- **多例型**：支持多个配置实例

#### 维度3：初始化成本
- **轻量级**：实例化成本低（纯函数逻辑）
- **重量级**：需要连接外部资源（数据库、网络）

### 具体分类

#### 类型A：静态单例函数（推荐）

**特征：**
- 逻辑完全固定，无需配置
- 过滤规则硬编码在代码中
- 适合预实例化

**示例：**
- `HumanContextProcessor` - 过滤 `user.*`、`human.*` 变量
- `SystemContextProcessor` - 过滤 `system.*`、`config.*` 变量
- `ToolContextProcessor` - 过滤 `tool.*`、`function.*` 变量
- `LlmContextProcessor` - 过滤 `llm.*`、`prompt.*` 变量
- `HasToolCallsConditionFunction` - 检查消息中的 tool_calls
- `HasErrorsConditionFunction` - 检查错误状态
- `NoToolCallsConditionFunction` - 逻辑固定

**基类：** `SingletonContextProcessor`（context-processor）或直接使用现有基类（其他类型）
**注册方式：** `registerSingleton()`
**导出方式：** 预实例化导出

#### 类型B：动态多例函数（推荐）

**特征：**
- 需要从配置文件读取参数
- 支持运行时配置变更
- 不同场景需要不同配置

**示例：**
- `RegexFilterProcessor` - 需要配置正则表达式、行数
- `LoggingHookFunction` - 需要配置日志级别、格式
- `ValidationHookFunction` - 需要配置验证规则
- `ConditionalRoutingFunction` - 需要配置路由规则

**基类：** 现有基类（已添加配置加载支持）
**注册方式：** `registerFactory()`
**导出方式：** 工厂函数导出

## 配置结构设计

### 推荐配置结构

```toml
# functions.toml

# 静态函数（无需配置）
[functions.human_context]
id = "context:human"
name = "human_context"
description = "保留用户交互相关数据"
version = "1.0.0"

[functions.system_context]
id = "context:system"
name = "system_context"
description = "保留系统级变量和元数据"
version = "1.0.0"

# 动态函数（需要配置）
[functions.regex_filter]
id = "context:regex_filter"
name = "regex_filter"
description = "基于正则表达式提取局部上下文内容"
version = "1.0.0"

# 默认配置
[functions.regex_filter.default]
pattern = ".*"
flags = "gim"
linesBefore = 3
linesAfter = 3
searchInVariables = true
searchInHistory = true
searchInTemplate = false

# 多实例配置（可选）
[functions.regex_filter.instances.node1]
pattern = "^user_.*"
linesBefore = 2
linesAfter = 2

[functions.regex_filter.instances.node2]
pattern = "^system_.*"
linesBefore = 5
linesAfter = 5

[functions.logging_hook]
id = "hook:logging"
name = "logging_hook"
description = "日志记录函数"
version = "1.0.0"

[functions.logging_hook.default]
level = "info"
format = "json"
includeContext = true
```

## 实施计划

### 阶段1：基类改造（已完成）✅

**任务：**
1. ✅ 创建 `SingletonContextProcessor` 基类
2. ✅ 改造 `BaseConditionFunction` 支持配置加载
3. ✅ 改造 `BaseHookFunction` 支持配置加载
4. ✅ 改造 `BaseConditionRoutingFunction` 支持配置加载
5. ✅ 改造 `BaseTargetRoutingFunction` 支持配置加载
6. ✅ 改造 `BaseTriggerFunction` 支持配置加载

**文件：**
- ✅ `src/infrastructure/workflow/functions/context-processors/singleton-context-processor.ts`
- ✅ `src/infrastructure/workflow/functions/conditions/base-condition-function.ts`
- ✅ `src/infrastructure/workflow/functions/hooks/base-hook-function.ts`
- ✅ `src/infrastructure/workflow/functions/routing/base-routing-function.ts`
- ✅ `src/infrastructure/workflow/functions/triggers/base-trigger-function.ts`

### 阶段2：FunctionRegistry 改造（待实施）

**任务：**
1. 添加 `registerSingleton()` 方法
2. 添加 `registerFactory()` 方法
3. 改造 `getFunction()` 支持动态分发
4. 添加配置加载器注入

**文件：**
- `src/infrastructure/workflow/functions/function-registry.ts`

### 阶段3：函数迁移（待实施）

**任务：**
1. 迁移静态 context-processor 到 `SingletonContextProcessor`
2. 迁移动态函数使用配置加载功能
3. 更新导出方式

**优先级：**
1. **高优先级**：context-processors（已部分实现）
2. **中优先级**：conditions（大部分是静态函数）
3. **低优先级**：hooks、routing、triggers（需要评估）

### 阶段4：配置集成（待实施）

**任务：**
1. 定义配置结构
2. 实现配置加载
3. 支持配置热重载

**文件：**
- `configs/functions.toml`

## 风险评估

### 低风险
- 静态函数改为单例模式
- 基类设计向后兼容

### 中风险
- FunctionRegistry 改造可能影响现有使用
- 需要全面测试注册和获取逻辑

### 高风险
- 动态函数的配置加载路径复杂
- 多实例管理可能引入性能问题

## 总结

### 文档合理性评估

**✅ 合理部分：**
- 统一API接口的思路正确
- 预实例化提升开发体验（针对静态函数）
- 隐藏实现细节的目标合理

**❌ 缺陷部分：**
- 未区分静态函数和动态函数
- 未考虑配置动态加载
- 未设计多实例场景
- 实施路径过于简单

### 最终建议

**采用分类基类方案：**

1. **静态函数**：使用 `SingletonContextProcessor` 或直接使用现有基类，使用单例模式 ✅
2. **动态函数**：使用支持配置加载的基类，使用工厂模式 ✅
3. **统一管理**：通过 `FunctionRegistry` 统一注册和获取 ✅
4. **配置加载**：动态函数支持运行时配置加载 ✅

**实施优先级：**
1. ✅ 立即：创建分类基类（已完成）
2. 短期：改造 FunctionRegistry
3. 中期：迁移现有函数
4. 长期：完善配置系统

这样既能保持API简洁性，又能满足配置动态加载的需求，同时支持多实例场景。

## 已完成的改造

### 基类改造

1. **SingletonContextProcessor** - 静态上下文处理器基类
   - 文件：`src/infrastructure/workflow/functions/context-processors/singleton-context-processor.ts`
   - 特点：逻辑固定，无需配置，适合预实例化

2. **BaseConditionFunction** - 条件函数基类（已添加配置加载支持）
   - 文件：`src/infrastructure/workflow/functions/conditions/base-condition-function.ts`
   - 新增：`setConfigLoader()`, `loadBaseConfig()`, `getConfig()`

3. **BaseHookFunction** - Hook函数基类（已添加配置加载支持）
   - 文件：`src/infrastructure/workflow/functions/hooks/base-hook-function.ts`
   - 新增：`setConfigLoader()`, `loadBaseConfig()`, `getConfig()`

4. **BaseConditionRoutingFunction** - 条件路由函数基类（已添加配置加载支持）
   - 文件：`src/infrastructure/workflow/functions/routing/base-routing-function.ts`
   - 新增：`setConfigLoader()`, `loadBaseConfig()`, `getConfig()`

5. **BaseTargetRoutingFunction** - 目标路由函数基类（已添加配置加载支持）
   - 文件：`src/infrastructure/workflow/functions/routing/base-routing-function.ts`
   - 新增：`setConfigLoader()`, `loadBaseConfig()`, `getConfig()`

6. **BaseTriggerFunction** - 触发器函数基类（已添加配置加载支持）
   - 文件：`src/infrastructure/workflow/functions/triggers/base-trigger-function.ts`
   - 新增：`setConfigLoader()`, `loadBaseConfig()`, `getConfig()`

### 配置加载机制

所有支持配置加载的基类都实现了统一的配置加载机制：

```typescript
// 1. 设置配置加载器
setConfigLoader(loader: ConfigLoadingModule): void

// 2. 加载基础配置
protected loadBaseConfig(): void

// 3. 获取配置（合并基础配置和运行时配置）
protected getConfig<T = any>(runtimeConfig?: Record<string, any>): T
```

配置路径格式：`functions.{ClassName}`

例如：
- `functions.HasToolCallsConditionFunction`
- `functions.LoggingHookFunction`
- `functions.ConditionalRoutingFunction`
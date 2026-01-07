# 工作流函数设计文档

## 问题分析

当前函数设计存在不一致性：

### 当前现状

| 模块 | 导出方式 | 特点 |
|------|--------|------|
| **context-processors** | 仅导出**预实例化函数** | 简洁，隐藏实现细节 |
| **hooks** | 仅导出**类** | 无预实例化，使用方需要创建实例 |
| **conditions** | 仅导出**类** | 无预实例化，使用方需要创建实例 |
| **routing** | 仅导出**类** | 无预实例化，使用方需要创建实例 |
| **triggers** | 仅导出**类** | 无预实例化，使用方需要创建实例 |

## 解决方案

### 方案对比

#### 方案A：统一为"仅导出实例"（推荐）
**应用于：** context-processors, hooks, conditions, routing, triggers

**优点：**
- ✅ API 最简洁：`import { llmContextProcessor } from '...'`
- ✅ 隐藏实现细节，用户只接触函数接口
- ✅ 支持类似工厂模式，便于配置管理
- ✅ 便于单例模式和生命周期管理
- ✅ 性能优化空间大（缓存、延迟初始化等）

**缺点：**
- 自定义扩展需导入基类

**用途：** 
- 预定义函数集合
- FunctionRegistry 管理

---

#### 方案B：统一为"仅导出类"
**优点：**
- 符合 OOP 传统
- 用户自由控制实例化

**缺点：**
- ❌ API 使用复杂：`new HasToolCallsConditionFunction().execute(...)`
- ❌ 每次都要实例化，可能有性能开销
- ❌ 与 context-processors 不一致

---

#### 方案C：导出类和实例
**优点：**
- 灵活，支持两种用法

**缺点：**
- ❌ API 混乱，用户困惑选哪个
- ❌ 维护成本高（同时维护两个导出）
- ❌ 增加 bundle 大小

---

### 推荐方案：**统一为方案A** ✅

## 实施规范

### 1. 函数类设计原则

```typescript
// ✅ 推荐：可配置的类实现
export class MyConditionFunction {
  readonly id = 'condition:my_condition';
  readonly name = 'my_condition';
  readonly description = '...';
  
  execute(context: any, config?: Record<string, any>): Promise<boolean> {
    // 实现逻辑
  }
  
  validateConfig?(config: Record<string, any>): { valid: boolean; errors: string[] } {
    // 可选：配置验证
  }
}

// ✅ 推荐：导出预实例化的函数
export const myConditionFunction = new MyConditionFunction();
```

### 2. 导出规范

```typescript
// ✅ 推荐（functions/conditions/index.ts 示例）
// 基类
export { BaseConditionFunction } from './base-condition-function';

// 预实例化函数实例
export { myConditionFunction } from './my-condition.function';
export { anotherConditionFunction } from './another-condition.function';

// ❌ 不导出类（除非用于扩展基类的情况）
// export { MyConditionFunction } from './my-condition.function';
```

### 3. 使用示例

```typescript
// ✅ 简洁用法
import { llmContextProcessor } from '@/infrastructure/workflow/functions';

// 直接使用
const result = llmContextProcessor(context, config);
```

### 4. 自定义扩展

```typescript
// ✅ 需要自定义时，导入基类
import { BaseConditionFunction } from '@/infrastructure/workflow/functions';

export class CustomConditionFunction extends BaseConditionFunction {
  readonly id = 'condition:custom';
  readonly name = 'custom';
  readonly description = '自定义条件函数';
  
  async execute(context: any): Promise<boolean> {
    // 实现逻辑
  }
}

export const customConditionFunction = new CustomConditionFunction();
```

## FunctionRegistry 集成

所有预实例化函数应在应用初始化时注册到 FunctionRegistry：

```typescript
// ✅ 应用启动时
const registry = new FunctionRegistry();

// 注册所有内置函数
import {
  llmContextProcessor,
  toolContextProcessor,
  hasToolCallsCondition,
  // ... 其他函数
} from '@/infrastructure/workflow/functions';

registry.registerFunction(llmContextProcessor);
registry.registerFunction(toolContextProcessor);
registry.registerFunction(hasToolCallsCondition);
// ...
```

## 迁移计划

1. **Phase 1:** context-processors 统一为实例导出 ✅ 已完成
2. **Phase 2:** hooks 改为导出预实例化函数
3. **Phase 3:** conditions 改为导出预实例化函数
4. **Phase 4:** routing 改为导出预实例化函数
5. **Phase 5:** triggers 改为导出预实例化函数
6. **Phase 6:** 更新 FunctionRegistry 初始化逻辑
7. **Phase 7:** 更新所有使用方（nodes 等）

## 文件结构示例

```
functions/
├── conditions/
│   ├── base-condition-function.ts     # 基类
│   ├── has-tool-calls.function.ts     # 类 + 实例
│   ├── no-tool-calls.function.ts      # 类 + 实例
│   └── index.ts                       # 仅导出实例 + 基类
├── hooks/
│   ├── base-hook-function.ts
│   ├── logging-hook-function.ts       # 类 + 实例
│   └── index.ts                       # 仅导出实例 + 基类
└── ...
```

## 约定

- 类定义文件：`{name}.function.ts`
- 导出实例名称：camelCase，如 `myConditionFunction`
- 导出类名称：PascalCase，如 `MyConditionFunction`
- 不在 index.ts 中导出具体类，除非用于扩展
- 所有实例导出在 index.ts 中明确注释其用途

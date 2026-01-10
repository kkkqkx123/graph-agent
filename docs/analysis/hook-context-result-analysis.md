# HookContext 和 HookExecutionResult 架构分析报告

## 问题概述

分析 `src/services/workflow/hooks/hook-context.ts` 和 `src/services/workflow/hooks/hook-execution-result.ts` 是否应该改为在领域层定义值对象。

## 当前状态

### 1. 领域层定义（src/domain/workflow/entities/hook.ts）

**HookContext 接口（第53-65行）：**
```typescript
export interface HookContext {
  readonly workflowId?: ID;
  readonly executionId?: string;
  readonly nodeId?: string;
  readonly edgeId?: string;
  readonly variables: Map<string, any>;
  readonly metadata?: Record<string, any>;
  getVariable(key: string): any;
  setVariable(key: string, value: any): void;
  getAllVariables(): Record<string, any>;
  getNodeResult(nodeId: string): any;
  setNodeResult(nodeId: string, result: any): void;
}
```

**HookExecutionResult 接口（第8-15行）：**
```typescript
export interface HookExecutionResult {
  readonly success: boolean;
  readonly output?: any;
  readonly error?: string;
  readonly metadata?: Record<string, any>;
  readonly shouldContinue: boolean;
  readonly executionTime: number;
}
```

### 2. 服务层定义（src/services/workflow/hooks/）

**hook-context.ts：**
```typescript
export interface HookContext {
  workflowId?: string;
  executionId?: string;
  config?: Record<string, any>;
  metadata?: Record<string, any>;
  hookPoint?: HookPointValue;
  eventType?: string;
  eventData?: Record<string, any>;
}
```

**hook-execution-result.ts：**
```typescript
export interface HookExecutionResult {
  hookId: string;
  success: boolean;
  result?: any;
  error?: Error | string;
  executionTime: number;
  shouldContinue: boolean;
  metadata?: Record<string, any>;
}

export class HookExecutionResultBuilder { ... }
```

## 关键发现

### 1. 定义重复问题
- **HookContext**：领域层和服务层都有定义，但字段和结构不同
- **HookExecutionResult**：领域层和服务层都有定义，但字段名称和类型不同

### 2. 使用情况
- **服务层定义**：被广泛使用于多个服务层文件（hook-executor.ts, hook-plugin.ts, 各种 hook 实现类）
- **领域层定义**：仅在 Hook 实体内部使用，作为抽象方法的参数和返回类型

### 3. 字段差异分析

#### HookContext 差异
| 字段 | 领域层 | 服务层 | 说明 |
|------|--------|--------|------|
| workflowId | ID | string | 类型不同 |
| executionId | string | string | 相同 |
| nodeId | string | - | 仅领域层有 |
| edgeId | string | - | 仅领域层有 |
| variables | Map<string, any> | - | 仅领域层有 |
| config | - | Record<string, any> | 仅服务层有 |
| hookPoint | - | HookPointValue | 仅服务层有 |
| eventType | - | string | 仅服务层有 |
| eventData | - | Record<string, any> | 仅服务层有 |
| 方法 | 有 | 无 | 领域层有业务方法 |

#### HookExecutionResult 差异
| 字段 | 领域层 | 服务层 | 说明 |
|------|--------|--------|------|
| hookId | - | string | 仅服务层有 |
| success | boolean | boolean | 相同 |
| output | any | - | 领域层使用 |
| result | - | any | 服务层使用 |
| error | string | Error \| string | 服务层更灵活 |
| metadata | Record<string, any> | Record<string, any> | 相同 |
| shouldContinue | boolean | boolean | 相同 |
| executionTime | number | number | 相同 |

## 架构原则分析

### DDD 原则
根据领域驱动设计原则：
1. **单一职责原则**：领域定义应该集中在领域层
2. **依赖倒置原则**：服务层应该依赖领域层的抽象
3. **DRY 原则**：避免重复定义

### 项目架构规则
根据 AGENTS.md：
- **Domain Layer**：包含纯业务逻辑和领域实体，提供所有主要组件的契约
- **Services Layer**：提供业务逻辑和技术实现，依赖领域层和基础设施层
- **所有领域定义必须放置在集中的领域层**（src/domain/）

## 分析结论

### ✅ 应该改为在领域层定义值对象

**理由：**

1. **违反架构规则**
   - 当前存在定义重复，违反了"所有领域定义必须放置在集中的领域层"的规则
   - 服务层定义了本应属于领域的概念

2. **值对象特征**
   - **HookContext**：表示钩子执行的上下文信息，具有明确的业务语义，包含验证逻辑（如变量管理）
   - **HookExecutionResult**：表示钩子执行的结果，具有明确的业务语义，包含验证逻辑（如执行时间、成功状态）

3. **业务逻辑封装**
   - 领域层的 HookContext 包含业务方法（getVariable, setVariable 等），体现了值对象的行为封装
   - 服务层的 HookExecutionResultBuilder 是构建器模式，应该在领域层提供

4. **依赖方向正确性**
   - 当前服务层定义被广泛使用，但领域层也有自己的定义
   - 应该统一使用领域层的定义，服务层依赖领域层

5. **类型安全**
   - 领域层使用 ID 类型（workflowId），服务层使用 string，类型不一致
   - 统一使用领域层定义可以提高类型安全性

## 重构建议

### 方案一：合并定义（推荐）

**步骤：**

1. **在领域层创建值对象**
   - 创建 `src/domain/workflow/value-objects/hook/hook-context-value.ts`
   - 创建 `src/domain/workflow/value-objects/hook/hook-execution-result-value.ts`

2. **合并字段**
   - HookContext：合并两个定义的所有字段，保留业务方法
   - HookExecutionResult：合并字段，统一使用 output/result（建议使用 output），添加 hookId

3. **更新领域层实体**
   - 更新 Hook 实体使用新的值对象
   - 移除旧的接口定义

4. **更新服务层**
   - 所有服务层代码使用领域层的值对象
   - 移除服务层的重复定义
   - HookExecutionResultBuilder 可以保留在服务层作为辅助类，或者移到领域层

### 方案二：保留接口，添加值对象

**步骤：**

1. **保留领域层接口**
   - HookContext 和 HookExecutionResult 作为接口保留
   - 用于定义契约

2. **创建值对象实现**
   - 创建具体的值对象类实现这些接口
   - 提供验证、构建等方法

3. **更新服务层**
   - 服务层使用领域层的接口和值对象
   - 移除服务层的重复定义

## 具体实施建议

### 1. HookContext 值对象设计

```typescript
// src/domain/workflow/value-objects/hook/hook-context-value.ts
export interface HookContextProps {
  workflowId?: ID;
  executionId?: string;
  nodeId?: string;
  edgeId?: string;
  variables: Map<string, any>;
  config?: Record<string, any>;
  metadata?: Record<string, any>;
  hookPoint?: HookPointValue;
  eventType?: string;
  eventData?: Record<string, any>;
}

export class HookContextValue extends ValueObject<HookContextProps> {
  // 实现业务方法
  getVariable(key: string): any { ... }
  setVariable(key: string, value: any): void { ... }
  // ...
}
```

### 2. HookExecutionResult 值对象设计

```typescript
// src/domain/workflow/value-objects/hook/hook-execution-result-value.ts
export interface HookExecutionResultProps {
  hookId: string;
  success: boolean;
  output?: any;
  error?: string;
  metadata?: Record<string, any>;
  shouldContinue: boolean;
  executionTime: number;
}

export class HookExecutionResultValue extends ValueObject<HookExecutionResultProps> {
  // 验证逻辑
  validate(): void {
    if (this.props.executionTime < 0) {
      throw new Error('执行时间不能为负数');
    }
    // ...
  }

  // 工厂方法
  static success(hookId: string, output: any, executionTime: number): HookExecutionResultValue { ... }
  static failure(hookId: string, error: string, executionTime: number): HookExecutionResultValue { ... }
}
```

### 3. 迁移路径

1. **第一阶段**：在领域层创建值对象，保留旧定义
2. **第二阶段**：逐步迁移服务层代码使用新的值对象
3. **第三阶段**：移除服务层的重复定义
4. **第四阶段**：更新领域层实体使用值对象

## 风险评估

### 低风险
- 值对象设计符合 DDD 原则
- 提高代码一致性和可维护性
- 改善类型安全性

### 中风险
- 需要更新大量服务层代码
- 可能需要调整 Hook 实现类
- 需要确保向后兼容性

### 缓解措施
- 分阶段迁移，逐步替换
- 保持接口兼容性
- 充分的单元测试和集成测试

## 总结

**结论：应该改为在领域层定义值对象**

这两个概念具有明确的业务语义，符合值对象的特征，应该统一在领域层定义。当前的定义重复违反了项目的架构规则，需要重构以提高代码质量和一致性。

建议采用方案一（合并定义），在领域层创建完整的值对象，包含所有必要的字段和业务方法，然后逐步迁移服务层代码使用新的值对象。
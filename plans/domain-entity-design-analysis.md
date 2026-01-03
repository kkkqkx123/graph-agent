# Domain 实体设计规范分析报告

## 一、概述

本报告分析了 `src/domain` 目录下各模块实体的结构差异，并提出统一的设计规范建议。

## 二、实体分类

根据实体的用途和生命周期特征，将实体分为以下三类：

### 2.1 聚合根实体（Aggregate Root Entities）

**特征：**
- 继承自 `Entity` 基类
- 具有完整的生命周期管理
- 需要持久化存储
- 包含业务规则和不变性约束
- 作为聚合的根，管理内部实体和值对象

**实体列表：**
- `Session` - 会话聚合根（多线程管理器）
- `Thread` - 线程聚合根（串行执行流程协调）
- `Workflow` - 工作流聚合根（图结构管理）
- `Checkpoint` - 检查点聚合根（状态快照）
- `History` - 历史记录聚合根（操作审计）
- `Tool` - 工具聚合根（工具定义）
- `Prompt` - 提示词聚合根（提示词管理）

### 2.2 执行记录实体（Execution Record Entities）

**特征：**
- 记录执行过程和结果
- 通常不需要复杂的生命周期管理
- 可能不需要持久化（或短期持久化）
- 侧重于数据记录而非业务规则

**实体列表：**
- `LLMRequest` - LLM请求记录
- `LLMResponse` - LLM响应记录
- `ToolExecution` - 工具执行记录
- `ToolResult` - 工具执行结果

### 2.3 抽象实体（Abstract Entities）

**特征：**
- 作为其他实体的基类
- 定义通用接口和行为
- 不能直接实例化

**实体列表：**
- `Node` - 抽象节点实体（工作流节点基类）

## 三、设计模式差异分析

### 3.1 不可变性模式差异

#### 模式A：完全不可变（Immutable）
```typescript
// 所有更新方法返回新实例
public updateTitle(title: string): Session {
  return new Session({
    ...this.props,
    title,
    updatedAt: Timestamp.now(),
    version: this.props.version.nextPatch()
  });
}
```
- **使用实体：** Session, Thread, Workflow, Checkpoint, History, Tool, Prompt
- **优点：** 线程安全、易于推理、符合函数式编程原则
- **缺点：** 可能产生更多对象实例

#### 模式B：可变（Mutable）
```typescript
// 直接修改属性，返回 void
public updateMetadata(metadata: Record<string, unknown>): void {
  const newProps = {
    ...this.props,
    metadata: { ...metadata },
    updatedAt: Timestamp.now(),
    version: this.props.version.nextPatch()
  };
  (this as any).props = Object.freeze(newProps);
  this.update();
}
```
- **使用实体：** LLMRequest, LLMResponse
- **优点：** 减少对象创建、性能更好
- **缺点：** 线程不安全、需要额外同步机制

#### 模式C：混合模式
```typescript
// 部分方法返回新实例，部分直接修改
public updateProperties(properties: Record<string, any>): void {
  (this.props as any).properties = { ...this.props.properties, ...properties };
  this.update();
}
```
- **使用实体：** Node
- **问题：** 不一致的行为，容易引起混淆

### 3.2 删除状态管理差异

#### 模式A：使用 DeletionStatus 值对象
```typescript
export interface CheckpointProps {
  // ...
  deletionStatus: DeletionStatus;
}

public markAsDeleted(): Checkpoint {
  return new Checkpoint({
    ...this.props,
    deletionStatus: this.props.deletionStatus.markAsDeleted(),
    // ...
  });
}
```
- **使用实体：** Checkpoint, History, Session, Thread, Tool
- **优点：** 类型安全、可扩展、支持软删除
- **缺点：** 需要额外的值对象

#### 模式B：使用布尔标志
```typescript
export interface LLMRequestProps {
  // ...
  isDeleted: boolean;
}

public markAsDeleted(): void {
  const newProps = {
    ...this.props,
    isDeleted: true,
    // ...
  };
  (this as any).props = Object.freeze(newProps);
  this.update();
}
```
- **使用实体：** LLMRequest, LLMResponse
- **优点：** 简单直接
- **缺点：** 类型不安全、难以扩展

#### 模式C：无删除状态
- **使用实体：** ToolExecution, ToolResult, Prompt, Node
- **问题：** 无法支持软删除

### 3.3 Props 接口设计差异

#### 模式A：使用 readonly 修饰符
```typescript
export interface SessionProps {
  readonly id: ID;
  readonly userId?: ID;
  readonly title?: string;
  // ...
}
```
- **使用实体：** Session, Thread, Workflow, Checkpoint, History, Tool, Prompt
- **优点：** 明确表达不可变性、编译时检查

#### 模式B：不使用 readonly
```typescript
export interface LLMRequestProps {
  id: ID;
  sessionId?: ID;
  model: string;
  // ...
}
```
- **使用实体：** LLMRequest, LLMResponse, ToolExecution, ToolResult
- **问题：** 无法在编译时保证不可变性

### 3.4 工厂方法命名差异

#### 模式A：标准 create() 和 fromProps()
```typescript
public static create(...): Entity {
  // 创建新实体
}

public static fromProps(props: EntityProps): Entity {
  // 从已有属性重建实体
}
```
- **使用实体：** Session, Thread, Workflow, Checkpoint, History, Tool, LLMRequest, LLMResponse
- **优点：** 命名一致、易于理解

#### 模式B：特定场景的工厂方法
```typescript
public static createSuccess(...): ToolResult {
  // 创建成功结果
}

public static createFailure(...): ToolResult {
  // 创建失败结果
}
```
- **使用实体：** ToolResult
- **优点：** 语义清晰、减少参数验证
- **缺点：** 可能产生大量工厂方法

#### 模式C：使用 reconstruct()
```typescript
static reconstruct(props: PromptProps): Prompt {
  return new Prompt(props);
}
```
- **使用实体：** Prompt
- **问题：** 命名不一致

### 3.5 继承 Entity 基类差异

#### 模式A：继承 Entity
- **使用实体：** Session, Thread, Workflow, Checkpoint, History, Tool, Prompt, LLMRequest, LLMResponse, Node
- **优点：** 统一的基础行为（ID、时间戳、版本、相等性）

#### 模式B：不继承 Entity
- **使用实体：** ToolExecution, ToolResult
- **问题：** 缺少统一的基础行为

### 3.6 时间戳类型差异

#### 模式A：使用 Timestamp 值对象
```typescript
export interface SessionProps {
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}
```
- **使用实体：** Session, Thread, Workflow, Checkpoint, History, Tool, Prompt, LLMRequest, LLMResponse
- **优点：** 类型安全、提供时间计算方法

#### 模式B：使用 Date 类型
```typescript
export class ToolExecution {
  readonly startedAt: Date;
  readonly endedAt?: Date;
}
```
- **使用实体：** ToolExecution, ToolResult
- **问题：** 类型不安全、缺少时间计算方法

### 3.7 版本管理差异

#### 模式A：使用 Version 值对象
```typescript
export interface SessionProps {
  readonly version: Version;
}
```
- **使用实体：** Session, Thread, Workflow, Checkpoint, History, Tool, Prompt, LLMRequest, LLMResponse
- **优点：** 支持语义化版本、提供版本比较方法

#### 模式B：无版本管理
- **使用实体：** ToolExecution, ToolResult, Node
- **问题：** 无法追踪变更历史

### 3.8 业务标识方法差异

#### 模式A：提供 getBusinessIdentifier()
```typescript
public getBusinessIdentifier(): string {
  return `session:${this.props.id.toString()}`;
}
```
- **使用实体：** Session, Thread, Workflow, Checkpoint, History, Tool, LLMRequest, LLMResponse
- **优点：** 支持业务层面的唯一标识

#### 模式B：无业务标识方法
- **使用实体：** ToolExecution, ToolResult, Prompt, Node
- **问题：** 缺少业务层面的标识

## 四、统一设计规范建议

### 4.1 实体分类规范

| 实体类型 | 继承 Entity | 需要持久化 | 使用不可变性 | 使用 DeletionStatus | 使用 Version | 使用 Timestamp |
|---------|------------|-----------|------------|-------------------|-------------|---------------|
| 聚合根实体 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 执行记录实体 | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| 抽象实体 | ✅ | N/A | ✅ | ❌ | ❌ | ✅ |

### 4.2 不可变性规范

**聚合根实体：**
- 必须使用完全不可变模式
- 所有更新方法必须返回新实例
- Props 接口必须使用 `readonly` 修饰符

**执行记录实体：**
- 可以使用可变模式（性能优先）
- 或使用不可变模式（一致性优先）
- 根据实际需求选择

**示例：**
```typescript
// 聚合根实体 - 不可变
export class Session extends Entity {
  private readonly props: SessionProps;

  public updateTitle(title: string): Session {
    return new Session({
      ...this.props,
      title,
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    });
  }
}

// 执行记录实体 - 可变
export class LLMRequest extends Entity {
  private readonly props: LLMRequestProps;

  public updateMetadata(metadata: Record<string, unknown>): void {
    const newProps = {
      ...this.props,
      metadata: { ...metadata },
      updatedAt: Timestamp.now(),
      version: this.props.version.nextPatch()
    };
    (this as any).props = Object.freeze(newProps);
    this.update();
  }
}
```

### 4.3 删除状态管理规范

**需要持久化的实体：**
- 必须使用 `DeletionStatus` 值对象
- 提供 `markAsDeleted()`, `isDeleted()`, `isActive()` 方法
- Props 接口必须包含 `deletionStatus: DeletionStatus`

**临时执行记录：**
- 可以使用简单的 `isDeleted: boolean` 标志
- 或不提供删除状态（根据需求）

**示例：**
```typescript
// 需要持久化的实体
export interface SessionProps {
  readonly deletionStatus: DeletionStatus;
}

public markAsDeleted(): Session {
  return new Session({
    ...this.props,
    deletionStatus: this.props.deletionStatus.markAsDeleted(),
    updatedAt: Timestamp.now(),
    version: this.props.version.nextPatch()
  });
}

// 临时执行记录
export interface LLMRequestProps {
  isDeleted: boolean;
}

public markAsDeleted(): void {
  const newProps = {
    ...this.props,
    isDeleted: true,
    updatedAt: Timestamp.now(),
    version: this.props.version.nextPatch()
  };
  (this as any).props = Object.freeze(newProps);
  this.update();
}
```

### 4.4 Props 接口规范

**所有 Props 接口必须使用 `readonly` 修饰符：**
```typescript
export interface SessionProps {
  readonly id: ID;
  readonly userId?: ID;
  readonly title?: string;
  readonly status: SessionStatus;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly version: Version;
  readonly deletionStatus: DeletionStatus;
}
```

### 4.5 工厂方法规范

**聚合根实体：**
- 必须提供 `create()` 静态方法
- 必须提供 `fromProps()` 静态方法

**执行记录实体：**
- 必须提供 `create()` 静态方法
- 必须提供 `fromProps()` 静态方法
- 可以提供特定场景的工厂方法（如 `createSuccess()`, `createFailure()`）

**示例：**
```typescript
export class Session extends Entity {
  public static create(
    userId?: ID,
    title?: string,
    config?: SessionConfig,
    metadata?: Record<string, unknown>
  ): Session {
    // 创建新会话
  }

  public static fromProps(props: SessionProps): Session {
    return new Session(props);
  }
}

export class ToolResult {
  public static createSuccess(
    executionId: ID,
    data: unknown,
    duration: number = 0
  ): ToolResult {
    // 创建成功结果
  }

  public static createFailure(
    executionId: ID,
    error: string,
    duration: number = 0
  ): ToolResult {
    // 创建失败结果
  }

  public static fromProps(props: ToolResultProps): ToolResult {
    return new ToolResult(props);
  }
}
```

### 4.6 继承规范

**所有实体（除了特殊情况）必须继承 `Entity` 基类：**
```typescript
export class Session extends Entity {
  // ...
}
```

**特殊情况：**
- 如果实体确实不需要 Entity 的基础行为，可以不继承
- 但需要在文档中说明原因

### 4.7 时间戳规范

**需要持久化的实体：**
- 必须使用 `Timestamp` 值对象
- Props 接口必须包含 `createdAt: Timestamp` 和 `updatedAt: Timestamp`

**临时执行记录：**
- 可以使用 `Date` 类型（性能优先）
- 或使用 `Timestamp` 值对象（一致性优先）

**示例：**
```typescript
// 需要持久化的实体
export interface SessionProps {
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

// 临时执行记录
export class ToolExecution {
  readonly startedAt: Date;
  readonly endedAt?: Date;
}
```

### 4.8 版本管理规范

**需要持久化的实体：**
- 必须使用 `Version` 值对象
- Props 接口必须包含 `version: Version`
- 更新时必须调用 `version.nextPatch()`

**临时执行记录：**
- 可以省略版本管理（根据需求）

**示例：**
```typescript
// 需要持久化的实体
export interface SessionProps {
  readonly version: Version;
}

public updateTitle(title: string): Session {
  return new Session({
    ...this.props,
    title,
    updatedAt: Timestamp.now(),
    version: this.props.version.nextPatch()
  });
}

// 临时执行记录
export class ToolExecution {
  // 无版本管理
}
```

### 4.9 业务标识规范

**需要持久化的实体：**
- 必须提供 `getBusinessIdentifier()` 方法
- 返回格式：`{entityType}:{id}`

**临时执行记录：**
- 可以省略此方法（根据需求）

**示例：**
```typescript
// 需要持久化的实体
public getBusinessIdentifier(): string {
  return `session:${this.props.id.toString()}`;
}

// 临时执行记录
// 无业务标识方法
```

### 4.10 命名规范

**实体类名：**
- 使用单数形式：`Session` 而非 `Sessions`
- 使用 PascalCase

**Props 接口：**
- 命名格式：`{实体名}Props`
- 例如：`SessionProps`, `ThreadProps`

**工厂方法：**
- 创建方法：`create()`
- 重建方法：`fromProps()`
- 特定场景：`create{场景}()`，如 `createSuccess()`

**更新方法：**
- 命名格式：`update{属性名}()` 或 `change{属性名}()`
- 例如：`updateTitle()`, `changeStatus()`

**查询方法：**
- 布尔查询：`is{状态}()` 或 `has{属性}()`
- 例如：`isActive()`, `hasTag()`
- 获取方法：`get{属性名}()`
- 例如：`getTitle()`, `getThreadId()`

## 五、实施建议

### 5.1 优先级

**高优先级（立即实施）：**
1. 统一 Props 接口使用 `readonly` 修饰符
2. 统一工厂方法命名（`create()` 和 `fromProps()`）
3. 为需要持久化的实体添加 `DeletionStatus`
4. 为需要持久化的实体添加 `getBusinessIdentifier()`

**中优先级（逐步实施）：**
1. 统一不可变性模式（聚合根实体使用不可变模式）
2. 统一时间戳类型（需要持久化的实体使用 `Timestamp`）
3. 统一版本管理（需要持久化的实体使用 `Version`）

**低优先级（可选）：**
1. 执行记录实体的不可变性模式选择
2. 临时执行记录的时间戳类型选择

### 5.2 迁移策略

1. **创建基类模板：** 为聚合根实体和执行记录实体创建基类模板
2. **逐步迁移：** 按模块逐步迁移，避免大规模重构
3. **保持向后兼容：** 在迁移过程中保持向后兼容性
4. **添加单元测试：** 为每个实体添加完整的单元测试
5. **更新文档：** 更新相关文档和注释

### 5.3 代码审查清单

在创建或修改实体时，检查以下项目：

- [ ] 实体类型是否正确（聚合根/执行记录/抽象）
- [ ] Props 接口是否使用 `readonly` 修饰符
- [ ] 是否提供 `create()` 和 `fromProps()` 工厂方法
- [ ] 不可变性模式是否符合规范
- [ ] 删除状态管理是否符合规范
- [ ] 时间戳类型是否符合规范
- [ ] 版本管理是否符合规范
- [ ] 是否提供 `getBusinessIdentifier()` 方法（如需要）
- [ ] 命名是否符合规范
- [ ] 是否有完整的单元测试

## 六、总结

当前 `src/domain` 目录下的实体存在明显的设计差异，主要体现在：

1. **不可变性模式不一致：** 部分实体使用不可变模式，部分使用可变模式
2. **删除状态管理不统一：** 部分使用 `DeletionStatus`，部分使用布尔标志，部分无删除状态
3. **Props 接口设计不一致：** 部分使用 `readonly`，部分不使用
4. **工厂方法命名不一致：** 部分使用 `fromProps()`，部分使用 `reconstruct()`
5. **时间戳类型不一致：** 部分使用 `Timestamp`，部分使用 `Date`
6. **版本管理不一致：** 部分有版本管理，部分无

通过实施本报告提出的统一设计规范，可以：

1. **提高代码一致性：** 所有实体遵循相同的设计模式
2. **降低维护成本：** 统一的模式更容易理解和维护
3. **提高代码质量：** 明确的规范有助于避免常见错误
4. **提升开发效率：** 开发者可以快速理解和使用实体

建议按照优先级逐步实施这些规范，并在实施过程中保持向后兼容性，确保系统的稳定性和可靠性。
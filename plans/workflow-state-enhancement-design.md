# 工作流状态管理机制增强设计

## 概述

本文档设计增强的工作流状态管理机制，引入类似 LangGraph 的 Annotation/reducer 模式，提升状态管理的灵活性、可组合性和类型安全性。

## 一、当前状态管理问题分析

### 1.1 现有实现

```typescript
// src/domain/workflow/value-objects/workflow-state.ts
export class WorkflowState extends ValueObject<WorkflowStateProps> {
  public readonly data: Record<string, any>;
  // 简单的数据合并更新
  public getData(key?: string): any {
    if (key === undefined) {
      return { ...this.props.data };
    }
    return this.props.data[key];
  }
}
```

### 1.2 存在的问题

1. **缺乏字段级更新策略**：所有字段使用相同的合并策略
2. **不支持复杂数据结构**：如数组的追加、嵌套对象的深度合并
3. **类型安全性不足**：`Record<string, any>` 缺乏类型约束
4. **不可变性实现繁琐**：每次更新需要手动创建新对象
5. **不支持状态字段的默认值**：需要手动初始化

## 二、增强设计方案

### 2.1 核心概念

引入三个核心组件：

1. **StateAnnotation**：状态字段定义，包含类型、reducer、默认值
2. **StateReducer**：字段更新函数，定义如何合并新旧值
3. **StateSchema**：状态模式，管理多个字段的 Annotation

### 2.2 数据结构设计

#### StateAnnotation（状态注解）

```typescript
// src/domain/workflow/value-objects/state/state-annotation.ts
export interface StateAnnotationProps<T = any> {
  readonly type: Type<T>;
  readonly reducer?: StateReducer<T>;
  readonly defaultValue?: () => T;
  readonly description?: string;
}

export class StateAnnotation<T = any> extends ValueObject<StateAnnotationProps<T>> {
  /**
   * 创建状态注解
   */
  public static create<T>(props: StateAnnotationProps<T>): StateAnnotation<T> {
    return new StateAnnotation(props);
  }

  /**
   * 获取类型
   */
  public get type(): Type<T> {
    return this.props.type;
  }

  /**
   * 获取 reducer
   */
  public get reducer(): StateReducer<T> | undefined {
    return this.props.reducer;
  }

  /**
   * 获取默认值
   */
  public getDefaultValue(): T {
    if (this.props.defaultValue) {
      return this.props.defaultValue();
    }
    return this.getTypeDefaultValue();
  }

  /**
   * 获取类型的默认值
   */
  private getTypeDefaultValue(): T {
    const type = this.props.type;
    
    if (type === String) {
      return '' as T;
    }
    if (type === Number) {
      return 0 as T;
    }
    if (type === Boolean) {
      return false as T;
    }
    if (type === Array) {
      return [] as T;
    }
    if (type === Object) {
      return {} as T;
    }
    
    return undefined as T;
  }

  /**
   * 更新值（使用 reducer）
   */
  public update(current: T, update: T): T {
    if (this.props.reducer) {
      return this.props.reducer(current, update);
    }
    
    // 默认行为：直接替换
    return update;
  }
}
```

#### StateReducer（状态 Reducer）

```typescript
// src/domain/workflow/value-objects/state/state-reducer.ts
export type StateReducer<T> = (current: T, update: T) => T;

/**
 * 内置 Reducer 工厂
 */
export class StateReducers {
  /**
   * 追加 reducer（用于数组）
   */
  public static append<T>(): StateReducer<T[]> {
    return (current: T[], update: T[]): T[] => {
      return [...current, ...update];
    };
  }

  /**
   * 覆盖 reducer（默认行为）
   */
  public static overwrite<T>(): StateReducer<T> {
    return (current: T, update: T): T => update;
  }

  /**
   * 合并 reducer（用于对象）
   */
  public static merge<T extends Record<string, any>>(): StateReducer<T> {
    return (current: T, update: T): T => {
      return { ...current, ...update };
    };
  }

  /**
   * 深度合并 reducer
   */
  public static deepMerge<T extends Record<string, any>>(): StateReducer<T> {
    return (current: T, update: T): T => {
      return deepMerge(current, update);
    };
  }

  /**
   * 累加 reducer（用于数字）
   */
  public static add(): StateReducer<number> {
    return (current: number, update: number): number => {
      return current + update;
    };
  }

  /**
   * 自定义 reducer
   */
  public static custom<T>(reducer: (current: T, update: T) => T): StateReducer<T> {
    return reducer;
  }
}
```

#### StateSchema（状态模式）

```typescript
// src/domain/workflow/value-objects/state/state-schema.ts
export interface StateSchemaProps {
  readonly annotations: Map<string, StateAnnotation>;
  readonly description?: string;
}

export class StateSchema extends ValueObject<StateSchemaProps> {
  /**
   * 创建状态模式
   */
  public static create(props: StateSchemaProps): StateSchema {
    return new StateSchema(props);
  }

  /**
   * 创建空模式
   */
  public static empty(): StateSchema {
    return new StateSchema({
      annotations: new Map()
    });
  }

  /**
   * 添加字段注解
   */
  public addAnnotation(key: string, annotation: StateAnnotation): StateSchema {
    const newAnnotations = new Map(this.props.annotations);
    newAnnotations.set(key, annotation);
    
    return new StateSchema({
      ...this.props,
      annotations: newAnnotations
    });
  }

  /**
   * 获取字段注解
   */
  public getAnnotation(key: string): StateAnnotation | undefined {
    return this.props.annotations.get(key);
  }

  /**
   * 获取所有字段键
   */
  public getKeys(): string[] {
    return Array.from(this.props.annotations.keys());
  }

  /**
   * 验证状态数据
   */
  public validate(stateData: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查必需字段
    for (const [key, annotation] of this.props.annotations.entries()) {
      if (!(key in stateData)) {
        warnings.push(`字段 '${key}' 缺失，将使用默认值`);
      }
    }

    // 检查未知字段
    for (const key in stateData) {
      if (!this.props.annotations.has(key)) {
        warnings.push(`未知字段 '${key}'`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 创建初始状态
   */
  public createInitialState(): Record<string, any> {
    const initialState: Record<string, any> = {};
    
    for (const [key, annotation] of this.props.annotations.entries()) {
      initialState[key] = annotation.getDefaultValue();
    }
    
    return initialState;
  }

  /**
   * 更新状态（使用 reducer）
   */
  public updateState(
    currentState: Record<string, any>,
    updates: Record<string, any>
  ): Record<string, any> {
    const newState = { ...currentState };
    
    for (const [key, updateValue] of Object.entries(updates)) {
      const annotation = this.props.annotations.get(key);
      
      if (annotation) {
        // 使用注解的 reducer 更新
        const currentValue = currentState[key];
        newState[key] = annotation.update(currentValue, updateValue);
      } else {
        // 没有注解，直接赋值
        newState[key] = updateValue;
      }
    }
    
    return newState;
  }
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}
```

### 2.3 使用示例

#### 示例 1：简单状态模式

```typescript
// 定义状态模式
const stateSchema = StateSchema.empty()
  .addAnnotation('messages', StateAnnotation.create({
    type: Array,
    reducer: StateReducers.append(),
    defaultValue: () => [],
    description: '消息列表'
  }))
  .addAnnotation('count', StateAnnotation.create({
    type: Number,
    reducer: StateReducers.add(),
    defaultValue: () => 0,
    description: '计数器'
  }))
  .addAnnotation('userInfo', StateAnnotation.create({
    type: Object,
    reducer: StateReducers.merge(),
    defaultValue: () => ({}),
    description: '用户信息'
  }));

// 创建初始状态
const initialState = stateSchema.createInitialState();
// {
//   messages: [],
//   count: 0,
//   userInfo: {}
// }

// 更新状态
const updatedState = stateSchema.updateState(initialState, {
  messages: [{ role: 'user', content: 'Hello' }],
  count: 1,
  userInfo: { name: 'Alice' }
});
// {
//   messages: [{ role: 'user', content: 'Hello' }],  // 追加
//   count: 1,  // 累加
//   userInfo: { name: 'Alice' }  // 合并
// }

// 再次更新
const finalState = stateSchema.updateState(updatedState, {
  messages: [{ role: 'assistant', content: 'Hi there' }],
  count: 2,
  userInfo: { age: 25 }
});
// {
//   messages: [
//     { role: 'user', content: 'Hello' },
//     { role: 'assistant', content: 'Hi there' }
//   ],  // 追加
//   count: 3,  // 累加 (1 + 2)
//   userInfo: { name: 'Alice', age: 25 }  // 合并
// }
```

#### 示例 2：LangGraph 风格的状态定义

```typescript
// 类似 LangGraph 的 Annotation.Root
const StateAnnotation = {
  Root: (schema: Record<string, StateAnnotation>) => {
    const stateSchema = StateSchema.empty();
    
    for (const [key, annotation] of Object.entries(schema)) {
      stateSchema.addAnnotation(key, annotation);
    }
    
    return stateSchema;
  },
  
  // 简单字段
  String: StateAnnotation.create({
    type: String,
    description: '字符串字段'
  }),
  
  Number: StateAnnotation.create({
    type: Number,
    description: '数字字段'
  }),
  
  Boolean: StateAnnotation.create({
    type: Boolean,
    description: '布尔字段'
  }),
  
  // 带 reducer 的字段
  Array: <T>(options?: { reducer?: StateReducer<T[]>, default?: () => T[] }) => {
    return StateAnnotation.create({
      type: Array,
      reducer: options?.reducer || StateReducers.append(),
      defaultValue: options?.default || (() => []),
      description: '数组字段'
    });
  },
  
  Object: (options?: { reducer?: StateReducer<Record<string, any>>, default?: () => Record<string, any> }) => {
    return StateAnnotation.create({
      type: Object,
      reducer: options?.reducer || StateReducers.merge(),
      defaultValue: options?.default || (() => ({})),
      description: '对象字段'
    });
  }
};

// 使用示例
const MyStateSchema = StateAnnotation.Root({
  messages: StateAnnotation.Array({
    reducer: StateReducers.append(),
    default: () => []
  }),
  
  foo: StateAnnotation.String,
  
  bar: StateAnnotation.Array({
    reducer: (a, b) => [...a, ...b],  // 自定义 reducer
    default: () => []
  }),
  
  metadata: StateAnnotation.Object({
    reducer: StateReducers.deepMerge(),
    default: () => ({})
  })
});
```

### 2.4 集成到 WorkflowState

```typescript
// src/domain/workflow/value-objects/workflow-state.ts
export interface WorkflowStateProps {
  readonly workflowId: ID;
  readonly currentNodeId?: ID;
  readonly data: Record<string, any>;
  readonly schema?: StateSchema;  // 新增：状态模式
  readonly history: ExecutionHistory[];
  readonly metadata: Record<string, any>;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

export class WorkflowState extends ValueObject<WorkflowStateProps> {
  // ... 现有代码 ...

  /**
   * 更新状态数据（使用 schema 的 reducer）
   */
  public updateData(updates: Record<string, any>): WorkflowState {
    let newData: Record<string, any>;
    
    if (this.props.schema) {
      // 使用 schema 的 reducer 更新
      newData = this.props.schema.updateState(this.props.data, updates);
    } else {
      // 回退到简单的合并
      newData = { ...this.props.data, ...updates };
    }
    
    return new WorkflowState({
      ...this.props,
      data: newData,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 获取带类型的数据
   */
  public getTypedData<T>(key: string): T | undefined {
    const value = this.props.data[key];
    
    if (this.props.schema) {
      const annotation = this.props.schema.getAnnotation(key);
      if (annotation) {
        // 类型检查和转换
        return this.convertType(value, annotation.type);
      }
    }
    
    return value;
  }

  /**
   * 类型转换（私有方法）
   */
  private convertType<T>(value: any, type: Type<T>): T {
    if (value === undefined || value === null) {
      return value;
    }
    
    if (type === String) {
      return String(value) as T;
    }
    if (type === Number) {
      return Number(value) as T;
    }
    if (type === Boolean) {
      return Boolean(value) as T;
    }
    
    return value as T;
  }
}
```

## 三、实施步骤

### 3.1 第一阶段：核心组件实现

1. **实现 StateAnnotation**
   - 创建 `src/domain/workflow/value-objects/state/state-annotation.ts`
   - 实现类型系统、默认值、reducer 支持

2. **实现 StateReducer**
   - 创建 `src/domain/workflow/value-objects/state/state-reducer.ts`
   - 实现内置 reducer 工厂

3. **实现 StateSchema**
   - 创建 `src/domain/workflow/value-objects/state/state-schema.ts`
   - 实现状态验证、初始状态创建、状态更新

### 3.2 第二阶段：集成到现有系统

1. **修改 WorkflowState**
   - 添加 `schema` 字段
   - 实现 `updateData` 方法
   - 实现类型安全的 `getTypedData` 方法

2. **更新 StateManager**
   - 支持 schema 的初始化
   - 使用新的 `updateData` 方法

3. **更新 WorkflowEngine**
   - 在创建工作流时传入 schema
   - 使用类型安全的状态更新

### 3.3 第三阶段：测试和验证

1. **单元测试**
   - 测试 StateAnnotation 的类型转换
   - 测试 StateReducer 的各种场景
   - 测试 StateSchema 的验证和更新

2. **集成测试**
   - 测试完整的状态管理流程
   - 测试与 WorkflowEngine 的集成
   - 测试类型安全性

## 四、预期收益

1. **类型安全性提升**：通过 StateAnnotation 实现编译时类型检查
2. **可组合性增强**：支持复杂的状态结构和字段级更新策略
3. **开发体验改善**：类似 LangGraph 的直观 API
4. **可维护性提高**：清晰的状态模式定义，易于理解和维护
5. **扩展性增强**：支持自定义 reducer 和类型

## 五、与现有系统的兼容性

### 5.1 向后兼容

- 保持 `WorkflowState` 的现有接口不变
- `schema` 字段是可选的，不影响现有代码
- 提供回退机制，无 schema 时使用简单合并

### 5.2 迁移策略

1. **渐进式迁移**：新功能使用 schema，旧功能保持兼容
2. **代码生成**：提供工具从现有状态生成 schema
3. **文档更新**：更新 API 文档，推荐使用新机制

## 六、参考实现

### 6.1 LangGraph 参考

```typescript
// LangGraph 的 Annotation 机制
const StateAnnotation = Annotation.Root({
  messages: Annotation({
    default: () => [],
    reducer: (a, b) => [...a, ...b]
  }),
  
  foo: Annotation<string>,
  bar: Annotation<number>
});
```

### 6.2 本项目实现

```typescript
// 本项目的等效实现
const StateAnnotation = {
  Root: (schema) => StateSchema.create({ annotations: new Map(Object.entries(schema)) }),
  
  String: StateAnnotation.create({ type: String }),
  Number: StateAnnotation.create({ type: Number }),
  
  create: (options) => StateAnnotation.create(options)
};
```

## 七、下一步计划

1. 实现 StateAnnotation、StateReducer、StateSchema
2. 集成到 WorkflowState 和 StateManager
3. 编写单元测试和集成测试
4. 更新文档和示例
5. 评估性能影响并优化
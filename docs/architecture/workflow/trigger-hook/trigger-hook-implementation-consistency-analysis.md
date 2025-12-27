# Trigger/Hook 实现与 VO 定义一致性分析

## 当前实现现状

### 1. Trigger 的双重实现

#### 实现方式 A：管理器模式
```
DefaultTriggerManager
    ↓ 管理
BaseTrigger 子类 (TimeTrigger, EventTrigger, ConditionTrigger, ManualTrigger)
    ↓ 执行
实例的 checkCondition() 和 onTrigger() 方法
```

**特点**：
- 维护实例状态（ACTIVE, PAUSED, DISABLED, ERROR）
- 复杂的生命周期管理（activate/deactivate/pause/resume/disable/enable）
- 批量操作支持
- 统计信息收集

#### 实现方式 B：函数式模式
```
ValueObjectExecutor
    ↓ 执行
TriggerFunction 子类 (TimeTriggerFunction, EventTriggerFunction, etc.)
    ↓ 返回
boolean (是否应该触发)
```

**特点**：
- 无状态，纯函数
- 配置驱动
- 与 Edge/Node 保持一致
- 易于测试

### 2. Hook 的当前实现

```
HookExecutionManager
    ↓ 管理
BaseHook 子类
    ↓ 执行
实例的 execute() 方法
```

**特点**：
- 有状态（enabled, priority）
- 简单的生命周期管理
- 按 HookPoint 分组管理

## VO 定义分析

### TriggerValueObject 定义

```typescript
export interface TriggerValueObjectProps {
  readonly id: ID;
  readonly type: TriggerType;           // TIME, EVENT, STATE
  readonly name: string;
  readonly description?: string;
  readonly config: TriggerConfig;       // 触发条件配置
  readonly action: TriggerAction;       // START, STOP, PAUSE, RESUME, SKIP_NODE
  readonly targetNodeId?: ID;           // 目标节点（用于 SKIP_NODE）
  readonly status: TriggerStatus;       // ENABLED, DISABLED, TRIGGERED
  readonly triggeredAt?: number;
}
```

**关键属性分析**：
- `action` - 触发后执行的动作（工作流级别）
- `status` - 触发器状态（需要状态管理）
- `triggeredAt` - 上次触发时间（需要持久化）
- `targetNodeId` - 可选的目标节点

**语义**：
- Trigger 是**全局的**，可以触发工作流级别的动作
- Trigger 需要**状态管理**（status, triggeredAt）
- Trigger 可以**多次触发**（不是一次性）

### HookValueObject 定义

```typescript
export interface HookValueObjectProps {
  readonly id: ID;
  readonly hookPoint: HookPointValue;   // BEFORE_EXECUTE, AFTER_EXECUTE, etc.
  readonly name: string;
  readonly description?: string;
  readonly enabled: boolean;
  readonly priority: number;
  readonly config: HookConfig;
  readonly metadata: Record<string, unknown>;
}
```

**关键属性分析**：
- `hookPoint` - 执行时机点（嵌入执行过程）
- `enabled` - 是否启用（简单开关）
- `priority` - 执行优先级
- `config` - 配置参数

**语义**：
- Hook 是**局部的**，嵌入在执行过程的特定阶段
- Hook 是**无状态的**（没有状态管理属性）
- Hook 是**轻量级的**（每次执行时调用）

## 一致性问题分析

### 问题 1：Trigger 的双重实现不一致

**现状**：
- 管理器模式：`DefaultTriggerManager` + `BaseTrigger` 子类
- 函数式模式：`TimeTriggerFunction` 等

**问题**：
1. 两套实现并存，造成混乱
2. `ValueObjectExecutor` 已经支持 `TriggerValueObject`，但未被充分利用
3. 与 Edge/Node 的设计模式不一致

### 问题 2：Trigger 的定位不明确

**VO 定义的语义**：
- Trigger 是全局的，可以触发工作流级别的动作
- Trigger 需要状态管理（status, triggeredAt）

**当前实现的问题**：
1. 管理器模式提供了状态管理，但与函数式实现冲突
2. 没有明确区分"状态管理"和"触发逻辑判断"
3. 缺少统一的执行入口

### 问题 3：Hook 的实现过于复杂

**VO 定义的语义**：
- Hook 是局部的，嵌入在执行过程的特定阶段
- Hook 是无状态的

**当前实现的问题**：
1. `HookExecutionManager` 提供了不必要的状态管理
2. 应该是简单的函数式调用
3. 与 Edge/Node 的设计模式不一致

## 重构建议

### 方案 1：Trigger 采用混合设计（推荐）

**设计思路**：
```
TriggerManager (状态管理)
    ↓ 调用
TriggerExecutor (执行器)
    ↓ 使用
ValueObjectExecutor
    ↓ 执行
TriggerFunction (函数式逻辑)
```

**职责分离**：
- `TriggerManager` - 负责状态管理（激活/停用/暂停/恢复）
- `TriggerExecutor` - 负责执行触发逻辑
- `TriggerFunction` - 负责触发条件判断（纯函数）

**优势**：
1. 符合 VO 定义的语义（全局的、有状态的）
2. 保留状态管理能力
3. 使用函数式逻辑，易于测试
4. 与 Edge/Node 保持一致的执行模式

**实施步骤**：
1. 保留 `TriggerManager` 用于状态管理
2. 创建 `TriggerExecutor` 使用 `ValueObjectExecutor`
3. 删除 `BaseTrigger` 子类
4. 保留并完善 `TriggerFunction` 实现
5. 管理器调用执行器来判断是否触发

### 方案 2：Hook 采用函数式设计（推荐）

**设计思路**：
```
HookExecutor (执行器)
    ↓ 使用
ValueObjectExecutor
    ↓ 执行
HookFunction (函数式逻辑)
```

**职责分离**：
- `HookExecutor` - 负责在指定 hookPoint 执行钩子
- `HookFunction` - 负责钩子逻辑（纯函数）

**优势**：
1. 符合 VO 定义的语义（局部的、无状态的）
2. 简化实现，删除不必要的状态管理
3. 与 Edge/Node 保持一致的执行模式
4. 易于测试和维护

**实施步骤**：
1. 创建 `HookExecutor` 使用 `ValueObjectExecutor`
2. 删除 `HookExecutionManager`
3. 创建 `HookFunction` 实现
4. 在执行引擎的指定 hookPoint 调用 `HookExecutor`

### 方案 3：统一执行上下文

**设计思路**：
```typescript
// 统一的执行上下文
interface FunctionExecutionContext {
  workflowId: string;
  executionId: string;
  variables: Map<string, any>;
  getVariable(key: string): any;
  setVariable(key: string, value: any): void;
  getNodeResult(nodeId: string): any;
  setNodeResult(nodeId: string, result: any): void;
  // Hook 特有
  hookPoint?: HookPoint;
  // Trigger 特有
  triggerHistory?: TriggerHistory[];
}
```

**优势**：
1. 统一的执行上下文
2. 支持不同组件的特定需求
3. 提高代码复用性

## 架构对比

### 当前架构

```
Trigger:
  DefaultTriggerManager → BaseTrigger 子类
  ValueObjectExecutor → TriggerFunction (未充分利用)

Hook:
  HookExecutionManager → BaseHook 子类
  ValueObjectExecutor → HookFunction (未充分利用)
```

### 推荐架构

```
Trigger:
  TriggerManager (状态管理)
    ↓
  TriggerExecutor (执行器)
    ↓
  ValueObjectExecutor
    ↓
  TriggerFunction (函数式逻辑)

Hook:
  HookExecutor (执行器)
    ↓
  ValueObjectExecutor
    ↓
  HookFunction (函数式逻辑)
```

## 实施优先级

### 高优先级
1. ✅ 创建 `TriggerExecutor` 使用 `ValueObjectExecutor`
2. ✅ 创建 `HookExecutor` 使用 `ValueObjectExecutor`
3. ✅ 完善 `TriggerFunction` 和 `HookFunction` 实现
4. ✅ 更新 `ValueObjectExecutor` 的映射配置

### 中优先级
1. ⚠️ 重构 `TriggerManager`，明确职责分离
2. ⚠️ 删除 `HookExecutionManager`
3. ⚠️ 删除 `BaseTrigger` 和 `BaseHook` 子类
4. ⚠️ 更新执行引擎调用方式

### 低优先级
1. 📝 统一执行上下文
2. 📝 完善文档和示例
3. 📝 添加单元测试

## 总结

### 核心问题
1. Trigger 存在双重实现，造成混乱
2. Trigger 的定位不明确（全局 vs 局部）
3. Hook 的实现过于复杂（不必要的状态管理）

### 推荐方案
1. **Trigger**：采用混合设计，分离状态管理和触发逻辑
2. **Hook**：采用函数式设计，简化实现
3. **统一**：使用 `ValueObjectExecutor` 作为统一执行引擎

### 预期收益
1. ✅ 符合 VO 定义的语义
2. ✅ 与 Edge/Node 保持一致的设计模式
3. ✅ 提高代码可维护性和可测试性
4. ✅ 简化架构，降低复杂度
# 统一条件评估器设计（简化版）

## 概述

本文档描述为SDK实现统一条件评估器的设计方案，解决当前条件评估逻辑分散、代码重复等问题。设计原则是保持简单，专注于核心条件评估功能，复杂的业务逻辑应由应用层通过工作流设计来解决。

## 背景分析

### 当前条件评估现状

#### 1. Router类中的条件评估

Router类（sdk/core/execution/router.ts）实现了以下功能：

- **evaluateCondition方法**：评估边的条件，支持13种条件类型
- **getVariableValue方法**：获取变量值，支持嵌套路径访问
- **evaluateCustomExpression方法**：评估自定义表达式，支持{{variableName}}语法

**特点**：
- 支持多种条件类型（EQUALS、GREATER_THAN、CUSTOM等）
- 使用Function构造函数和with语句评估表达式
- 变量访问路径支持点号和数组索引语法

**问题**：
- 代码耦合：条件评估逻辑与路由逻辑耦合在一起
- 难以复用：其他模块（如LoopNodeExecutor）无法复用这些逻辑
- 安全性：使用Function构造函数存在安全隐患

#### 2. LoopEndNodeExecutor中的条件评估

LoopEndNodeExecutor类实现了以下功能：

- **evaluateBreakCondition方法**：评估循环中断条件
- **resolveVariableReferences方法**：解析变量引用
- 使用Function构造函数评估表达式

**特点**：
- 与Router的实现类似，但是独立的
- 支持变量引用解析

**问题**：
- 代码重复：与Router的实现高度重复
- 维护困难：修改条件评估逻辑需要同时修改多个地方

### 问题总结

1. **代码重复**：条件评估逻辑在多个地方重复实现
2. **维护困难**：修改条件评估逻辑需要同时修改多个地方
3. **缺乏统一接口**：没有统一的条件评估接口，难以扩展

## 设计原则

1. **简单优先**：只提供基本的条件评估功能，不追求复杂特性
2. **类型限制**：仅支持基本类型（数值、字符串、布尔值、数组），不支持对象传入
3. **职责清晰**：SDK负责条件评估，复杂业务逻辑由应用层通过工作流设计解决
4. **内部使用**：评估接口仅用于内部条件评估，不泄漏到全局状态
5. **事件驱动**：全局状态依然由event控制，条件评估器不直接修改全局状态

## 核心设计

### 1. 条件评估接口

#### ConditionEvaluator接口

定义统一的条件评估接口，包含以下方法：

- **evaluate**：评估条件，返回布尔值
- **getVariableValue**：获取变量值（仅支持基本类型）

#### 评估上下文

定义EvaluationContext接口，包含评估所需的基本上下文信息：

- **variables**：变量值映射（仅支持基本类型：number、string、boolean、数组）
- **input**：输入数据（仅支持基本类型）
- **output**：输出数据（仅支持基本类型）

### 2. 支持的条件类型

#### 基础条件类型

复用现有的ConditionType枚举，包括：

- EQUALS：等于
- NOT_EQUALS：不等于
- GREATER_THAN：大于
- LESS_THAN：小于
- GREATER_EQUAL：大于等于
- LESS_EQUAL：小于等于
- CONTAINS：包含（字符串）
- IN：在数组中
- NOT_IN：不在数组中
- IS_NULL：为空
- IS_NOT_NULL：不为空
- IS_TRUE：为真
- IS_FALSE：为假

#### 简化的表达式类型

- **EXPRESSION**：简单的布尔表达式，仅支持基本运算符（==、!=、>、<、>=、<=、&&、||、!）

### 3. 条件评估器实现

#### ConditionEvaluator类

实现ConditionEvaluator接口，提供以下功能：

1. **变量访问**：支持简单的变量名访问（不支持嵌套路径）
2. **条件评估**：支持所有基础条件类型的评估
3. **表达式评估**：支持简单的布尔表达式评估

#### 简化的表达式语法

表达式仅支持以下特性：

- 基本运算符：==、!=、>、<、>=、<=、&&、||、!
- 变量引用：直接使用变量名（如：score、threshold）
- 字面量：数字、字符串、布尔值
- 括号：用于分组

不支持：
- 嵌套对象访问（如：user.profile.age）
- 数组索引访问（如：items[0]）
- 函数调用
- 复杂表达式

### 4. 变量访问机制

#### 变量访问规则

- 仅支持简单的变量名访问
- 变量名必须是有效的JavaScript标识符
- 变量值必须是基本类型（number、string、boolean、数组）
- 不支持嵌套路径和对象访问

#### 变量作用域

定义清晰的变量访问优先级：

1. **variables**：工作流变量（最高优先级）
2. **input**：输入数据
3. **output**：输出数据

## 实现方案

### Types层修改

#### 创建sdk/types/condition.ts

定义条件评估相关的类型：

- ConditionType枚举（保持现有类型）
- Condition接口
- EvaluationContext接口
- ConditionEvaluator接口

### Core层修改

#### 创建sdk/core/execution/condition-evaluator.ts

实现ConditionEvaluator类：

1. 实现ConditionEvaluator接口
2. 实现简单的变量访问逻辑
3. 实现基础条件类型的评估
4. 实现简单的表达式评估

#### 修改sdk/core/execution/router.ts

重构Router类，使用ConditionEvaluator：

1. 移除evaluateCondition方法
2. 移除getVariableValue方法
3. 移除evaluateCustomExpression方法
4. 注入ConditionEvaluator实例
5. 使用ConditionEvaluator评估条件

#### 修改sdk/core/execution/executors/node/loop-end-node-executor.ts

重构LoopEndNodeExecutor，使用ConditionEvaluator：

1. 移除evaluateBreakCondition方法
2. 移除resolveVariableReferences方法
3. 注入ConditionEvaluator实例
4. 使用ConditionEvaluator评估条件

## 使用场景示例

### 场景1：Router使用统一评估器

```typescript
// Router类中使用ConditionEvaluator
class Router {
  constructor(private conditionEvaluator: ConditionEvaluator) {}

  evaluateEdgeCondition(edge: Edge, thread: Thread): boolean {
    const context = this.buildEvaluationContext(thread);
    return this.conditionEvaluator.evaluate(edge.condition, context);
  }

  private buildEvaluationContext(thread: Thread): EvaluationContext {
    return {
      variables: thread.variableValues,
      input: thread.input,
      output: thread.output
    };
  }
}
```

### 场景2：LoopNodeExecutor使用统一评估器

```typescript
// LoopEndNodeExecutor类中使用ConditionEvaluator
class LoopEndNodeExecutor extends NodeExecutor {
  constructor(
    private conditionEvaluator: ConditionEvaluator
  ) {}

  private shouldBreak(thread: Thread, breakCondition: string): boolean {
    const context = this.buildEvaluationContext(thread);
    return this.conditionEvaluator.evaluate(
      { type: ConditionType.EXPRESSION, expression: breakCondition },
      context
    );
  }

  private buildEvaluationContext(thread: Thread): EvaluationContext {
    return {
      variables: thread.variableValues,
      input: thread.input,
      output: thread.output
    };
  }
}
```

### 场景3：Hook使用统一评估器

```typescript
// HookExecutor类中使用ConditionEvaluator
class HookExecutor {
  constructor(private conditionEvaluator: ConditionEvaluator) {}

  async executeHook(hook: NodeHook, context: EvaluationContext): Promise<void> {
    if (hook.condition) {
      const shouldTrigger = this.conditionEvaluator.evaluate(
        hook.condition,
        context
      );
      if (!shouldTrigger) {
        return;
      }
    }
    // 触发事件
  }
}
```

## 技术考虑

### 安全性

1. **类型限制**：仅支持基本类型，避免对象操作
2. **表达式限制**：仅支持简单的布尔表达式
3. **错误处理**：评估失败返回false，不影响主流程

### 性能

1. **简单实现**：直接使用JavaScript表达式求值
2. **无缓存**：不实现表达式缓存，保持简单
3. **即时评估**：每次评估都即时执行

### 可扩展性

1. **条件类型扩展**：支持添加新的条件类型
2. **评估函数扩展**：支持注册自定义评估函数
3. **配置化**：支持通过配置调整行为

## 与现有系统的集成

### 与EventManager的集成

- ConditionEvaluator不直接触发事件
- ConditionEvaluator仅用于条件评估
- 事件触发由调用方（如HookExecutor、TriggerManager）负责
- 保持事件驱动架构不变

### 与ThreadExecutor的集成

- ThreadExecutor创建ConditionEvaluator实例
- ThreadExecutor将ConditionEvaluator传递给需要的组件
- ConditionEvaluator不修改Thread状态
- 保持ThreadExecutor的控制权

### 与NodeExecutor的集成

- BaseNodeExecutor提供ConditionEvaluator访问接口
- 子类NodeExecutor可以使用ConditionEvaluator评估条件
- ConditionEvaluator不影响节点执行流程
- 保持NodeExecutor的独立性

## 实施步骤

1. 定义类型和接口（Types层）
2. 实现条件评估器（Core层）
3. 重构Router使用统一评估器（Core层）
4. 重构LoopNodeExecutor使用统一评估器（Core层）
5. 为HookExecutor添加条件评估支持（Core层）
6. 编写单元测试
7. 编写集成测试
8. 更新文档

## 设计权衡

### 简单性 vs 功能性

**选择简单性**：
- 不实现复杂的表达式解析
- 不支持嵌套对象访问
- 不支持函数调用

**理由**：
- SDK应该保持简单，专注于核心功能
- 复杂的业务逻辑应由应用层通过工作流设计解决
- 简单的实现更容易维护和测试

### 性能 vs 复杂度

**选择简单实现**：
- 不实现表达式预编译和缓存
- 每次评估都即时执行

**理由**：
- 条件评估不是性能瓶颈
- 简单的实现更容易理解和维护
- 如果未来需要优化，可以再添加缓存机制

### 安全性 vs 灵活性

**选择类型限制**：
- 仅支持基本类型
- 不支持对象传入

**理由**：
- 类型限制可以避免复杂的安全问题
- 基本类型已经满足大多数场景
- 复杂的场景应由应用层处理

## 总结

统一条件评估器设计（简化版）解决了当前SDK中条件评估逻辑分散、代码重复等问题。通过提供统一的接口和实现，提高了代码复用性和可维护性。该设计遵循简单优先的原则，专注于核心条件评估功能，不追求复杂特性。复杂的业务逻辑应由应用层通过工作流设计来解决，而非强化组件功能来实现。

该设计遵循SDK的分层架构原则，与现有系统无缝集成，不影响事件驱动架构和全局状态管理。
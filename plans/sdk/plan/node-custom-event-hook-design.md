# 节点自定义事件Hook机制设计

## 概述

本文档描述为SDK节点添加自定义事件Hook机制的设计方案，使节点能够根据条件评估逻辑生成自定义事件，并由TriggerManager处理这些事件。

## 背景分析

### 当前事件系统现状

当前SDK模块的事件系统由EventManager管理，支持以下功能：

1. **全局事件**：对外暴露，用户可监听（如THREAD_STARTED、NODE_COMPLETED）
2. **内部事件**：模块内部协调，不对外暴露（如FORK_REQUEST、JOIN_COMPLETED）
3. **事件类型**：已定义13种标准事件类型，包括线程生命周期事件和节点生命周期事件

### 当前节点执行流程

节点执行流程如下：

1. ThreadExecutor调用executeNode方法
2. 触发NODE_STARTED事件
3. NodeExecutor执行节点逻辑
4. 触发NODE_COMPLETED或NODE_FAILED事件
5. 返回执行结果

### TriggerManager集成现状

TriggerManager已经与EventManager集成，能够监听事件并执行触发动作。当前支持的触发动作包括：
- 启动工作流
- 停止线程
- 暂停线程
- 恢复线程
- 跳过节点
- 设置变量
- 发送通知
- 自定义动作

### 问题识别

当前系统存在以下限制：

1. **节点无法生成自定义事件**：节点只能触发预定义的标准事件（NODE_STARTED、NODE_COMPLETED、NODE_FAILED）
2. **缺乏条件评估机制**：节点无法根据执行结果或变量状态动态生成事件
3. **事件类型固定**：无法扩展新的事件类型来满足特定业务需求
4. **Hook机制缺失**：节点没有在执行前后插入自定义逻辑的扩展点

## 设计目标

1. **扩展性**：支持节点定义自定义事件类型和触发条件
2. **灵活性**：允许节点根据执行结果、变量状态等条件动态生成事件
3. **兼容性**：不影响现有节点执行逻辑和事件系统
4. **可维护性**：保持代码结构清晰，遵循SDK分层架构原则

## 核心设计

### 1. 节点自定义事件类型

#### 事件类型扩展

在EventType枚举中添加新的事件类型：

- NODE_CUSTOM_EVENT：节点自定义事件，用于节点触发的业务特定事件

#### 自定义事件结构

定义NodeCustomEvent接口，包含以下字段：

- type：固定为NODE_CUSTOM_EVENT
- timestamp：事件时间戳
- workflowId：工作流ID
- threadId：线程ID
- nodeId：节点ID
- nodeType：节点类型
- eventName：自定义事件名称（由节点定义）
- eventData：事件数据（包含节点执行结果、变量状态等）
- metadata：可选的元数据

### 2. 节点Hook配置

#### Hook定义

在Node接口中添加可选的hooks字段，类型为NodeHook[]。

#### Hook结构

NodeHook接口包含以下字段：

- hookName：Hook名称，用于标识和调试
- hookType：Hook类型（BEFORE_EXECUTE、AFTER_EXECUTE、ON_CONDITION）
- condition：触发条件表达式（可选）
- eventName：要触发的自定义事件名称
- eventPayload：事件载荷生成逻辑（可选）
- enabled：是否启用（默认true）
- weight：权重（数字越大优先级越高）

#### Hook类型

定义HookType枚举：

- BEFORE_EXECUTE：节点执行前触发
- AFTER_EXECUTE：节点执行后触发
- ON_CONDITION：满足条件时触发

### 3. Hook执行引擎

#### Hook执行器职责

创建HookExecutor类，负责：

1. 管理节点的Hook配置
2. 在适当的时机执行Hook
3. 评估Hook触发条件
4. 生成并触发自定义事件

#### 执行时机

Hook执行时机如下：

- BEFORE_EXECUTE：在NodeExecutor.execute方法中，调用doExecute之前
- AFTER_EXECUTE：在NodeExecutor.execute方法中，调用doExecute之后
- ON_CONDITION：在节点执行过程中，根据条件评估结果触发

#### 条件评估逻辑

条件评估需要支持：

1. **变量访问**：能够访问Thread中的变量值
2. **执行结果访问**：能够访问节点的执行结果
3. **表达式求值**：支持布尔表达式、比较表达式等
4. **错误处理**：条件评估失败不应影响节点正常执行

### 4. 事件生成逻辑

#### 事件载荷生成

事件载荷可以包含：

1. 节点执行结果（output、status、executionTime等）
2. 当前变量状态（variableValues）
3. 节点配置信息（config）
4. 自定义数据（由Hook配置指定）

#### 事件触发流程

1. Hook执行器评估触发条件
2. 如果条件满足，生成事件载荷
3. 通过EventManager触发NODE_CUSTOM_EVENT事件
4. TriggerManager监听并处理该事件

### 5. TriggerManager集成

#### 触发器注册

TriggerManager需要支持监听NODE_CUSTOM_EVENT事件类型。

#### 事件匹配

在handleEvent方法中，除了匹配eventType，还需要匹配eventName字段，确保触发器只响应特定的自定义事件。

#### 动作执行

触发器执行时，可以访问事件中的eventData，根据事件数据执行相应的动作。

## 实现方案

### Types层修改

#### 修改sdk/types/events.ts

1. 在EventType枚举中添加NODE_CUSTOM_EVENT
2. 定义NodeCustomEvent接口
3. 更新Event联合类型，包含NodeCustomEvent

#### 修改sdk/types/node.ts

1. 定义NodeHook接口
2. 定义HookType枚举
3. 在Node接口中添加可选的hooks字段

### Core层修改

#### 创建sdk/core/execution/hook-executor.ts

1. 实现HookExecutor类
2. 实现条件评估逻辑
3. 实现事件生成逻辑
4. 实现Hook执行调度逻辑

#### 修改sdk/core/execution/executors/node/base-node-executor.ts

1. 在execute方法中集成HookExecutor
2. 在doExecute前后调用相应的Hook
3. 传递必要的上下文信息给HookExecutor

#### 修改sdk/core/execution/thread-executor.ts

1. 在executeNode方法中传递EventManager给NodeExecutor
2. 确保自定义事件能够正确触发

#### 修改sdk/core/execution/trigger-manager.ts

1. 更新handleEvent方法，支持eventName匹配
2. 确保自定义事件能够正确触发相应的动作

### Utils层修改

#### 创建sdk/utils/condition-evaluator.ts

1. 实现条件表达式解析
2. 实现变量访问逻辑
3. 实现表达式求值逻辑

## 使用场景示例

### 场景1：节点执行成功后触发通知

节点配置：

```json
{
  "hooks": [
    {
      "hookName": "success-notification",
      "hookType": "AFTER_EXECUTE",
      "condition": "status === 'COMPLETED'",
      "eventName": "node-success",
      "eventPayload": {
        "message": "节点执行成功",
        "output": "{{output}}"
      }
    }
  ]
}
```

触发器配置：

```json
{
  "condition": {
    "eventType": "NODE_CUSTOM_EVENT",
    "eventName": "node-success"
  },
  "action": {
    "type": "SEND_NOTIFICATION",
    "parameters": {
      "message": "{{eventData.message}}"
    }
  }
}
```

### 场景2：变量值达到阈值时触发警告

节点配置：

```json
{
  "hooks": [
    {
      "hookName": "threshold-warning",
      "hookType": "ON_CONDITION",
      "condition": "variableValues.temperature > 100",
      "eventName": "temperature-warning",
      "eventPayload": {
        "temperature": "{{variableValues.temperature}}",
        "threshold": 100
      }
    }
  ]
}
```

### 场景3：节点执行失败时自动重试

节点配置：

```json
{
  "hooks": [
    {
      "hookName": "failure-retry",
      "hookType": "AFTER_EXECUTE",
      "condition": "status === 'FAILED'",
      "eventName": "node-failure",
      "eventPayload": {
        "error": "{{error}}",
        "retryCount": "{{metadata.retryCount}}"
      }
    }
  ]
}
```

触发器配置：

```json
{
  "condition": {
    "eventType": "NODE_CUSTOM_EVENT",
    "eventName": "node-failure"
  },
  "action": {
    "type": "CUSTOM",
    "parameters": {
      "handler": "retry-handler",
      "maxRetries": 3
    }
  }
}
```

## 技术考虑

### 性能考虑

1. **条件评估优化**：条件表达式应该预编译，避免每次执行都解析
2. **Hook执行顺序**：按照优先级排序，确保高优先级Hook先执行
3. **事件触发异步化**：事件触发不应阻塞节点执行

### 错误处理

1. **Hook执行失败**：不应影响节点正常执行，记录错误日志
2. **条件评估失败**：默认不触发事件，记录警告日志
3. **事件触发失败**：不应影响节点执行结果

### 安全性

1. **表达式沙箱**：条件表达式应该在受限环境中执行，防止恶意代码
2. **变量访问控制**：限制Hook能够访问的变量范围
3. **事件数据过滤**：敏感数据不应包含在事件载荷中

### 向后兼容

1. **可选字段**：hooks字段是可选的，不影响现有节点配置
2. **默认行为**：没有Hook的节点行为与之前完全一致
3. **渐进式迁移**：可以逐步为节点添加Hook，不需要一次性修改所有节点

## 测试策略

### 单元测试

1. **HookExecutor测试**：测试Hook执行、条件评估、事件生成
2. **条件评估器测试**：测试各种表达式求值逻辑
3. **NodeExecutor测试**：测试Hook集成后的节点执行流程

### 集成测试

1. **端到端测试**：测试从节点执行到触发器执行的完整流程
2. **多Hook测试**：测试多个Hook的执行顺序和优先级
3. **错误场景测试**：测试Hook执行失败、条件评估失败等场景

### 性能测试

1. **Hook执行性能**：测试Hook执行对节点执行时间的影响
2. **条件评估性能**：测试复杂条件表达式的评估性能
3. **事件触发性能**：测试大量事件触发的性能

## 实施步骤

1. 定义类型和接口（Types层）
2. 实现条件评估器（Utils层）
3. 实现Hook执行器（Core层）
4. 集成到NodeExecutor（Core层）
5. 更新TriggerManager（Core层）
6. 编写单元测试
7. 编写集成测试
8. 更新文档

## 总结

节点自定义事件Hook机制为SDK提供了强大的扩展能力，使节点能够根据业务需求动态生成事件，并与TriggerManager无缝集成。该设计保持了SDK的分层架构原则，具有良好的扩展性、灵活性和向后兼容性。
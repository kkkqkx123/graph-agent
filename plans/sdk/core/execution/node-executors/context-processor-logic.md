# ContextProcessorNodeExecutor执行逻辑

## 概述
ContextProcessorNodeExecutor负责执行CONTEXT_PROCESSOR节点，处理消息上下文，支持多种处理策略。

## 核心职责
1. 验证上下文处理器配置
2. 获取当前上下文
3. 根据处理策略处理上下文
4. 更新上下文
5. 返回执行结果

## doExecute方法执行逻辑

### 步骤1：获取上下文处理器配置
- 从节点配置获取contextProcessorType
- 从节点配置获取contextProcessorConfig

### 步骤2：验证上下文处理器配置
- 检查contextProcessorType是否存在且不为空
- 检查contextProcessorType是否合法（PASS_THROUGH、FILTER_IN、FILTER_OUT、TRANSFORM、ISOLATE、MERGE）
- 检查contextProcessorConfig是否存在且不为空
- 如果配置不合法，抛出ValidationError

### 步骤3：获取当前上下文
- 从Thread的variables获取当前上下文
- 如果上下文不存在，初始化为空数组

### 步骤4：根据处理策略处理上下文

#### PASS_THROUGH策略
- 直接传递上下文
- 不做任何修改

#### FILTER_IN策略
- 获取filterCondition
- 解析filterCondition中的变量引用
- 评估filterCondition
- 过滤保留满足条件的消息

#### FILTER_OUT策略
- 获取filterCondition
- 解析filterCondition中的变量引用
- 评估filterCondition
- 过滤排除满足条件的消息

#### TRANSFORM策略
- 获取transformExpression
- 解析transformExpression中的变量引用
- 对每个消息应用转换表达式
- 返回转换后的上下文

#### ISOLATE策略
- 隔离上下文
- 创建新的上下文副本
- 不影响原始上下文

#### MERGE策略
- 获取mergeStrategy
- 根据mergeStrategy合并上下文
- 支持多种合并策略

### 步骤5：更新上下文
- 将处理后的上下文更新到Thread的variables
- 设置变量名为"context"

### 步骤6：记录执行历史
- 创建ExecutionHistory记录
- 设置nodeId为CONTEXT_PROCESSOR节点ID
- 设置timestamp为当前时间戳
- 设置action为"context-processor"
- 设置details为{contextProcessorType, inputContext, outputContext}
- 添加到Thread的executionHistory

### 步骤7：返回执行结果
- 创建NodeExecutionResult
- 设置nodeId为CONTEXT_PROCESSOR节点ID
- 设置success为true
- 设置output为{context: 处理后的上下文}
- 设置executionTime为执行时间
- 设置metadata为节点元数据
- 返回NodeExecutionResult

## validate方法执行逻辑

### 步骤1：验证节点类型
- 检查节点类型是否为CONTEXT_PROCESSOR
- 如果不是，抛出ValidationError

### 步骤2：验证上下文处理器配置
- 检查contextProcessorType是否存在且不为空
- 检查contextProcessorType是否合法
- 检查contextProcessorConfig是否存在且不为空
- 如果配置不合法，抛出ValidationError

### 步骤3：返回验证结果
- 返回true

## canExecute方法执行逻辑

### 步骤1：检查Thread状态
- 检查Thread状态是否为RUNNING
- 如果不是，返回false

### 步骤2：检查上下文是否存在
- 从Thread的variables获取当前上下文
- 如果上下文不存在，初始化为空数组

### 步骤3：返回执行结果
- 返回true

## PASS_THROUGH策略逻辑

### 步骤1：获取上下文
- 从Thread的variables获取当前上下文

### 步骤2：直接返回
- 不做任何修改
- 直接返回上下文

## FILTER_IN策略逻辑

### 步骤1：获取过滤条件
- 从contextProcessorConfig获取filterCondition

### 步骤2：解析过滤条件
- 解析filterCondition中的变量引用
- 替换为实际值

### 步骤3：过滤消息
- 遍历上下文中的所有消息
- 对每个消息评估filterCondition
- 保留满足条件的消息

### 步骤4：返回过滤后的上下文
- 返回过滤后的上下文

## FILTER_OUT策略逻辑

### 步骤1：获取过滤条件
- 从contextProcessorConfig获取filterCondition

### 步骤2：解析过滤条件
- 解析filterCondition中的变量引用
- 替换为实际值

### 步骤3：过滤消息
- 遍历上下文中的所有消息
- 对每个消息评估filterCondition
- 排除满足条件的消息

### 步骤4：返回过滤后的上下文
- 返回过滤后的上下文

## TRANSFORM策略逻辑

### 步骤1：获取转换表达式
- 从contextProcessorConfig获取transformExpression

### 步骤2：解析转换表达式
- 解析transformExpression中的变量引用
- 替换为实际值

### 步骤3：转换消息
- 遍历上下文中的所有消息
- 对每个消息应用转换表达式
- 生成转换后的消息

### 步骤4：返回转换后的上下文
- 返回转换后的上下文

## ISOLATE策略逻辑

### 步骤1：获取上下文
- 从Thread的variables获取当前上下文

### 步骤2：创建副本
- 深拷贝上下文
- 创建新的上下文副本

### 步骤3：返回副本
- 返回上下文副本

## MERGE策略逻辑

### 步骤1：获取合并策略
- 从contextProcessorConfig获取mergeStrategy

### 步骤2：根据策略合并
- 如果mergeStrategy为APPEND：
  - 将新消息追加到上下文
- 如果mergeStrategy为PREPEND：
  - 将新消息插入到上下文开头
- 如果mergeStrategy为REPLACE：
  - 替换整个上下文
- 如果mergeStrategy为MERGE：
  - 合并多个上下文

### 步骤3：返回合并后的上下文
- 返回合并后的上下文

## 错误处理逻辑

### 上下文处理器配置错误
- 如果contextProcessorType或contextProcessorConfig缺失，抛出ValidationError
- 错误消息："Context processor node must have contextProcessorType and contextProcessorConfig"

### 上下文处理器类型错误
- 如果contextProcessorType不合法，抛出ValidationError
- 错误消息："Invalid context processor type: {contextProcessorType}"

### 变量不存在错误
- 如果条件表达式引用的变量不存在，抛出ValidationError
- 错误消息："Variable not found: {variableName}"

### 上下文处理错误
- 如果上下文处理失败，抛出ExecutionError
- 错误消息："Context processing failed: {error}"

## 注意事项

1. **配置验证**：严格验证上下文处理器配置
2. **策略实现**：正确实现各种处理策略
3. **变量解析**：正确解析条件表达式中的变量引用
4. **上下文更新**：正确更新上下文
5. **错误处理**：妥善处理各种错误情况
6. **性能优化**：优化上下文处理性能
7. **内存管理**：及时清理不再使用的上下文
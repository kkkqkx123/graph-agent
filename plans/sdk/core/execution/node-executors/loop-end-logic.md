# LoopEndNodeExecutor执行逻辑

## 概述
LoopEndNodeExecutor负责执行LOOP_END节点，更新循环变量，检查中断条件，控制循环跳转。

## 核心职责
1. 验证循环配置
2. 更新循环变量
3. 检查中断条件
4. 决定是否继续循环
5. 返回执行结果

## doExecute方法执行逻辑

### 步骤1：获取循环配置
- 从节点配置获取loopId
- 从节点配置获取iterable
- 从节点配置获取breakCondition

### 步骤2：验证循环配置
- 检查loopId是否存在且不为空
- 检查iterable是否存在且不为空
- 检查breakCondition是否存在且不为空
- 如果配置不合法，抛出ValidationError

### 步骤3：获取循环变量
- 从Thread的variables获取循环变量
- 检查循环变量是否存在
- 如果不存在，抛出ValidationError

### 步骤4：验证loopId一致性
- 检查循环变量的loopId是否与配置的loopId一致
- 如果不一致，抛出ValidationError

### 步骤5：更新循环变量
- 增加循环变量的iterationCount
- 增加循环变量的currentIndex

### 步骤6：解析breakCondition中的变量引用
- 扫描breakCondition中的{{variableName}}模式
- 提取所有变量名
- 从VariableManager获取每个变量的值
- 将breakCondition中的{{variableName}}替换为实际值

### 步骤7：评估中断条件
- 解析breakCondition为表达式
- 评估breakCondition
- 获取评估结果（true或false）

### 步骤8：检查循环条件
- 检查循环变量的iterationCount是否小于maxIterations
- 检查循环变量的currentIndex是否小于iterable.length
- 检查中断条件是否为false

### 步骤9：决定循环跳转
- 如果中断条件为true：
  - 设置shouldContinue为false
  - 跳出循环
- 如果循环条件不满足：
  - 设置shouldContinue为false
  - 跳出循环
- 否则：
  - 设置shouldContinue为true
  - 跳转到LOOP_START节点

### 步骤10：记录执行历史
- 创建ExecutionHistory记录
- 设置nodeId为LOOP_END节点ID
- 设置timestamp为当前时间戳
- 设置action为"loop-end"
- 设置details为{loopId, breakCondition, breakConditionResult, shouldContinue}
- 添加到Thread的executionHistory

### 步骤11：返回执行结果
- 创建NodeExecutionResult
- 设置nodeId为LOOP_END节点ID
- 设置success为true
- 设置output为{loopId, shouldContinue, nextNodeId}
- 设置executionTime为执行时间
- 设置metadata为节点元数据
- 返回NodeExecutionResult

## validate方法执行逻辑

### 步骤1：验证节点类型
- 检查节点类型是否为LOOP_END
- 如果不是，抛出ValidationError

### 步骤2：验证循环配置
- 检查loopId是否存在且不为空
- 检查iterable是否存在且不为空
- 检查breakCondition是否存在且不为空
- 如果配置不合法，抛出ValidationError

### 步骤3：返回验证结果
- 返回true

## canExecute方法执行逻辑

### 步骤1：检查Thread状态
- 检查Thread状态是否为RUNNING
- 如果不是，返回false

### 步骤2：检查循环变量是否存在
- 从Thread的variables获取循环变量
- 检查循环变量是否存在
- 如果不存在，返回false

### 步骤3：返回执行结果
- 返回true

## BreakCondition解析逻辑

### 步骤1：扫描breakCondition
- 使用正则表达式扫描{{variableName}}模式
- 提取所有变量名

### 步骤2：获取变量值
- 从VariableManager获取每个变量的值
- 如果变量不存在，抛出ValidationError

### 步骤3：替换变量引用
- 将breakCondition中的{{variableName}}替换为实际值
- 支持嵌套变量引用

### 步骤4：返回解析后的breakCondition
- 返回解析后的breakCondition

## BreakCondition评估逻辑

### 步骤1：解析表达式
- 解析breakCondition为抽象语法树（AST）
- 识别操作符和操作数

### 步骤2：评估表达式
- 根据操作符类型进行评估：
  - 比较操作符：==、!=、>、<、>=、<=
  - 逻辑操作符：&&、||、!
  - 成员操作符：in、not in

### 步骤3：返回评估结果
- 返回评估结果（true或false）

## 循环跳转逻辑

### 步骤1：检查中断条件
- 检查breakCondition评估结果
- 如果为true，跳出循环

### 步骤2：检查循环条件
- 检查iterationCount是否小于maxIterations
- 检查currentIndex是否小于iterable.length
- 如果任一条件不满足，跳出循环

### 步骤3：决定跳转
- 如果需要跳出循环：
  - 设置nextNodeId为LOOP_END节点的下一个节点
  - 设置shouldContinue为false
- 如果需要继续循环：
  - 设置nextNodeId为对应的LOOP_START节点ID
  - 设置shouldContinue为true

### 步骤4：返回跳转结果
- 返回nextNodeId和shouldContinue

## 循环变量更新逻辑

### 步骤1：获取循环变量
- 从Thread的variables获取循环变量

### 步骤2：更新迭代次数
- 增加iterationCount

### 步骤3：更新当前索引
- 增加currentIndex

### 步骤4：保存循环变量
- 调用VariableManager.setVariable
- 保存更新后的循环变量

### 步骤5：返回更新结果
- 返回true

## 错误处理逻辑

### 循环配置错误
- 如果loopId、iterable或breakCondition缺失，抛出ValidationError
- 错误消息："Loop end node must have loopId, iterable, and breakCondition"

### 循环变量不存在错误
- 如果循环变量不存在，抛出ValidationError
- 错误消息："Loop variable not found: {loopId}"

### LoopId不一致错误
- 如果loopId不一致，抛出ValidationError
- 错误消息："Loop ID mismatch: expected {expectedLoopId}, got {actualLoopId}"

### 变量不存在错误
- 如果breakCondition引用的变量不存在，抛出ValidationError
- 错误消息："Variable not found: {variableName}"

### 循环次数超限错误
- 如果iterationCount超过maxIterations，抛出ExecutionError
- 错误消息："Loop iteration count exceeded maxIterations"

## 注意事项

1. **配置验证**：严格验证循环配置
2. **变量检查**：确保循环变量存在
3. **LoopId一致性**：确保loopId与LOOP_START节点一致
4. **条件评估**：正确评估中断条件
5. **循环跳转**：正确决定循环跳转
6. **错误处理**：妥善处理各种错误情况
7. **性能优化**：优化循环性能
8. **内存管理**：及时清理不再使用的循环变量
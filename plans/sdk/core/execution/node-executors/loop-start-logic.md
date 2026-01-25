# LoopStartNodeExecutor执行逻辑

## 概述
LoopStartNodeExecutor负责执行LOOP_START节点，初始化循环变量，设置循环条件，控制循环流程。

## 核心职责
1. 验证循环配置
2. 初始化循环变量
3. 设置循环条件
4. 控制循环流程
5. 返回执行结果

## doExecute方法执行逻辑

### 步骤1：获取循环配置
- 从节点配置获取loopId
- 从节点配置获取iterable
- 从节点配置获取maxIterations

### 步骤2：验证循环配置
- 检查loopId是否存在且不为空
- 检查iterable是否存在且不为空
- 检查maxIterations是否存在且大于0
- 如果配置不合法，抛出ValidationError

### 步骤3：解析iterable中的变量引用
- 扫描iterable中的{{variableName}}模式
- 提取所有变量名
- 从VariableManager获取每个变量的值
- 将iterable中的{{variableName}}替换为实际值

### 步骤4：初始化循环变量
- 创建循环变量对象
- 设置loopId为配置的loopId
- 设置iterable为解析后的iterable
- 设置currentIndex为0
- 设置maxIterations为配置的maxIterations
- 设置iterationCount为0

### 步骤5：检查循环条件
- 检查iterationCount是否小于maxIterations
- 检查currentIndex是否小于iterable.length
- 如果任一条件不满足，跳过循环

### 步骤6：获取当前迭代值
- 如果iterable是数组：
  - 获取iterable[currentIndex]作为当前迭代值
- 如果iterable是对象：
  - 获取iterable的键值对作为当前迭代值
- 如果iterable是数字：
  - 使用currentIndex作为当前迭代值

### 步骤7：设置循环变量
- 调用VariableManager.setVariable
- 设置变量名为loopId
- 设置变量值为当前迭代值
- 设置变量类型为根据iterable类型确定

### 步骤8：更新循环状态
- 增加iterationCount
- 增加currentIndex

### 步骤9：记录执行历史
- 创建ExecutionHistory记录
- 设置nodeId为LOOP_START节点ID
- 设置timestamp为当前时间戳
- 设置action为"loop-start"
- 设置details为{loopId, iterable, currentIndex, iterationCount, currentValue}
- 添加到Thread的executionHistory

### 步骤10：返回执行结果
- 创建NodeExecutionResult
- 设置nodeId为LOOP_START节点ID
- 设置success为true
- 设置output为{loopId, currentValue, iterationCount, shouldContinue}
- 设置executionTime为执行时间
- 设置metadata为节点元数据
- 返回NodeExecutionResult

## validate方法执行逻辑

### 步骤1：验证节点类型
- 检查节点类型是否为LOOP_START
- 如果不是，抛出ValidationError

### 步骤2：验证循环配置
- 检查loopId是否存在且不为空
- 检查iterable是否存在且不为空
- 检查maxIterations是否存在且大于0
- 如果配置不合法，抛出ValidationError

### 步骤3：返回验证结果
- 返回true

## canExecute方法执行逻辑

### 步骤1：检查Thread状态
- 检查Thread状态是否为RUNNING
- 如果不是，返回false

### 步骤2：检查循环条件
- 从Thread的variables获取循环变量
- 检查iterationCount是否小于maxIterations
- 检查currentIndex是否小于iterable.length
- 如果任一条件不满足，返回false

### 步骤3：返回执行结果
- 返回true

## Iterable解析逻辑

### 步骤1：扫描iterable
- 使用正则表达式扫描{{variableName}}模式
- 提取所有变量名

### 步骤2：获取变量值
- 从VariableManager获取每个变量的值
- 如果变量不存在，抛出ValidationError

### 步骤3：替换变量引用
- 将iterable中的{{variableName}}替换为实际值
- 支持嵌套变量引用

### 步骤4：返回解析后的iterable
- 返回解析后的iterable

## 循环条件检查逻辑

### 步骤1：获取循环变量
- 从Thread的variables获取循环变量

### 步骤2：检查迭代次数
- 检查iterationCount是否小于maxIterations
- 如果不满足，返回false

### 步骤3：检查当前索引
- 检查currentIndex是否小于iterable.length
- 如果不满足，返回false

### 步骤4：返回检查结果
- 返回true或false

## 当前迭代值获取逻辑

### 数组类型
- 获取iterable[currentIndex]
- 返回数组元素

### 对象类型
- 获取iterable的键值对
- 返回{key, value}

### 数字类型
- 使用currentIndex作为当前迭代值
- 返回currentIndex

### 字符串类型
- 获取iterable[currentIndex]
- 返回字符

## 循环变量设置逻辑

### 步骤1：确定变量类型
- 根据iterable类型确定变量类型
- 数组：array
- 对象：object
- 数字：number
- 字符串：string

### 步骤2：设置变量
- 调用VariableManager.setVariable
- 传入loopId、当前迭代值、变量类型

### 步骤3：返回设置结果
- 返回true

## 错误处理逻辑

### 循环配置错误
- 如果loopId、iterable或maxIterations缺失，抛出ValidationError
- 错误消息："Loop start node must have loopId, iterable, and maxIterations"

### 变量不存在错误
- 如果iterable引用的变量不存在，抛出ValidationError
- 错误消息："Variable not found: {variableName}"

### 循环次数超限错误
- 如果iterationCount超过maxIterations，抛出ExecutionError
- 错误消息："Loop iteration count exceeded maxIterations"

### Iterable类型错误
- 如果iterable不是可迭代类型，抛出ValidationError
- 错误消息："Iterable must be an array, object, number, or string"

## 注意事项

1. **配置验证**：严格验证循环配置
2. **变量解析**：正确解析iterable中的变量引用
3. **循环条件**：正确检查循环条件
4. **变量设置**：正确设置循环变量
5. **错误处理**：妥善处理各种错误情况
6. **性能优化**：优化循环性能
7. **内存管理**：及时清理不再使用的循环变量
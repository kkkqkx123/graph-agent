# VariableNodeExecutor执行逻辑

## 概述
VariableNodeExecutor负责执行VARIABLE节点，执行变量表达式，更新变量值，支持多种变量类型。

## 核心职责
1. 验证变量配置
2. 解析变量表达式
3. 执行表达式求值
4. 更新变量值
5. 返回执行结果

## doExecute方法执行逻辑

### 步骤1：获取变量配置
- 从节点配置获取variableName
- 从节点配置获取variableType
- 从节点配置获取expression

### 步骤2：验证变量配置
- 检查variableName是否存在且不为空
- 检查variableType是否合法（number、string、boolean、array、object）
- 检查expression是否存在且不为空
- 如果配置不合法，抛出ValidationError

### 步骤3：解析表达式中的变量引用
- 扫描expression中的{{variableName}}模式
- 提取所有变量名
- 从VariableManager获取每个变量的值
- 将表达式中的{{variableName}}替换为实际值

### 步骤4：执行表达式求值
- 根据variableType选择求值方式：
  - number：使用数学表达式求值
  - string：使用字符串表达式求值
  - boolean：使用布尔表达式求值
  - array：使用数组表达式求值
  - object：使用对象表达式求值

### 步骤5：验证求值结果类型
- 检查求值结果的类型是否与variableType匹配
- 如果不匹配，尝试类型转换
- 如果转换失败，抛出ValidationError

### 步骤6：更新变量值
- 调用VariableManager.setVariable
- 传入threadId、variableName、求值结果、variableType
- 更新变量值

### 步骤7：记录执行历史
- 创建ExecutionHistory记录
- 设置nodeId为VARIABLE节点ID
- 设置timestamp为当前时间戳
- 设置action为"variable"
- 设置details为{variableName, variableType, expression, result}
- 添加到Thread的executionHistory

### 步骤8：返回执行结果
- 创建NodeExecutionResult
- 设置nodeId为VARIABLE节点ID
- 设置success为true
- 设置output为{variableName, value: 求值结果}
- 设置executionTime为执行时间
- 设置metadata为节点元数据
- 返回NodeExecutionResult

## validate方法执行逻辑

### 步骤1：验证节点类型
- 检查节点类型是否为VARIABLE
- 如果不是，抛出ValidationError

### 步骤2：验证变量配置
- 检查variableName是否存在且不为空
- 检查variableType是否合法
- 检查expression是否存在且不为空
- 如果配置不合法，抛出ValidationError

### 步骤3：验证变量类型
- 检查variableType是否为合法值
- 如果不是，抛出ValidationError

### 步骤4：返回验证结果
- 返回true

## canExecute方法执行逻辑

### 步骤1：检查Thread状态
- 检查Thread状态是否为RUNNING
- 如果不是，返回false

### 步骤2：检查变量是否存在
- 检查VariableManager中是否存在该变量
- 如果不存在，检查表达式是否可以创建新变量
- 如果不能创建新变量，返回false

### 步骤3：返回执行结果
- 返回true

## 表达式求值逻辑

### number类型求值
- 使用JavaScript的eval函数或安全的表达式求值器
- 支持基本数学运算：+、-、*、/、%
- 支持数学函数：Math.sin、Math.cos等
- 示例："a + 1" -> 如果a=5，结果为6

### string类型求值
- 支持字符串拼接：+
- 支持字符串方法：substring、toUpperCase等
- 示例："name + ' world'" -> 如果name="hello"，结果为"hello world"

### boolean类型求值
- 支持逻辑运算：&&、||、!
- 支持比较运算：==、!=、>、<、>=、<=
- 示例："a > 5" -> 如果a=6，结果为true

### array类型求值
- 支持数组操作：push、pop、slice等
- 支持数组字面量：[1, 2, 3]
- 示例："array.push(4)" -> 如果array=[1,2,3]，结果为[1,2,3,4]

### object类型求值
- 支持对象操作：添加属性、删除属性等
- 支持对象字面量：{key: value}
- 示例："obj.newKey = 'value'" -> 如果obj={}，结果为{newKey: 'value'}

## 变量引用解析逻辑

### 步骤1：扫描表达式
- 使用正则表达式扫描{{variableName}}模式
- 提取所有变量名

### 步骤2：获取变量值
- 从VariableManager获取每个变量的值
- 如果变量不存在，抛出ValidationError

### 步骤3：替换变量引用
- 将表达式中的{{variableName}}替换为实际值
- 支持嵌套变量引用

### 步骤4：返回解析后的表达式
- 返回解析后的表达式

## 类型转换逻辑

### number类型转换
- 尝试使用Number()函数转换
- 如果转换失败，抛出ValidationError

### string类型转换
- 尝试使用String()函数转换
- 如果转换失败，抛出ValidationError

### boolean类型转换
- 尝试使用Boolean()函数转换
- 如果转换失败，抛出ValidationError

### array类型转换
- 尝试使用Array.from()函数转换
- 如果转换失败，抛出ValidationError

### object类型转换
- 尝试使用Object()函数转换
- 如果转换失败，抛出ValidationError

## 错误处理逻辑

### 变量配置错误
- 如果variableName、variableType或expression缺失，抛出ValidationError
- 错误消息："Variable node must have variableName, variableType, and expression"

### 变量类型错误
- 如果variableType不合法，抛出ValidationError
- 错误消息："Invalid variable type: {variableType}"

### 变量不存在错误
- 如果表达式引用的变量不存在，抛出ValidationError
- 错误消息："Variable not found: {variableName}"

### 表达式求值错误
- 如果表达式求值失败，抛出ExecutionError
- 错误消息："Failed to evaluate expression: {expression}"

### 类型转换错误
- 如果类型转换失败，抛出ValidationError
- 错误消息："Failed to convert value to type {variableType}"

## 注意事项

1. **配置验证**：严格验证变量配置
2. **表达式安全**：使用安全的表达式求值器，避免代码注入
3. **类型检查**：严格检查变量类型
4. **变量引用**：正确解析变量引用
5. **错误处理**：妥善处理各种错误情况
6. **性能优化**：缓存表达式求值结果
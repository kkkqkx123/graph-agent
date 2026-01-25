# Router 设计文档

## 需求分析

### 核心需求
根据边的条件选择下一个节点，实现工作流的路由控制。

### 功能需求
1. 评估边的条件
2. 选择满足条件的边
3. 根据权重排序边
4. 返回下一个节点 ID
5. 支持多种条件类型
6. 支持自定义表达式

### 非功能需求
1. 灵活性：支持多种路由策略
2. 可扩展性：易于添加新的条件类型
3. 性能：高效的条件评估

## 核心职责

1. 边条件评估
2. 下一个节点选择
3. 路由策略实现

## 主要属性

无公共属性，所有依赖通过方法参数传入。

## 核心方法

### selectNextNode 方法

接收当前节点、出边数组和 thread，返回下一个节点 ID。

执行步骤：

步骤 1：检查当前节点类型
- 如果当前节点类型为 ROUTE，返回 null
- ROUTE 节点使用自己的路由逻辑，不通过 Router

步骤 2：检查出边数量
- 如果出边数量为 0，返回 null
- 没有可用的路由

步骤 3：过滤满足条件的边
- 调用 filterEdges 方法
- 传入出边数组和 thread
- 获取满足条件的边数组

步骤 4：检查是否有满足条件的边
- 如果没有满足条件的边，选择默认边
- 查找类型为 DEFAULT 的边
- 返回默认边的 targetNodeId，如果没有则返回 null

步骤 5：按权重排序边
- 调用 sortEdges 方法
- 传入满足条件的边数组
- 获取排序后的边数组

步骤 6：选择第一个边
- 取排序后的第一个边
- 返回其 targetNodeId

步骤 7：返回下一个节点 ID
- 返回下一个节点 ID

### evaluateEdgeCondition 方法

评估边的条件是否满足。

执行步骤：

步骤 1：检查边类型
- 如果边类型为 DEFAULT，返回 true
- 默认边总是满足条件

步骤 2：检查边是否有条件
- 如果边没有 condition，返回 false
- 条件边必须有条件定义

步骤 3：评估条件
- 调用 evaluateCondition 方法
- 传入边的 condition 和 thread
- 返回条件评估结果

步骤 4：返回评估结果
- 返回条件是否满足

### evaluateCondition 方法

评估条件表达式。

执行步骤：

步骤 1：获取变量值
- 调用 getVariableValue 方法
- 传入 condition.variablePath 和 thread
- 获取变量值

步骤 2：根据条件类型评估
- EQUALS: 检查变量值是否等于 condition.value
- NOT_EQUALS: 检查变量值是否不等于 condition.value
- GREATER_THAN: 检查变量值是否大于 condition.value
- LESS_THAN: 检查变量值是否小于 condition.value
- GREATER_EQUAL: 检查变量值是否大于等于 condition.value
- LESS_EQUAL: 检查变量值是否小于等于 condition.value
- CONTAINS: 检查变量值字符串是否包含 condition.value
- NOT_CONTAINS: 检查变量值字符串是否不包含 condition.value
- IN: 检查变量值是否在 condition.value 数组中
- NOT_IN: 检查变量值是否不在 condition.value 数组中
- IS_NULL: 检查变量值是否为 null 或 undefined
- IS_NOT_NULL: 检查变量值是否不为 null 且不为 undefined
- IS_TRUE: 检查变量值是否为 true
- IS_FALSE: 检查变量值是否为 false
- CUSTOM: 调用 evaluateCustomExpression 方法评估自定义表达式

步骤 3：返回评估结果
- 返回条件是否满足

### getVariableValue 方法

获取变量值，支持嵌套路径访问。

执行步骤：

步骤 1：解析路径
- 将 variablePath 按 '.' 分割
- 得到路径数组

步骤 2：遍历路径
- 从 thread 开始
- 依次访问路径中的每个部分
- 如果中间值为 null 或 undefined，返回 undefined

步骤 3：返回变量值
- 返回最终获取的变量值

### evaluateCustomExpression 方法

评估自定义表达式。

执行步骤：

步骤 1：检查表达式
- 如果 customExpression 不存在，返回 false

步骤 2：替换变量引用
- 查找所有 {{variableName}} 格式的变量引用
- 替换为实际的变量值
- 使用 JSON.stringify 序列化变量值

步骤 3：评估表达式
- 使用 Function 构造函数创建评估函数
- 传入替换后的表达式
- 执行评估函数
- 将结果转换为布尔值

步骤 4：处理评估错误
- 如果评估失败，记录错误
- 返回 false

步骤 5：返回评估结果
- 返回评估结果的布尔值

### filterEdges 方法

过滤满足条件的边。

执行步骤：

步骤 1：遍历所有边
- 对每个边调用 evaluateEdgeCondition 方法
- 传入边和 thread

步骤 2：收集满足条件的边
- 将条件满足的边添加到结果数组

步骤 3：返回过滤后的边数组
- 返回满足条件的边数组

### sortEdges 方法

按权重排序边。

执行步骤：

步骤 1：复制边数组
- 创建边的副本，避免修改原数组

步骤 2：按权重排序
- 比较边的 weight 属性
- 权重越大越优先
- 如果权重相同，按 id 升序排序

步骤 3：返回排序后的边数组
- 返回排序后的边数组

## 条件类型

### 比较条件
- EQUALS: 等于
- NOT_EQUALS: 不等于
- GREATER_THAN: 大于
- LESS_THAN: 小于
- GREATER_EQUAL: 大于等于
- LESS_EQUAL: 小于等于

### 字符串条件
- CONTAINS: 包含
- NOT_CONTAINS: 不包含

### 数组条件
- IN: 在数组中
- NOT_IN: 不在数组中

### 空值条件
- IS_NULL: 为空
- IS_NOT_NULL: 不为空

### 布尔条件
- IS_TRUE: 为真
- IS_FALSE: 为假

### 自定义条件
- CUSTOM: 自定义表达式

## 错误处理

### 变量路径无效
- 返回 undefined
- 不抛出异常

### 表达式评估失败
- 记录错误日志
- 返回 false
- 不抛出异常

### 条件类型不支持
- 返回 false
- 不抛出异常

## 注意事项

1. **不依赖 ExecutionContext**：只接收 thread 和必要的参数
2. **职责单一**：只负责路由决策，不负责执行
3. **安全性**：自定义表达式评估需要考虑安全性
4. **性能**：避免在条件评估中进行复杂计算
5. **确定性**：相同输入应该产生相同输出
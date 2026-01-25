# RouteNodeExecutor执行逻辑

## 概述
RouteNodeExecutor负责执行ROUTE节点，评估条件表达式，选择下一个节点，支持多条件路由。ROUTE节点使用自己的路由配置，跳过基于边评估的路由逻辑。

## 核心职责
1. 验证路由配置
2. 解析条件表达式中的变量引用
3. 评估条件表达式
4. 选择下一个节点
5. 返回执行结果
6. 跳过基于边评估的路由逻辑

## doExecute方法执行逻辑

### 步骤1：获取路由配置
- 从节点配置获取conditions
- 从节点配置获取nextNodes

### 步骤2：验证路由配置
- 检查conditions是否存在且不为空
- 检查nextNodes是否存在且不为空
- 检查conditions和nextNodes长度是否一致
- 如果配置不合法，抛出ValidationError

### 步骤3：获取当前节点的出边
- 从WorkflowContext获取当前节点
- 获取当前节点的所有出边
- 构建出边ID到Edge对象的映射

### 步骤4：验证nextNodes
- 遍历nextNodes数组
- 检查每个nextNode是否是邻接节点
- 如果nextNode不是邻接节点，抛出ValidationError

### 步骤5：评估条件表达式
- 初始化selectedNodeIndex为-1
- 遍历conditions数组：
  - 解析条件表达式中的变量引用
  - 评估条件表达式
  - 如果条件为true，设置selectedNodeIndex为当前索引
  - 跳出循环

### 步骤6：选择下一个节点
- 如果selectedNodeIndex为-1（没有条件满足）：
  - 检查是否有默认边（DEFAULT类型）
  - 如果有，选择默认边的targetNodeId
  - 如果没有，抛出ExecutionError
- 否则：
  - 选择nextNodes[selectedNodeIndex]

### 步骤7：记录执行历史
- 创建ExecutionHistory记录
- 设置nodeId为ROUTE节点ID
- 设置timestamp为当前时间戳
- 设置action为"route"
- 设置details为{conditions, nextNodes, selectedNode}
- 添加到Thread的executionHistory

### 步骤8：返回执行结果
- 创建NodeExecutionResult
- 设置nodeId为ROUTE节点ID
- 设置success为true
- 设置output为{selectedNode}（WorkflowExecutor将使用此值作为下一个节点）
- 设置executionTime为执行时间
- 设置metadata为节点元数据
- 返回NodeExecutionResult

## validate方法执行逻辑

### 步骤1：验证节点类型
- 检查节点类型是否为ROUTE
- 如果不是，抛出ValidationError

### 步骤2：验证路由配置
- 检查conditions是否存在且不为空
- 检查nextNodes是否存在且不为空
- 检查conditions和nextNodes长度是否一致
- 如果配置不合法，抛出ValidationError

### 步骤3：验证nextNodes
- 从WorkflowContext获取当前节点的所有出边
- 构建邻接节点ID集合
- 遍历nextNodes：
  - 检查nextNode是否在邻接节点集合中
  - 如果不在，抛出ValidationError

### 步骤4：返回验证结果
- 返回true

## canExecute方法执行逻辑

### 步骤1：检查Thread状态
- 检查Thread状态是否为RUNNING
- 如果不是，返回false

### 步骤2：检查是否有出边
- 从WorkflowContext获取当前节点的所有出边
- 检查出边数量是否大于0
- 如果出边数量为0，返回false

### 步骤3：返回执行结果
- 返回true

## 条件表达式解析逻辑

### 步骤1：扫描条件表达式
- 使用正则表达式扫描{{variableName}}模式
- 提取所有变量名

### 步骤2：获取变量值
- 从VariableManager获取每个变量的值
- 如果变量不存在，抛出ValidationError

### 步骤3：替换变量引用
- 将条件表达式中的{{variableName}}替换为实际值
- 支持嵌套变量引用

### 步骤4：返回解析后的条件表达式
- 返回解析后的条件表达式

## 条件表达式评估逻辑

### 步骤1：解析条件表达式
- 解析条件表达式为抽象语法树（AST）
- 识别操作符和操作数

### 步骤2：评估表达式
- 根据操作符类型进行评估：
  - 比较操作符：==、!=、>、<、>=、<=
  - 逻辑操作符：&&、||、!
  - 成员操作符：in、not in

### 步骤3：返回评估结果
- 返回评估结果（true或false）

## 邻接节点验证逻辑

### 步骤1：获取出边
- 从WorkflowContext获取当前节点的所有出边

### 步骤2：构建邻接节点集合
- 遍历所有出边
- 提取每个边的targetNodeId
- 构建邻接节点ID集合

### 步骤3：验证nextNodes
- 遍历nextNodes数组
- 检查每个nextNode是否在邻接节点集合中
- 如果不在，抛出ValidationError

### 步骤4：返回验证结果
- 返回true

## 默认路由逻辑

### 步骤1：查找默认边
- 遍历所有出边
- 查找类型为DEFAULT的边

### 步骤2：选择默认边
- 如果找到默认边，选择该边的targetNodeId
- 如果没有找到默认边，抛出ExecutionError

### 步骤3：返回默认节点
- 返回默认节点ID

## ROUTE节点与边评估的关系

### 跳过边评估
- ROUTE节点执行时，Router.selectNextNode会返回null
- WorkflowExecutor检测到当前节点是ROUTE节点时，从NodeExecutionResult.output中获取selectedNode
- ROUTE节点不使用边的条件评估逻辑

### 设计原因
- ROUTE节点用于复杂路由逻辑（如多条件组合、动态路由等）
- ROUTE节点的路由配置更灵活，支持自定义条件表达式
- 避免边评估和ROUTE节点路由逻辑的冲突
- ROUTE节点维护自己的nextNodes数组，直接决定路由目标

### 与边的关系
- ROUTE节点的出边仍然需要定义，用于验证邻接关系
- ROUTE节点的nextNodes必须是邻接节点（通过出边连接）
- ROUTE节点的路由决策不依赖边的条件，只依赖自己的配置

## 错误处理逻辑

### 路由配置错误
- 如果conditions或nextNodes缺失，抛出ValidationError
- 错误消息："Route node must have conditions and nextNodes"

### 条件和节点数量不匹配错误
- 如果conditions和nextNodes长度不一致，抛出ValidationError
- 错误消息："Conditions and nextNodes must have the same length"

### 非邻接节点错误
- 如果nextNode不是邻接节点，抛出ValidationError
- 错误消息："Next node must be adjacent: {nextNode}"

### 变量不存在错误
- 如果条件表达式引用的变量不存在，抛出ValidationError
- 错误消息："Variable not found: {variableName}"

### 没有条件满足错误
- 如果没有条件满足且没有默认边，抛出ExecutionError
- 错误消息："No condition matched and no default edge"

## 注意事项

1. **配置验证**：严格验证路由配置
2. **邻接检查**：确保nextNodes是邻接节点
3. **条件评估**：正确评估条件表达式
4. **变量解析**：正确解析条件表达式中的变量引用
5. **默认路由**：提供默认路由作为后备
6. **错误处理**：妥善处理各种错误情况
7. **性能优化**：优化条件评估性能
8. **跳过边评估**：ROUTE节点不使用边的条件评估逻辑
9. **输出格式**：NodeExecutionResult.output必须包含selectedNode字段
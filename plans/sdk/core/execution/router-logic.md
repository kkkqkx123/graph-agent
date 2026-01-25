# Router执行逻辑

## 概述
Router是路由器，负责根据条件选择下一个节点。它评估边的条件，过滤满足条件的边，并按照权重选择下一个节点。

## 核心职责
1. 评估边的条件表达式
2. 过滤满足条件的边
3. 按权重排序边
4. 选择下一个节点
5. 支持默认路由
6. 处理 ROUTE 节点的特殊路由逻辑

## selectNextNode方法执行逻辑

### 步骤1：检查当前节点类型
- 从WorkflowContext获取当前节点
- 检查节点类型是否为 ROUTE
- 如果是 ROUTE 节点，跳过边评估逻辑，返回 null（由 RouteNodeExecutor 处理）
- 如果不是 ROUTE 节点，继续执行基于边评估的路由逻辑

### 步骤2：获取当前节点的所有出边
- 从WorkflowContext获取当前节点
- 从WorkflowContext获取当前节点的所有出边ID
- 根据edgeId从edgeMap获取所有Edge对象
- 如果没有出边，返回null

### 步骤3：过滤满足条件的边
- 遍历所有出边
- 对每个边调用evaluateEdgeCondition(edge, context)
- 如果条件满足，保留该边
- 如果条件不满足，过滤掉该边
- 如果没有满足条件的边，继续步骤4

### 步骤4：选择默认边
- 如果没有满足条件的条件边，查找 DEFAULT 类型的边
- 如果找到 DEFAULT 边，选择该边
- 如果没有找到 DEFAULT 边，返回null

### 步骤5：排序边
- 调用sortEdges(edges)对边进行排序
- 排序规则：
  1. 按weight降序排序（weight越大越优先）
  2. 如果weight相同，按id升序排序（保证确定性）

### 步骤6：选择第一个边
- 从排序后的边数组中选择第一个边
- 获取该边的targetNodeId
- 返回targetNodeId

## evaluateEdgeCondition方法执行逻辑

### 步骤1：检查边类型
- 如果edge.type为DEFAULT，返回true（默认边总是满足）
- 如果edge.type为CONDITIONAL，继续评估条件

### 步骤2：检查边是否有条件
- 如果edge.condition为空或undefined，返回true

### 步骤3：获取条件信息
- 从edge.condition获取条件类型（type）
- 获取变量路径（variablePath）
- 获取比较值（value，如果需要）
- 获取自定义表达式（customExpression，如果是 CUSTOM 类型）

### 步骤4：获取变量值
- 调用getVariableValue(variablePath, context)
- 支持嵌套路径访问，如 "output.data.items[0].name"
- 如果变量不存在，返回undefined

### 步骤5：根据条件类型评估
根据ConditionType进行评估：

#### EQUALS
- 检查变量值是否等于value
- 返回比较结果

#### NOT_EQUALS
- 检查变量值是否不等于value
- 返回比较结果

#### GREATER_THAN
- 检查变量值是否大于value
- 返回比较结果

#### LESS_THAN
- 检查变量值是否小于value
- 返回比较结果

#### GREATER_EQUAL
- 检查变量值是否大于等于value
- 返回比较结果

#### LESS_EQUAL
- 检查变量值是否小于等于value
- 返回比较结果

#### CONTAINS
- 将变量值和value都转换为字符串
- 检查变量值字符串是否包含value字符串
- 返回比较结果

#### NOT_CONTAINS
- 将变量值和value都转换为字符串
- 检查变量值字符串是否不包含value字符串
- 返回比较结果

#### IN
- 检查value是否为数组
- 检查变量值是否在value数组中
- 返回比较结果

#### NOT_IN
- 检查value是否为数组
- 检查变量值是否不在value数组中
- 返回比较结果

#### IS_NULL
- 检查变量值是否为null或undefined
- 返回比较结果

#### IS_NOT_NULL
- 检查变量值是否不为null且不为undefined
- 返回比较结果

#### IS_TRUE
- 检查变量值是否为true
- 返回比较结果

#### IS_FALSE
- 检查变量值是否为false
- 返回比较结果

#### CUSTOM
- 调用evaluateCustomExpression(customExpression, context)
- 解析自定义表达式
- 评估表达式并返回布尔值

### 步骤6：返回评估结果
- 返回条件的评估结果（true或false）

## getVariableValue方法执行逻辑

### 步骤1：分割路径
- 将variablePath按'.'分割成多个部分
- 例如："output.data.items[0].name" -> ["output", "data", "items[0]", "name"]

### 步骤2：遍历路径
- 初始化value为context
- 遍历路径的每个部分
- 如果value为null或undefined，返回undefined
- 从value中获取对应部分的值
- 更新value为获取到的值

### 步骤3：返回变量值
- 返回最终的变量值

## sortEdges方法执行逻辑

### 步骤1：创建边数组的副本
- 复制输入的edges数组
- 避免修改原数组

### 步骤2：排序边
- 使用Array.sort方法排序
- 排序比较函数：
  ```typescript
  (a, b) => {
    if ((a.weight || 0) !== (b.weight || 0)) {
      return (b.weight || 0) - (a.weight || 0); // weight降序
    }
    return a.id.localeCompare(b.id); // id升序
  }
  ```

### 步骤3：返回排序后的边数组
- 返回排序后的边数组

## filterEdges方法执行逻辑

### 步骤1：初始化结果数组
- 创建空数组filteredEdges

### 步骤2：遍历所有边
- 对每个边调用evaluateEdgeCondition(edge, context)
- 如果条件满足，添加到filteredEdges
- 如果条件不满足，跳过该边

### 步骤3：返回过滤后的边数组
- 返回filteredEdges

## 边类型处理逻辑

### DEFAULT边
- 总是满足条件
- 作为默认路由
- 当没有条件边满足时使用

### CONDITIONAL边
- 需要评估条件表达式
- 只有条件满足时才选择
- 支持多种条件类型

## ROUTE节点的特殊处理

### 跳过边评估
- 当当前节点类型为 ROUTE 时，Router.selectNextNode 直接返回 null
- 由 RouteNodeExecutor 负责路由决策
- RouteNodeExecutor 使用自己的 conditions 和 nextNodes 配置

### 设计原因
- ROUTE 节点用于复杂路由逻辑（如多条件组合、动态路由等）
- ROUTE 节点的路由配置更灵活，不依赖边的条件
- 避免边评估和 ROUTE 节点路由逻辑的冲突

## evaluateCustomExpression方法执行逻辑

### 步骤1：解析表达式
- 解析customExpression为抽象语法树（AST）
- 识别操作符和操作数

### 步骤2：替换变量引用
- 扫描表达式中的{{variableName}}模式
- 从context中获取变量值
- 将变量引用替换为实际值

### 步骤3：评估表达式
- 根据操作符类型进行评估：
  - 比较操作符：==、!=、>、<、>=、<=
  - 逻辑操作符：&&、||、!
  - 成员操作符：in、not in

### 步骤4：返回评估结果
- 返回评估结果（true或false）

## 错误处理逻辑

### 变量不存在错误
- 如果变量路径引用的变量不存在，返回undefined
- 不抛出错误，由条件评估逻辑处理

### 条件评估错误
- 如果条件表达式评估失败，抛出ExecutionError
- 记录错误上下文

### 边不存在错误
- 如果边的targetNodeId引用的节点不存在，抛出NotFoundError

### 自定义表达式错误
- 如果自定义表达式语法错误，抛出ExecutionError
- 提供清晰的错误信息

## 性能优化

### 边查询优化
- 使用WorkflowContext的edgeMap快速查询边
- 避免每次都遍历edges数组

### 条件评估优化
- 缓存条件评估结果
- 避免重复评估相同的条件

### 变量解析优化
- 缓存变量值
- 避免重复查询VariableManager

### 排序优化
- 使用稳定的排序算法
- 确保排序结果的确定性

## 注意事项

1. **确定性**：确保路由选择是确定性的
2. **权重处理**：正确处理weight排序，数值越大优先级越高
3. **变量安全**：确保变量路径访问的安全性
4. **错误处理**：妥善处理各种错误情况
5. **性能优化**：优化查询和评估性能
6. **默认路由**：确保有默认路由作为后备
7. **ROUTE节点**：正确处理ROUTE节点的特殊路由逻辑
8. **条件类型**：支持所有ConditionType枚举值
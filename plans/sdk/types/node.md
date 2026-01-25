# Node类型需求分析与设计

## 需求分析

### 核心需求
1. 定义工作流节点的类型和结构
2. 支持不同类型的节点配置
3. 定义节点状态和执行结果
4. 支持节点级别的配置选项

### 功能需求
1. 节点类型包括开始、结束、函数、条件、触发器等
2. 每种节点类型有特定的配置结构
3. 节点支持输入输出定义
4. 节点支持超时和重试配置

### 非功能需求
1. 类型安全的节点配置
2. 支持节点验证
3. 易于扩展新的节点类型

## 设计说明

### 核心类型

#### NodeType
节点类型枚举。

**类型值**：
- START: 开始节点。作为工作流开始标志，必须唯一。入度必须为0。
- END: 结束节点。作为工作流结束标志，必须唯一。出度必须为0。
- VARIABLE: 变量操作节点。用于调用ts本身的函数式操作来操作工作流中的变量。主要用途是更改工作流变量的值，为边条件评估提供数据。不要用于执行业务逻辑。
- FORK: 分叉节点。用于控制thread的fork操作。
- JOIN: 连接节点。用于控制thread的join操作。
- SUBGRAPH: 子图节点。用于链接到子工作流。在workflow处理阶段由merge自动把该节点替换为子工作流，以子工作流的start节点连接。
- CODE: 代码节点。用于执行脚本(脚本用于执行可执行文件或代码)。
- LLM: LLM节点。用于执行LLM api调用。
- TOOL: 工具节点。用于获取LLM api响应并执行工具，返回调用结果。
- USER_INTERACTION: 用户交互节点。用于触发展示前端用户交互。仅提供输入、输出渠道，不关心前端实现细节。
- ROUTE: 路由节点。用于根据条件路由到下一个节点。(完全绕过边的评估逻辑)
- CONTEXT_PROCESSOR: 上下文处理器节点。用于对提示词上下文(消息数组)进行处理。
- LOOP_START: 循环开始节点。标记循环开始，设置循环变量。循环变量可以被VARIABLE节点修改。不关心条件以外的退出条件
- LOOP_END: 循环结束节点。标记循环结束。让循环次数变量自增，并根据循环次数是否达到

#### Node
节点定义类型。

**属性**：
- id: 节点唯一标识符
- type: 节点类型(NodeType枚举类型)
- name: 节点名称
- description: 可选的节点描述
- config: 节点配置，根据节点类型不同而不同
- inputs: 输入定义
- outputs: 输出定义
- metadata: 可选的元数据
- outgoingEdgeIds: 出边ID数组，用于路由决策
- incomingEdgeIds: 入边ID数组，用于反向追踪
- properties: 可选的动态属性对象

#### NodeConfig
节点配置联合类型，根据节点类型有不同的配置结构。

#### StartNodeConfig

**属性**：
无，仅作为工作流开始标志。

#### EndNodeConfig

**属性**：
无，仅作为工作流结束标志。

#### VaribleNodeConfig

**属性**：
- variableName: 操作的变量名称
- variableType: 操作的变量类型【包含number、string、boolean、array、object】
- expression: 操作的表达式【直接用表达式覆盖相应变量】

**示例**：
```
{
  "variableName": "a",
  "variableType": "number",
  "expression": "a + 1"
}
```

#### ForkNodeConfig

**属性**：
- forkId：连接操作的id，与join节点完全一致
- forkStrategy: 分叉策略(串行、并行)

#### JoinNodeConfig

**属性**：
- joinId：连接操作的id，与fork节点完全一致
- joinStrategy: 连接策略(ALL_COMPLETED、ANY_COMPLETED、ALL_FAILED、ANY_FAILED、SUCCESS_COUNT_THRESHOLD)
- threshold: 成功数量阈值（当joinStrategy为SUCCESS_COUNT_THRESHOLD时使用）
- timeout: 等待超时时间（秒）【从第一个前继路径完成开始计算】

#### CodeNodeConfig

**属性**：
- scriptName: 脚本名称
- scriptType: 脚本语言(shell/cmd/powershell/python/javascript)
- risk: 风险等级(none/low/medium/high)【应用层中会实现不同的执行策略，例如none不检查，high在沙箱运行】
- timeout: 超时时间（秒）
- retries: 重试次数
- retryDelay: 重试延迟（秒）

#### LLMNodeConfig

**属性**：
- profileId: 引用的LLM Profile ID
- prompt: 提示词（消息数组或变量引用）
- parameters: 可选的参数覆盖（覆盖Profile中的parameters）

**设计说明**：
- 通过profileId引用LLM Profile，避免重复配置
- prompt支持变量引用，如{{variableName}}
- parameters可以覆盖Profile中的参数
- 简化了配置，提高了复用性

#### ToolNodeConfig

**属性**：
- toolName: 工具名称（会保证唯一）
- parameters: 工具参数对象
- timeout: 超时时间（毫秒）
- retries: 重试次数

#### UserInteractionNodeConfig

**属性**：
- userInteractionType: 用户交互类型(ask_for_approval, ask_for_input, ask_for_selection, show_message)
- showMessage: 用户交互显示消息
- userInput: 用户输入

#### RouteNodeConfig

**属性**：
- conditions: 条件表达式数组
- nextNodes: 下一个节点数组(与conditions一一对应)，顺序判断每个条件是否满足，如果满足则路由到对应的节点
只能路由到邻接节点，不能路由到非邻接节点

#### ContextProcessorNodeConfig

**属性**：
- contextProcessorType: 上下文处理器类型(PASS_THROUGH、FILTER_IN、FILTER_OUT、TRANSFORM、ISOLATE、MERGE)
- contextProcessorConfig: 上下文处理器配置对象
  - filterCondition: 过滤条件表达式（用于FILTER_IN/FILTER_OUT）
  - transformExpression: 转换表达式（用于TRANSFORM）
  - mergeStrategy: 合并策略（用于MERGE）

#### LoopStartNodeConfig

**属性**：
- loopId: 循环名
- iterable: 可迭代对象
- maxIterations: 最大迭代次数

#### LoopEndNodeConfig
循环结束节点配置类型。

**属性**：
- loopId: 循环名，与loop start节点完全一致
- iterable: 可迭代对象，与loop start节点完全一致
- breakCondition: 中断条件表达式

#### NodeInput
节点输入定义类型。

**属性**：
- name: 输入参数名称
- type: 输入类型
- required: 是否必需
- defaultValue: 默认值
- description: 输入描述

#### NodeOutput
节点输出定义类型。

**属性**：
- name: 输出参数名称
- type: 输出类型
- description: 输出描述

#### SubgraphNodeConfig

**属性**：
- subgraphId: 子工作流ID
- inputMapping: 输入参数映射（父工作流变量到子工作流输入的映射）
- outputMapping: 输出参数映射（子工作流输出到父工作流变量的映射）
- async: 是否异步执行

#### NodeStatus(高级功能，用于审计，不承担工作流执行逻辑)
节点状态枚举。

**状态值**：
- PENDING: 等待执行
- RUNNING: 正在执行
- COMPLETED: 执行完成
- FAILED: 执行失败
- SKIPPED: 已跳过（执行过程中由图算法标记，是可选的高级功能）
- CANCELLED: 已取消

#### NodeProperty
节点动态属性类型。

**属性**：
- key: 属性键
- value: 属性值
- type: 属性类型
- required: 是否必需
- validation: 验证规则

### 设计原则

1. **类型安全**：使用联合类型确保配置正确性
2. **可扩展**：易于添加新的节点类型
3. **灵活性**：支持自定义输入输出定义
4. **验证友好**：结构清晰，易于验证

### 补充需求分析

#### 1. 边ID数组管理需求
- **outgoingEdgeIds**: 节点维护出边ID数组，用于执行时的路由决策
- **incomingEdgeIds**: 节点维护入边ID数组，用于反向依赖分析和图遍历
- **边查询**: 通过Workflow对象根据edgeId查询完整的Edge对象
- **边排序**: 边的排序信息存储在Edge对象中，查询时动态排序
- **边过滤**: 支持根据条件过滤边（如只返回条件满足的边）

#### 2. Node-Edge关联设计原则
- **避免循环依赖**: Node只存储edgeId，Edge只存储nodeId，避免相互引用
- **通过Workflow关联**: Workflow持有完整的nodes和edges数组，负责关联查询
- **延迟加载**: 执行时根据需要从Workflow中查询Edge对象
- **缓存优化**: 执行引擎可以缓存已查询的Edge对象以提高性能

#### 2. 属性定义优化需求
- **动态属性**: properties字段支持运行时动态添加属性
- **属性验证**: 每个属性可以定义验证规则
- **属性类型**: 支持多种属性类型（string、number、boolean、array、object）
- **属性继承**: 某些节点类型可能需要继承基础属性

#### 3. 节点验证需求
- **结构验证**: 验证节点配置的完整性
- **类型验证**: 验证config类型与nodeType匹配
- **约束验证**: 验证节点约束（如START节点入度必须为0，END节点出度必须为0）
- **边验证**: 验证边的连接合法性（如不能连接到不存在的节点）

#### 4. 节点序列化需求
- **JSON序列化**: 支持序列化为JSON格式
- **反序列化**: 支持从JSON反序列化
- **版本兼容**: 支持版本迁移和兼容性处理

#### 5. 节点元数据需求
- **审计信息**: 创建时间、更新时间、创建者、更新者
- **标签系统**: 支持标签分类和搜索
- **自定义字段**: 支持应用层自定义扩展字段

### 设计原则

1. **类型安全**：使用联合类型确保配置正确性
2. **可扩展**：易于添加新的节点类型
3. **灵活性**：支持自定义输入输出定义
4. **验证友好**：结构清晰，易于验证
5. **边管理**：节点主动管理边关系，支持排序和过滤
6. **属性灵活**：支持动态属性和验证规则

### 依赖关系

- 依赖common类型定义ID、基础类型
- 不直接依赖edge类型，避免循环依赖
- 被workflow类型引用
- 被execution类型引用
- 被validation类型引用用于节点验证

### Node-Edge关联查询示例

```typescript
// 通过Workflow查询节点的出边
function getOutgoingEdges(node: Node, workflow: Workflow): Edge[] {
  return node.outgoingEdgeIds
    .map(edgeId => workflow.edges.find(e => e.id === edgeId))
    .filter((edge): edge is Edge => edge !== undefined)
    .sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      if (a.weight !== b.weight) return b.weight - a.weight;
      return a.id.localeCompare(b.id);
    });
}

// 通过Workflow查询节点的入边
function getIncomingEdges(node: Node, workflow: Workflow): Edge[] {
  return node.incomingEdgeIds
    .map(edgeId => workflow.edges.find(e => e.id === edgeId))
    .filter((edge): edge is Edge => edge !== undefined);
}
```
# Core/Validation模块需求分析与设计

## 需求分析

### 核心需求
1. 验证工作流定义的正确性
2. 验证节点配置的合法性
3. 验证边配置的合法性
4. 验证工作流结构的完整性
5. 提供清晰的验证错误信息

### 功能需求
1. 工作流验证：验证工作流定义的完整性和正确性
2. 节点验证：验证节点配置的合法性
3. 边验证：验证边配置的合法性
4. 结构验证：验证工作流图结构的完整性
5. 配置验证：验证各种配置的正确性

### 非功能需求
1. 验证性能高效
2. 错误信息清晰明确
3. 支持批量验证
4. 易于扩展新的验证规则

## 设计说明

### 模块结构

```
validation/
├── workflow-validator.ts    # 工作流验证器
├── node-validator.ts        # 节点验证器
├── edge-validator.ts        # 边验证器
├── structure-validator.ts   # 结构验证器
└── config-validator.ts      # 配置验证器
```

### 核心组件

#### WorkflowValidator
工作流验证器，负责工作流定义的完整验证。

**职责**：
- 验证工作流定义的完整性
- 验证工作流配置的正确性
- 协调各个子验证器
- 收集所有验证错误

**核心方法**：
- validate(workflow: WorkflowDefinition): ValidationResult
- validateStructure(workflow: WorkflowDefinition): ValidationResult
- validateNodes(workflow: WorkflowDefinition): ValidationResult
- validateEdges(workflow: WorkflowDefinition): ValidationResult
- validateConfig(workflow: WorkflowDefinition): ValidationResult

**验证内容**：
1. 工作流ID唯一性
2. 工作流名称非空
3. 节点集合非空
4. 边集合可以为空
5. 必须包含START节点
6. 必须包含END节点
7. START节点唯一
8. END节点唯一
9. 工作流配置合法性

**设计说明**：
- WorkflowValidator是验证的入口
- 协调各个子验证器
- 收集所有验证错误
- 提供详细的错误信息

#### NodeValidator
节点验证器，负责节点配置的验证。

**职责**：
- 验证节点配置的完整性
- 验证节点配置的合法性
- 验证节点类型的特定约束

**核心方法**：
- validateNode(node: Node): ValidationResult
- validateNodeConfig(node: Node): ValidationResult
- validateNodeInputs(node: Node): ValidationResult
- validateNodeOutputs(node: Node): ValidationResult
- validateNodeMetadata(node: Node): ValidationResult

**验证内容**：
1. 节点ID唯一性
2. 节点名称非空
3. 节点类型合法
4. 节点配置与类型匹配
5. 节点输入定义合法
6. 节点输出定义合法
7. 节点元数据合法

**节点类型特定验证**：

##### START节点
- 必须唯一
- 入度必须为0
- 不需要配置

##### END节点
- 必须唯一
- 出度必须为0
- 不需要配置

##### VARIABLE节点
- 必须配置variableName
- 必须配置variableType
- 必须配置expression
- variableType必须是合法类型

##### FORK节点
- 必须配置forkId
- 必须配置forkStrategy
- forkStrategy必须是合法值

##### JOIN节点
- 必须配置joinId
- 必须配置joinStrategy
- joinStrategy必须是合法值
- 如果joinStrategy为SUCCESS_COUNT_THRESHOLD，必须配置threshold
- 必须配置timeout

##### CODE节点
- 必须配置scriptName
- 必须配置scriptType
- 必须配置risk
- 必须配置timeout
- 必须配置retries
- scriptType必须是合法值
- risk必须是合法值

##### LLM节点
- 必须配置profileId
- 必须配置prompt
- profileId必须引用已注册的LLM Profile

##### TOOL节点
- 必须配置toolName
- 必须配置parameters
- toolName必须引用已注册的工具

##### USER_INTERACTION节点
- 必须配置userInteractionType
- 必须配置showMessage
- userInteractionType必须是合法值

##### ROUTE节点
- 必须配置conditions
- 必须配置nextNodes
- conditions和nextNodes长度必须一致
- nextNodes必须引用邻接节点

##### CONTEXT_PROCESSOR节点
- 必须配置contextProcessorType
- 必须配置contextProcessorConfig
- contextProcessorType必须是合法值

##### LOOP_START节点
- 必须配置loopId
- 必须配置iterable
- 必须配置maxIterations

##### LOOP_END节点
- 必须配置loopId
- 必须配置iterable
- 必须配置breakCondition
- loopId必须与对应的LOOP_START节点一致

##### SUBGRAPH节点
- 必须配置subgraphId
- 必须配置inputMapping
- 必须配置outputMapping
- subgraphId必须引用已存在的工作流

#### EdgeValidator
边验证器，负责边配置的验证。

**职责**：
- 验证边配置的完整性
- 验证边配置的合法性
- 验证边连接的正确性

**核心方法**：
- validateEdge(edge: Edge, workflow: WorkflowDefinition): ValidationResult
- validateEdgeConnection(edge: Edge, workflow: WorkflowDefinition): ValidationResult
- validateEdgeCondition(edge: Edge): ValidationResult
- validateEdgeMetadata(edge: Edge): ValidationResult

**验证内容**：
1. 边ID唯一性
2. 源节点ID必须存在
3. 目标节点ID必须存在
4. 边类型合法
5. 条件表达式合法（如果存在）
6. 边权重合法
7. 边优先级合法
8. 边元数据合法

#### StructureValidator
结构验证器，负责工作流图结构的验证。

**职责**：
- 验证工作流图结构的完整性
- 验证节点和边的连接关系
- 验证图的可达性
- 验证图的合法性

**核心方法**：
- validateStructure(workflow: WorkflowDefinition): ValidationResult
- validateNodeConnections(workflow: WorkflowDefinition): ValidationResult
- validateReachability(workflow: WorkflowDefinition): ValidationResult
- validateCycles(workflow: WorkflowDefinition): ValidationResult
- validateForkJoin(workflow: WorkflowDefinition): ValidationResult

**验证内容**：
1. 所有边引用的节点必须存在
2. 所有节点的入边和出边必须一致
3. 从START节点必须能到达所有节点
4. 所有节点必须能到达END节点
5. 不允许非法的循环（除了LOOP节点）
6. FORK和JOIN节点必须成对出现
7. FORK和JOIN的forkId/joinId必须一致

#### ConfigValidator
配置验证器，负责各种配置的验证。

**职责**：
- 验证工作流配置
- 验证节点配置
- 验证边配置
- 验证LLM Profile配置
- 验证工具配置

**核心方法**：
- validateWorkflowConfig(config: WorkflowConfig): ValidationResult
- validateLLMProfile(profile: LLMProfile): ValidationResult
- validateTool(tool: Tool): ValidationResult
- validateThreadOptions(options: ThreadOptions): ValidationResult

**验证内容**：
1. 工作流配置合法性
2. LLM Profile配置合法性
3. 工具配置合法性
4. Thread选项合法性

### 验证结果

#### ValidationResult
验证结果类型。

**属性**：
- valid: 是否验证通过
- errors: 错误数组
- warnings: 警告数组

#### ValidationError
验证错误类型。

**属性**：
- code: 错误码
- message: 错误消息
- path: 错误路径（如workflow.nodes[0].config）
- details: 错误详情

#### ValidationWarning
验证警告类型。

**属性**：
- code: 警告码
- message: 警告消息
- path: 警告路径
- details: 警告详情

### 验证流程

#### 工作流验证流程
1. 验证工作流基本信息（ID、名称等）
2. 验证节点配置
3. 验证边配置
4. 验证工作流结构
5. 验证工作流配置
6. 收集所有错误和警告
7. 返回验证结果

#### 节点验证流程
1. 验证节点基本信息（ID、名称、类型）
2. 验证节点配置
3. 验证节点输入定义
4. 验证节点输出定义
5. 验证节点元数据
6. 根据节点类型验证特定约束
7. 返回验证结果

#### 边验证流程
1. 验证边基本信息（ID、类型）
2. 验证边连接（源节点、目标节点）
3. 验证边条件（如果存在）
4. 验证边权重和优先级
5. 验证边元数据
6. 返回验证结果

### 设计原则

1. **全面性**：验证所有可能的错误情况
2. **清晰性**：提供清晰的错误信息和路径
3. **性能**：验证过程高效快速
4. **可扩展**：易于添加新的验证规则
5. **独立性**：各个验证器相互独立

### 与其他模块的集成

#### 与Execution模块的集成
- Execution模块在执行前调用WorkflowValidator验证工作流
- 验证失败时不执行工作流

#### 与State模块的集成
- State模块在创建Thread前验证工作流
- 验证失败时不创建Thread

#### 与API模块的集成
- API模块在接收工作流定义时验证
- 验证失败时返回错误信息

### 依赖关系

- 依赖types层的所有类型定义
- 被core/execution模块引用
- 被core/state模块引用
- 被api/sdk模块引用

### 不包含的功能

以下功能不在validation模块中实现：
- ❌ 工作流的优化（由应用层负责）
- ❌ 工作流的转换（由应用层负责）
- ❌ 工作流的模拟执行（由应用层负责）

### 使用示例

```typescript
// 1. 创建验证器
const validator = new WorkflowValidator();

// 2. 验证工作流
const result = validator.validate(workflowDefinition);

if (!result.valid) {
  console.error('Validation failed:');
  result.errors.forEach(error => {
    console.error(`  [${error.path}] ${error.message}`);
  });
} else {
  console.log('Validation passed');
}

// 3. 验证单个节点
const nodeValidator = new NodeValidator();
const nodeResult = nodeValidator.validateNode(node);

// 4. 验证单个边
const edgeValidator = new EdgeValidator();
const edgeResult = edgeValidator.validateEdge(edge, workflowDefinition);
```

### 注意事项

1. **验证时机**：在执行前必须验证工作流
2. **错误收集**：收集所有错误，不要在第一个错误时停止
3. **错误路径**：提供清晰的错误路径，便于定位问题
4. **性能优化**：避免重复验证
5. **验证规则**：验证规则应该清晰明确
6. **扩展性**：易于添加新的验证规则
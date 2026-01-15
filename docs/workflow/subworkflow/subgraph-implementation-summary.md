# SubgraphNode 实现总结

## 实施概述

基于场景分析文档，成功重构了子工作流实现，避免了循环依赖问题，实现了清晰的职责划分。

**重要架构决策**：SubgraphNode 不再继承 Node 实体，而是作为纯配置类存在，避免实现多余的功能。

## 修改的文件

### 1. Domain 层

#### 新增文件
- **`src/domain/workflow/value-objects/workflow-reference.ts`**
  - 定义了 `WorkflowReference` 值对象
  - 包含引用ID、工作流ID、版本号、输入输出映射
  - 提供验证和比较方法

#### 修改文件
- **`src/domain/workflow/entities/workflow.ts`**
  - 添加了 `subWorkflowReferences` 属性到 `WorkflowProps`
  - 新增子工作流引用管理方法：
    - `getSubWorkflowReferences()`: 获取所有子工作流引用
    - `getSubWorkflowReference(referenceId)`: 根据引用ID获取引用
    - `hasSubWorkflowReference(referenceId)`: 检查引用是否存在
    - `addSubWorkflowReference(reference)`: 添加子工作流引用
    - `removeSubWorkflowReference(referenceId)`: 移除子工作流引用
    - `updateSubWorkflowReference(referenceId, reference)`: 更新子工作流引用

### 2. Infrastructure 层

#### 修改文件
- **`src/infrastructure/workflow/nodes/subgraph/subgraph-node.ts`**
  - **不再继承 Node 实体**，改为纯配置类
  - 新增接口：
    - `VariableMapping`: 变量映射接口，支持 transform 转换函数
    - `SubgraphConfig`: 子工作流配置接口
    - `ValidationResult`: 验证结果接口
    - `SubgraphNodeMetadata`: 子工作流节点元数据接口
  - 构造函数接收 `id`、`referenceId` 和 `config`
  - 提供 `validate()` 方法验证配置有效性
  - 提供 `getMetadata()` 方法获取元数据
  - 提供 `fromProps()` 静态工厂方法

- **`src/infrastructure/workflow/nodes/node-executor.ts`**
  - 注入 `ThreadExecutionService` 依赖
  - 新增 `executeSubgraphNode()` 方法：从上下文获取 SubgraphNode 配置并执行
  - 新增 `handleSubgraphExecutionError()` 方法：处理子工作流错误
  - 更新 `getSupportedNodeTypes()` 添加 'subworkflow' 类型
  - 在 `execute()` 方法中添加节点类型识别逻辑
  - **重要**：SubgraphNode 配置通过上下文传递，不作为参数

### 3. Application 层

#### 修改文件
- **`src/application/threads/services/thread-execution-service.ts`**
  - 新增接口：
    - `SubWorkflowExecutionResult`: 子工作流执行结果接口
  - 新增 `executeSubWorkflow()` 方法：完整的子工作流执行生命周期管理
  - 新增私有方法：
    - `createSubWorkflowThread()`: 创建子工作流线程
    - `executeWorkflowInThread()`: 在线程中执行工作流
    - `mapInputVariables()`: 映射输入变量
    - `mapOutputVariables()`: 映射输出变量
    - `applyTransform()`: 应用转换函数
    - `extractValue()`: 提取值（支持路径表达式）
    - `updateParentContext()`: 更新父线程上下文

## 架构设计

### 职责划分

```
Domain 层（纯数据结构）
├── WorkflowReference: 子工作流引用定义
└── Workflow: 管理子工作流引用列表

Infrastructure 层（执行协调）
├── NodeExecutor: 识别节点类型并路由
│   ├── 普通节点 → node.execute()
│   └── 子工作流节点 → 从上下文获取 SubgraphNode 配置 → ThreadService.executeSubWorkflow()
└── SubgraphNode: 纯配置类（不继承 Node）
    ├── referenceId: 引用ID
    ├── config: 配置对象
    ├── validate(): 验证配置
    └── getMetadata(): 获取元数据

Application 层（业务实现）
└── ThreadExecutionService: 子工作流执行能力
    ├── 创建子线程
    ├── 映射变量
    ├── 执行工作流
    └── 更新父上下文
```

### 依赖关系

```
Domain 层
  ↑ (依赖)
Infrastructure 层
  ↑ (依赖)
Application 层
```

- **Domain** 不依赖任何层（纯数据结构）
- **Infrastructure** 依赖 Domain，调用 Application
- **Application** 实现业务逻辑，不依赖 Infrastructure

## 核心特性

### 1. 避免循环依赖
- **SubgraphNode 不继承 Node 实体**，作为纯配置类存在
- NodeExecutor 识别节点类型，从上下文获取配置
- ThreadService 提供完整的子工作流执行能力

### 2. 上下文隔离
- 父子工作流上下文完全隔离
- 通过显式映射传递数据
- 支持转换函数和复杂表达式

### 3. 错误处理策略
- `propagate`: 错误向上传播
- `catch`: 捕获错误，返回 fallback 值
- `ignore`: 忽略错误，继续执行

### 4. 变量映射
- Workflow 级别的映射（在 Workflow 定义中配置）
- 节点级别的映射（在节点配置中配置）
- 支持转换函数（transform）
- 支持路径表达式（如 "result.data.items"）

## 使用示例

### 1. 创建子工作流引用

```typescript
const workflowReference = WorkflowReference.create({
  referenceId: 'data_processing',
  workflowId: ID.generate(),
  version: '1.0.0',
  inputMapping: new Map([
    ['input_data', '{{parent.input}}'],
    ['config', '{{parent.processing_config}}']
  ]),
  outputMapping: new Map([
    ['processed_data', '{{sub_workflow.result.data}}'],
    ['status', '{{sub_workflow.result.status}}']
  ])
});

const workflow = workflow.addSubWorkflowReference(workflowReference);
```

### 2. 创建子工作流节点配置

```typescript
// 创建 SubgraphNode 配置（纯配置类）
const subgraphNode = new SubgraphNode(
  NodeId.generate(),
  'data_processing',
  {
    inputMappings: [
      { source: 'input.data', target: 'raw_data' },
      { source: 'input.config', target: 'processing_config', transform: 'json.stringify' }
    ],
    outputMappings: [
      { source: 'result.data', target: 'processed_data' },
      { source: 'result.metadata', target: 'processing_metadata', transform: 'json.parse' }
    ],
    errorHandling: {
      strategy: 'catch',
      fallbackValue: { status: 'skipped', data: null }
    },
    timeout: 300000
  }
);

// 将配置设置到上下文中
context.setService('SubgraphNode', subgraphNode);
```

### 3. 执行流程

```
1. NodeExecutor.execute(node, context)
   ↓
2. 识别 node.type 为 subworkflow
   ↓
3. 从 context 获取 SubgraphNode 配置
   ↓
4. ThreadExecutionService.executeSubWorkflow()
   ↓
5. 创建子线程
   ↓
6. 映射输入变量
   ↓
7. 执行子工作流
   ↓
8. 映射输出变量
   ↓
9. 更新父线程上下文
   ↓
10. 返回执行结果
```

## 配置示例

### TOML 配置

```toml
# 主工作流配置
[workflow]
id = "main_workflow"
name = "主工作流"

# 子工作流引用
[[workflow.sub_workflow_references]]
reference_id = "data_processing"
workflow_id = "wf_001"
version = "1.0.0"

[workflow.sub_workflow_references.input_mapping]
input_data = "{{parent.input}}"
config = "{{parent.processing_config}}"

[workflow.sub_workflow_references.output_mapping]
processed_data = "{{sub_workflow.result.data}}"
status = "{{sub_workflow.result.status}}"

# 子工作流节点
[[workflow.nodes]]
id = "processing"
type = "sub_workflow"

[workflow.nodes.config]
reference_id = "data_processing"

[workflow.nodes.config.error_handling]
strategy = "catch"
fallback_value = { status = "skipped", data = null }

[[workflow.nodes.config.input_mappings]]
source = "input.data"
target = "raw_data"

[[workflow.nodes.config.input_mappings]]
source = "input.config"
target = "processing_config"
transform = "json.stringify"

[[workflow.nodes.config.output_mappings]]
source = "result.data"
target = "processed_data"

[[workflow.nodes.config.output_mappings]]
source = "result.metadata"
target = "processing_metadata"
transform = "json.parse"
```

## 测试建议

### 单元测试
1. **WorkflowReference**: 验证引用创建和验证逻辑
2. **SubgraphNode**: 验证配置验证和元数据
3. **ThreadExecutionService**: 验证子工作流执行流程
4. **NodeExecutor**: 验证节点类型识别和路由

### 集成测试
1. 完整的子工作流执行流程
2. 变量映射和转换
3. 错误处理策略
4. 上下文隔离

## 后续优化

1. **性能优化**
   - 实现 Thread 池复用
   - 懒加载子工作流定义
   - 延迟变量映射

2. **监控和调试**
   - 执行链路追踪
   - 断点支持
   - 单步执行

3. **配置简化**
   - 工作流注册表
   - 默认配置继承
   - 配置模板

## 总结

本次重构成功实现了：
- ✅ 避免循环依赖
- ✅ **SubgraphNode 不继承 Node 实体，避免实现多余功能**
- ✅ 清晰的职责划分
- ✅ 完整的上下文隔离
- ✅ 灵活的错误处理
- ✅ 强大的变量映射能力
- ✅ 符合 DDD 原则的架构设计

新的架构为子工作流功能提供了坚实的基础，支持未来的扩展和优化。

## 关键设计决策

### SubgraphNode 不继承 Node 的原因

1. **职责单一**：SubgraphNode 仅用于配置，不需要 Node 的执行能力
2. **避免冗余**：不需要实现 `execute()`、`canExecute()` 等 Node 方法
3. **灵活性**：配置类可以独立于 Node 实体使用
4. **清晰性**：明确区分配置和执行逻辑
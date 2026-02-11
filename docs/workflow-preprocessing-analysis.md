# Workflow 预处理机制分析与优化方案

## 1. 问题分析

### 1.1 ThreadBuilder.build() 中的冗余逻辑

在 `sdk/core/execution/thread-builder.ts:55-83` 的 `build()` 方法中存在以下冗余：

**冗余点1：重复检查**
- 第57行：`getProcessed()` 检查 processedWorkflow 是否存在
- 第73行：预处理后再次检查 `if (!processedWorkflow)`，这个检查是多余的

**冗余点2：过度防御性编程**
- 整个逻辑采用了"检查-回退-再检查"的模式
- `preprocessAndStore()` 已经内部做了缓存检查，如果 workflow 存在，一定会返回有效的 processedWorkflow

### 1.2 当前 Workflow 预处理机制的问题

**预处理流程：**
1. **注册阶段**：`workflowRegistry.register()` 只存储原始 `WorkflowDefinition`
2. **按需预处理**：在 `workflowRegistry.preprocessAndStore()` 中进行预处理
3. **预处理内容**：
   - 节点引用展开（`expandNodeReferences`）
   - 触发器引用展开
   - 图构建和验证
   - **子工作流递归处理**（关键！）

**问题表现：**

#### 问题1：预处理时序依赖
- 当主工作流包含 SUBGRAPH 节点引用子工作流时
- 如果在注册主工作流时子工作流还未注册，`processSubgraphs()` 会失败
- 因为 `workflowRegistry.get(subworkflowId)` 返回 undefined

#### 问题2：子工作流预处理不完整
在 `graph-builder.ts:220-244` 中：
```typescript
const subworkflow = workflowRegistry.get(subworkflowId);  // 获取原始定义
const subgraphBuildResult = this.buildAndValidate(subworkflow, ...);
```

**问题：**
- `buildAndValidate()` 只做图构建，不会展开节点引用和触发器引用
- 如果子工作流包含节点模板引用，这些引用不会被展开
- 如果子工作流包含触发器模板引用，这些引用不会被展开
- 如果子工作流本身也包含 SUBGRAPH 节点（嵌套子工作流），这些不会被递归处理

#### 问题3：Triggered子工作流未预处理
在 `execute-triggered-subgraph-handler.ts:92` 中：
```typescript
const triggeredWorkflow = workflowRegistry.get(triggeredWorkflowId);
```

**问题：**
- 直接获取原始定义，未进行预处理
- Triggered子工作流的节点引用和触发器引用不会被展开

## 2. 正确的预处理策略：分层预处理

### 2.1 核心原则

**根据工作流依赖关系决定预处理时机：**

1. **无外部依赖的工作流** → 注册时预处理
2. **有SUBGRAPH依赖的工作流** → Thread构建时预处理
3. **Triggered子工作流** → 执行时预处理

### 2.2 工作流类型分析

#### 1. 普通工作流（包含SUBGRAPH节点）
- **特征**：包含 `SUBGRAPH` 节点，静态引用其他工作流
- **预处理时机**：Thread构建时
- **原因**：需要确保所有子工作流都已注册

#### 2. Triggered子工作流
- **特征**：包含 `START_FROM_TRIGGER` 和 `CONTINUE_FROM_TRIGGER` 节点
- **预处理时机**：执行时（触发器触发时）
- **原因**：通过触发器动态调用，不会被展开到主工作流图中

### 2.3 预处理流程图

```
工作流注册
├── 检查是否有外部依赖（SUBGRAPH节点）
├── 无依赖 → 立即预处理
│   ├── 展开节点引用
│   ├── 展开触发器引用
│   ├── 构建图
│   └── 缓存结果
└── 有依赖 → 仅存储原始定义，延迟预处理

Thread构建
├── 调用 ensureProcessed(workflowId)
├── 检查是否已预处理
├── 未预处理 → 执行完整预处理
│   ├── 展开节点引用
│   ├── 展开触发器引用
│   ├── 构建图
│   ├── 处理SUBGRAPH节点（递归预处理子工作流）
│   │   └── 对每个子工作流调用 ensureProcessed()
│   ├── 处理触发器引用的工作流
│   │   └── 对每个 EXECUTE_TRIGGERED_SUBGRAPH 动作引用的工作流调用 ensureProcessed()
│   └── 缓存结果
└── 使用预处理后的图构建Thread

Triggered子工作流执行
├── 触发器触发
├── 调用 ensureProcessed(triggeredWorkflowId)
├── 检查是否已预处理
├── 已预处理 → 直接使用（在Thread构建时已预处理）
└── 使用预处理后的工作流执行
```

## 3. 实现方案

### 3.1 在 WorkflowRegistry 中添加依赖检查

```typescript
/**
 * 检查工作流是否有外部依赖
 */
hasExternalDependencies(workflow: WorkflowDefinition): boolean {
  // 检查是否包含SUBGRAPH节点
  return workflow.nodes.some(node => node.type === 'SUBGRAPH');
}

/**
 * 确保工作流已预处理（统一入口）
 */
async ensureProcessed(workflowId: string): Promise<ProcessedWorkflowDefinition> {
  // 检查缓存
  let processed = this.getProcessed(workflowId);
  if (processed) return processed;
  
  // 获取原始定义
  const workflow = this.get(workflowId);
  if (!workflow) {
    throw new ValidationError(`Workflow '${workflowId}' not found`, 'workflowId');
  }
  
  // 预处理（会递归处理所有子工作流）
  processed = await this.preprocessAndStore(workflow);
  
  return processed;
}
```

### 3.2 修改注册逻辑（仅预处理无依赖工作流）

```typescript
register(workflow: WorkflowDefinition): void {
  // 验证工作流定义
  const validationResult = this.validate(workflow);
  if (!validationResult.valid) {
    throw new ValidationError(...);
  }
  
  // 检查ID是否已存在
  if (this.workflows.has(workflow.id)) {
    throw new ValidationError(...);
  }
  
  // 保存工作流定义
  this.workflows.set(workflow.id, workflow);
  
  // 仅预处理无外部依赖的工作流
  if (!this.hasExternalDependencies(workflow)) {
    this.preprocessAndStore(workflow); // 同步预处理
  }
}
```

### 3.3 修改 ThreadBuilder.build()（预处理有依赖工作流）

```typescript
async build(workflowId: string, options: ThreadOptions = {}): Promise<ThreadContext> {
  // 统一使用 ensureProcessed，确保工作流已预处理
  const processedWorkflow = await this.workflowRegistry.ensureProcessed(workflowId);
  
  return this.buildFromProcessedDefinition(processedWorkflow, options);
}
```

### 3.4 在预处理阶段检查触发器引用的工作流

在 `workflow-processor.ts` 中添加触发器引用工作流的预处理检查：

```typescript
// 在 processWorkflow 函数中
// 7. 处理触发器引用的工作流
if (options.workflowRegistry) {
  const triggeredWorkflowIds = extractTriggeredWorkflowIds(expandedTriggers);
  
  for (const triggeredWorkflowId of triggeredWorkflowIds) {
    // 确保触发器引用的工作流已预处理
    const processedTriggeredWorkflow = await options.workflowRegistry.ensureProcessed(triggeredWorkflowId);
    
    if (!processedTriggeredWorkflow) {
      throw new ValidationError(
        `Triggered workflow '${triggeredWorkflowId}' referenced in triggers not found or failed to preprocess`,
        'workflow.triggers'
      );
    }
    
    // 记录触发器引用的工作流ID
    subworkflowIds.add(triggeredWorkflowId);
  }
}
```

**优势：**
- 在Thread构建时就检查所有触发器引用的工作流是否存在
- 确保所有triggered子工作流在执行前已完成预处理
- 避免运行时才发现工作流缺失的错误
- executeTriggeredSubgraphHandler 中的检查仅作为防御性编程的保证

### 3.5 executeTriggeredSubgraphHandler 中的防御性检查

```typescript
// 在 execute-triggered-subgraph-handler.ts 中
const workflowRegistry = context.getWorkflowRegistry();

// 确保triggered子工作流已预处理（防御性检查）
const processedTriggeredWorkflow = await workflowRegistry.ensureProcessed(triggeredWorkflowId);

if (!processedTriggeredWorkflow) {
  throw new NotFoundError(`Triggered workflow not found: ${triggeredWorkflowId}`, 'Workflow', triggeredWorkflowId);
}

// 使用预处理后的工作流定义
const input: Record<string, any> = {
  output: mainThreadContext.getOutput(),
  // ...
};
```

**说明：**
- 这里的检查是防御性编程，理论上不应该失败
- 因为在Thread构建时已经确保所有触发器引用的工作流都已预处理
- 如果这里失败，说明有其他代码路径绕过了正常的预处理流程

## 4. 关键优势

1. **解决时序问题**：
   - 无论工作流注册顺序如何，都能正确处理依赖
   - 有依赖的工作流在Thread构建时才预处理，此时所有依赖都已注册

2. **性能优化**：
   - 无依赖工作流在注册时预处理，避免重复处理
   - 有依赖工作流延迟预处理，减少不必要的预处理尝试

3. **错误处理清晰**：
   - 依赖缺失时在Thread构建时抛出错误
   - 错误信息明确，易于调试
   - 使用 SDK 的错误系统（ValidationError、NotFoundError等）
   - 注册时的预处理失败使用 SDK 错误系统包装，提供详细的错误上下文

   **错误处理改进：**
   
   在 `workflow-registry.ts` 的 `register()` 方法中，对于无依赖工作流的异步预处理失败，使用 SDK 错误系统进行包装：
   
   ```typescript
   this.preprocessAndStore(workflow).catch(error => {
     // 使用 SDK 错误系统包装错误
     const wrappedError = new ValidationError(
       `Failed to preprocess workflow '${workflow.id}': ${error instanceof Error ? error.message : String(error)}`,
       'workflow',
       workflow.id,
       {
         workflowId: workflow.id,
         workflowName: workflow.name,
         originalError: error instanceof Error ? {
           name: error.name,
           message: error.message,
           stack: error.stack
         } : String(error)
       }
     );
     
     // 记录错误到控制台（开发调试用）
     console.error(`[WorkflowRegistry] Preprocessing failed for workflow '${workflow.id}':`, wrappedError);
   });
   ```
   
   **错误类型分析：**
   
   预处理过程中可能产生的错误类型：
   
   1. **ValidationError** - 工作流验证失败
      - 工作流定义不符合规范（缺少必需字段、类型错误等）
      - 图结构验证失败（循环、孤立节点、缺少START/END节点等）
      - 子工作流处理失败（子工作流不存在、递归深度超限等）
      - 触发器引用的工作流不存在或预处理失败
   
   2. **NotFoundError** - 资源未找到
      - 子工作流不存在
      - 触发器引用的工作流不存在
      - 节点模板不存在
      - 触发器模板不存在
   
   3. **ExecutionError** - 执行错误
      - 图构建过程中的意外错误
      - 递归处理过程中的错误
   
   **错误上下文信息：**
   
   所有错误都包含详细的上下文信息：
   - `workflowId`: 工作流ID
   - `workflowName`: 工作流名称
   - `originalError`: 原始错误信息（名称、消息、堆栈）
   - `field`: 相关字段（如 'workflow'、'workflow.subgraphs'、'workflow.triggers'）
   - `value`: 相关值（如工作流ID）
   
   这样可以方便地追踪和调试预处理失败的原因。

4. **支持Triggered子工作流**：
   - Triggered子工作流在Thread构建时预处理（通过触发器引用检查）
   - 确保其节点引用和触发器引用被正确展开
   - 执行时直接使用已预处理的工作流，避免运行时错误

5. **统一预处理入口**：
   - 所有预处理都通过 `ensureProcessed()` 进行
   - 逻辑清晰，易于维护

6. **提前错误检测**：
   - 在Thread构建时就检查所有依赖（SUBGRAPH和触发器引用）
   - 避免运行时才发现工作流缺失
   - 提供明确的错误信息，便于调试

## 5. 实施步骤

1. ✅ 编写分析文档
2. ✅ 在 WorkflowRegistry 中添加 `hasExternalDependencies()` 方法
3. ✅ 修改 `register()` 方法，仅预处理无依赖工作流
4. ✅ 添加 `ensureProcessed()` 方法作为统一预处理入口
5. ✅ 修改 ThreadBuilder.build() 使用 `ensureProcessed()`
6. ✅ 修改 executeTriggeredSubgraphHandler 使用 `ensureProcessed()`
7. ✅ 在预处理阶段检查并预处理触发器引用的工作流
8. ⏳ 添加集成测试验证各种场景

## 6. 测试场景

### 6.1 注册顺序测试
- 先注册主工作流，再注册子工作流
- 先注册子工作流，再注册主工作流
- 验证两种顺序都能正确预处理

### 6.2 嵌套子工作流测试
- 主工作流 → 子工作流A → 子工作流B
- 验证递归预处理正确

### 6.3 触发器引用工作流测试
- 验证触发器引用的工作流在Thread构建时被预处理
- 验证缺失的triggered工作流在Thread构建时抛出错误
- 验证triggered子工作流的节点引用和触发器引用被正确展开

### 6.4 错误处理测试
- 缺失依赖时抛出正确错误
- 循环依赖检测（如果需要）
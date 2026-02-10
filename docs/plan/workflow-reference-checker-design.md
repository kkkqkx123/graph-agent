# 工作流引用检查器设计文档

## 背景

当前 [`WorkflowRegistryAPI.updateResource()`](sdk/api/resources/workflows/workflow-registry-api.ts:74) 方法直接抛出错误，因为工作流被认为是不可变的。用户希望支持通过版本控制创建新实例的更新操作，但需要确保在删除原版本时不会破坏正在使用该工作流的高层实例（如线程、触发器等）。

## 需求分析

### 引用类型
1. **子工作流引用 (Subgraph References)**
   - 通过 SUBGRAPH 节点引用其他工作流
   - 由 [`WorkflowRegistry.workflowRelationships`](sdk/core/services/workflow-registry.ts:660) 维护

2. **触发子工作流引用 (Triggered Subworkflow References)**
   - 通过 START_WORKFLOW 触发器引用其他工作流
   - 触发器配置中的 `triggeredWorkflowId` 或 `workflowId` 参数

3. **运行时线程引用 (Runtime Thread References)**
   - 活跃的线程正在执行目标工作流
   - 通过 [`ThreadContext`](sdk/core/execution/context/thread-context.ts) 的 `workflowId` 和 `triggeredSubworkflowContext`

## 设计方案

### 1. 类型定义

```typescript
// sdk/types/workflow-reference.ts
export interface WorkflowReference {
  type: 'subgraph' | 'trigger' | 'thread';
  sourceId: string;
  sourceName: string;
  isRuntimeReference: boolean;
  details: Record<string, any>;
}

export interface WorkflowReferenceInfo {
  hasReferences: boolean;
  references: WorkflowReference[];
  canSafelyDelete: boolean;
  stats: {
    subgraphReferences: number;
    triggerReferences: number;
    threadReferences: number;
    runtimeReferences: number;
  };
}
```

### 2. 引用检查工具类

```typescript
// sdk/utils/workflow-reference-checker.ts
export class WorkflowReferenceChecker {
  constructor(
    private workflowRegistry: WorkflowRegistry,
    private threadRegistry: ThreadRegistry
  ) {}

  checkReferences(workflowId: string): WorkflowReferenceInfo {
    // 检查三种引用类型并汇总结果
  }
  
  private checkSubgraphReferences(workflowId: string): WorkflowReference[] {
    // 检查父子工作流关系
  }
  
  private checkTriggerReferences(workflowId: string): WorkflowReference[] {
    // 检查所有工作流的触发器配置
  }
  
  private checkThreadReferences(workflowId: string): WorkflowReference[] {
    // 检查所有活跃线程
  }
}
```

### 3. WorkflowRegistry 增强

```typescript
// sdk/core/services/workflow-registry.ts
/**
 * 检查工作流引用
 */
checkWorkflowReferences(workflowId: string, threadRegistry: ThreadRegistry): WorkflowReferenceInfo {
  const checker = new WorkflowReferenceChecker(this, threadRegistry);
  return checker.checkReferences(workflowId);
}

/**
 * 安全删除工作流
 */
unregister(
  workflowId: string, 
  options?: { 
    force?: boolean; 
    checkReferences?: boolean;
    threadRegistry?: ThreadRegistry;
  }
): void {
  // 引用检查逻辑
}
```

### 4. WorkflowRegistryAPI 更新

```typescript
// sdk/api/resources/workflows/workflow-registry-api.ts
protected async updateResource(
  id: string, 
  updates: Partial<WorkflowDefinition>,
  options?: {
    versionStrategy?: 'patch' | 'minor' | 'major';
    keepOriginal?: boolean;
    force?: boolean;
  }
): Promise<string> {
  // 创建新版本实例
  // 如果 keepOriginal === false，则安全删除原版本
}
```

## 实现步骤

### 步骤1: 创建类型定义
- 在 `sdk/types/workflow-reference.ts` 中定义引用检查相关类型

### 步骤2: 实现引用检查工具类
- 在 `sdk/utils/workflow-reference-checker.ts` 中实现完整的引用检查逻辑
- 包含单元测试

### 步骤3: 增强 WorkflowRegistry
- 添加 `checkWorkflowReferences()` 方法
- 修改 `unregister()` 方法支持引用检查选项

### 步骤4: 更新 WorkflowRegistryAPI
- 修改 `updateResource()` 方法支持版本化更新
- 集成引用检查功能

### 步骤5: 更新依赖和导出
- 在 `sdk/utils/index.ts` 中导出新工具类
- 在 `sdk/types/index.ts` 中导出新类型

## API 设计

### 引用检查 API
```typescript
const referenceInfo = workflowRegistry.checkWorkflowReferences('workflow-id', threadRegistry);
if (referenceInfo.hasReferences) {
  console.log('工作流被引用:', referenceInfo.references);
  if (!referenceInfo.canSafelyDelete) {
    throw new Error('存在运行时引用，无法安全删除');
  }
}
```

### 安全删除 API
```typescript
// 默认安全检查
workflowRegistry.unregister('workflow-id');

// 强制删除（跳过检查）
workflowRegistry.unregister('workflow-id', { force: true });

// 自定义检查行为
workflowRegistry.unregister('workflow-id', { 
  checkReferences: true,
  threadRegistry: customThreadRegistry 
});
```

### 版本化更新 API
```typescript
// 创建新版本，保留原版本
const newId = await api.updateResource('workflow-id', { name: 'New Name' });

// 创建新版本，替换原版本（安全检查）
const newId = await api.updateResource('workflow-id', { name: 'New Name' }, { 
  keepOriginal: false 
});

// 强制替换原版本
const newId = await api.updateResource('workflow-id', { name: 'New Name' }, { 
  keepOriginal: false,
  force: true 
});
```

## 向后兼容性

- 所有新功能都通过可选参数启用
- 默认行为保持不变
- 现有代码无需修改即可继续工作

## 测试策略

1. **单元测试**: 测试引用检查工具类的各种场景
2. **集成测试**: 测试 WorkflowRegistry 的引用检查功能
3. **端到端测试**: 测试 WorkflowRegistryAPI 的完整更新流程

## 风险评估

### 低风险
- 新功能默认不启用，不影响现有代码
- 引用检查是只读操作，不会修改数据

### 中等风险
- 性能影响：引用检查需要遍历所有工作流和线程
- 解决方案：提供缓存机制和异步检查选项

### 高风险
- 循环引用检测复杂性
- 解决方案：限制递归深度，提供超时机制

## 结论

创建独立的引用检查工具模块是最佳方案，它提供了：
- 完整的引用检测能力
- 灵活的安全删除策略  
- 良好的可维护性和可测试性
- 向后兼容的API设计
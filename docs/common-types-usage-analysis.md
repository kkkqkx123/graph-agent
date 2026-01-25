# Common 类型使用分析报告

## 概述

本文档分析了 `sdk/types/common.ts` 中定义的通用类型（ID、Timestamp、Version、Metadata）在 SDK 各类型文件中的使用情况，并指出了应该使用这些类型但当前未使用的地方。

## 定义的类型

`common.ts` 中定义了以下类型：

1. **ID** - ID类型（类型别名，使用字符串）
2. **Timestamp** - 时间戳类型（毫秒时间戳）
3. **Version** - 版本类型（语义化版本）
4. **Metadata** - 元数据类型（Record<string, any>）

---

## 1. ID 类型使用分析

### 应该使用但未使用的地方

#### sdk/types/workflow.ts
- `WorkflowDefinition.id: string` → 应该改为 `ID`
- `WorkflowConfig.errorHandling.fallbackNodeId?: string` → 应该改为 `ID`

#### sdk/types/node.ts
- `Node.id: string` → 应该改为 `ID`
- `ForkNodeConfig.forkId: string` → 应该改为 `ID`
- `JoinNodeConfig.joinId: string` → 应该改为 `ID`
- `LLMNodeConfig.profileId: string` → 应该改为 `ID`
- `SubgraphNodeConfig.subgraphId: string` → 应该改为 `ID`
- `Node.outgoingEdgeIds: string[]` → 应该改为 `ID[]`
- `Node.incomingEdgeIds: string[]` → 应该改为 `ID[]`

#### sdk/types/edge.ts
- `Edge.id: string` → 应该改为 `ID`
- `Edge.sourceNodeId: string` → 应该改为 `ID`
- `Edge.targetNodeId: string` → 应该改为 `ID`

#### sdk/types/thread.ts
- `Thread.id: string` → 应该改为 `ID`
- `Thread.workflowId: string` → 应该改为 `ID`
- `Thread.currentNodeId: string` → 应该改为 `ID`
- `ThreadMetadata.parentThreadId?: string` → 应该改为 `ID`
- `ThreadMetadata.childThreadIds?: string[]` → 应该改为 `ID[]`
- `NodeExecutionResult.nodeId: string` → 应该改为 `ID`
- `ExecutionHistoryEntry.nodeId: string` → 应该改为 `ID`
- `ThreadResult.threadId: string` → 应该改为 `ID`

#### sdk/types/checkpoint.ts
- `Checkpoint.id: string` → 应该改为 `ID`
- `Checkpoint.threadId: string` → 应该改为 `ID`
- `Checkpoint.workflowId: string` → 应该改为 `ID`
- `ThreadStateSnapshot.currentNodeId: string` → 应该改为 `ID`

#### sdk/types/llm.ts
- `LLMProfile.id: string` → 应该改为 `ID`
- `LLMToolCall.id: string` → 应该改为 `ID`
- `LLMResult.id: string` → 应该改为 `ID`
- `LLMRequest.profileId?: string` → 应该改为 `ID`

#### sdk/types/tool.ts
- `Tool.id: string` → 应该改为 `ID`
- `ToolCall.id: string` → 应该改为 `ID`

#### sdk/types/events.ts
- `BaseEvent.workflowId: string` → 应该改为 `ID`
- `BaseEvent.threadId: string` → 应该改为 `ID`
- `ThreadForkedEvent.parentThreadId: string` → 应该改为 `ID`
- `ThreadForkedEvent.childThreadIds: string[]` → 应该改为 `ID[]`
- `ThreadJoinedEvent.parentThreadId: string` → 应该改为 `ID`
- `ThreadJoinedEvent.childThreadIds: string[]` → 应该改为 `ID[]`
- `NodeStartedEvent.nodeId: string` → 应该改为 `ID`
- `NodeCompletedEvent.nodeId: string` → 应该改为 `ID`
- `NodeFailedEvent.nodeId: string` → 应该改为 `ID`
- `ToolCalledEvent.nodeId: string` → 应该改为 `ID`
- `ToolCalledEvent.toolId: string` → 应该改为 `ID`
- `ToolCompletedEvent.nodeId: string` → 应该改为 `ID`
- `ToolCompletedEvent.toolId: string` → 应该改为 `ID`
- `ToolFailedEvent.nodeId: string` → 应该改为 `ID`
- `ToolFailedEvent.toolId: string` → 应该改为 `ID`
- `ErrorEvent.nodeId?: string` → 应该改为 `ID`
- `CheckpointCreatedEvent.checkpointId: string` → 应该改为 `ID`

#### sdk/types/execution.ts
- `ExecutionMetadata.executionId: string` → 应该改为 `ID`
- `ExecutionMetadata.workflowId: string` → 应该改为 `ID`
- `ExecutionMetadata.threadId: string` → 应该改为 `ID`

---

## 2. Timestamp 类型使用分析

### 应该使用但未使用的地方

#### sdk/types/workflow.ts
- `WorkflowDefinition.createdAt: number` → 应该改为 `Timestamp`
- `WorkflowDefinition.updatedAt: number` → 应该改为 `Timestamp`

#### sdk/types/thread.ts
- `NodeExecutionResult.executionTime?: number` → 应该改为 `Timestamp`
- `NodeExecutionResult.startTime?: number` → 应该改为 `Timestamp`
- `NodeExecutionResult.endTime?: number` → 应该改为 `Timestamp`
- `ExecutionHistoryEntry.timestamp: number` → 应该改为 `Timestamp`
- `Thread.startTime: number` → 应该改为 `Timestamp`
- `Thread.endTime?: number` → 应该改为 `Timestamp`
- `ThreadResult.executionTime: number` → 应该改为 `Timestamp`

#### sdk/types/execution.ts
- `ExecutionMetadata.startTime: number` → 应该改为 `Timestamp`
- `ExecutionMetadata.endTime: number` → 应该改为 `Timestamp`

#### sdk/types/checkpoint.ts
- `Checkpoint.timestamp: number` → 应该改为 `Timestamp`

#### sdk/types/llm.ts
- `LLMResult.duration: number` → 应该改为 `Timestamp`

#### sdk/types/tool.ts
- `ToolCall.timestamp: number` → 应该改为 `Timestamp`
- `ToolCall.executionTime?: number` → 应该改为 `Timestamp`

#### sdk/types/events.ts
- `BaseEvent.timestamp: number` → 应该改为 `Timestamp`
- `ThreadCompletedEvent.executionTime: number` → 应该改为 `Timestamp`
- `NodeCompletedEvent.executionTime: number` → 应该改为 `Timestamp`
- `ToolCompletedEvent.executionTime: number` → 应该改为 `Timestamp`

---

## 3. Version 类型使用分析

### 应该使用但未使用的地方

#### sdk/types/workflow.ts
- `WorkflowDefinition.version: string` → 应该改为 `Version`

#### sdk/types/thread.ts
- `Thread.workflowVersion: string` → 应该改为 `Version`

---

## 4. Metadata 类型使用分析

### 应该使用但未使用的地方

#### sdk/types/workflow.ts
- `WorkflowMetadata.customFields?: Record<string, any>` → 应该改为 `Metadata`

#### sdk/types/node.ts
- `Node.metadata?: Record<string, any>` → 应该改为 `Metadata`

#### sdk/types/edge.ts
- `EdgeMetadata.customFields?: Record<string, any>` → 应该改为 `Metadata`

#### sdk/types/thread.ts
- `ThreadVariable.metadata?: Record<string, any>` → 应该改为 `Metadata`
- `ThreadMetadata.customFields?: Record<string, any>` → 应该改为 `Metadata`
- `ThreadResult.metadata?: Record<string, any>` → 应该改为 `Metadata`

#### sdk/types/execution.ts
- `ExecutionOptions.context?: Record<string, any>` → 应该改为 `Metadata`
- `ExecutionMetadata.customFields?: Record<string, any>` → 应该改为 `Metadata`
- `ExecutionContext.contextData: Record<string, any>` → 应该改为 `Metadata`

#### sdk/types/checkpoint.ts
- `CheckpointMetadata.customFields?: Record<string, any>` → 应该改为 `Metadata`

#### sdk/types/llm.ts
- `LLMProfile.metadata?: Record<string, any>` → 应该改为 `Metadata`
- `LLMResult.metadata?: Record<string, any>` → 应该改为 `Metadata`

#### sdk/types/tool.ts
- `ToolMetadata` 整个类型可以简化，直接使用 `Metadata`

#### sdk/types/events.ts
- `BaseEvent.metadata?: Record<string, any>` → 应该改为 `Metadata`

---

## 统计总结

| 类型 | 应该使用的位置数量 | 涉及的文件数 |
|------|------------------|-------------|
| ID | 43 | 9 |
| Timestamp | 20 | 7 |
| Version | 2 | 2 |
| Metadata | 14 | 9 |
| **总计** | **79** | **9** |

---

## 建议的修改步骤

1. **第一步**：在所有类型文件中导入 `common.ts` 中的类型
   ```typescript
   import type { ID, Timestamp, Version, Metadata } from './common';
   ```

2. **第二步**：按照上述分析，逐个文件修改类型定义

3. **第三步**：运行类型检查确保没有错误
   ```bash
   cd sdk
   tsc --noEmit
   ```

4. **第四步**：更新相关文档和注释

---

## 优势

使用这些通用类型的好处：

1. **类型安全**：提供更强的类型约束，避免类型错误
2. **代码一致性**：统一使用相同的类型定义，提高代码可读性
3. **工具函数**：可以使用 `IDUtils`、`TimestampUtils`、`VersionUtils`、`MetadataUtils` 提供的工具函数
4. **易于维护**：如果需要修改类型定义，只需修改一处
5. **文档化**：类型名称本身就提供了语义信息

---

## 注意事项

1. 修改类型后，需要同步更新 Core 层和 API 层的相关代码
2. 需要确保所有使用这些类型的地方都正确导入
3. 建议先修改 Types 层，然后逐步修改其他层
4. 修改后需要运行完整的测试套件确保功能正常
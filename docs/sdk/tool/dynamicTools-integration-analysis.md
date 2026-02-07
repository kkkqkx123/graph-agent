# dynamicTools 集成分析

## 概述

`dynamicTools` 是SDK中一种在运行时动态扩展可用工具集的机制。它允许LLM节点配置在执行时额外添加工具，而不仅仅依赖工作流级别的静态工具配置。

## 当前集成架构

### 1. 类型定义层（Types Layer）

**位置**: `sdk/types/node.ts` L185-190

```typescript
export interface LLMNodeConfig {
  // ... 其他字段 ...
  /** 动态工具配置 */
  dynamicTools?: {
    /** 要动态添加的工具ID或名称 */
    toolIds: string[];
    /** 工具描述模板（可选） */
    descriptionTemplate?: string;
  };
}
```

**关键点**:
- `dynamicTools` 在LLM节点配置中定义
- 包含 `toolIds` 列表和可选的 `descriptionTemplate`
- 类型已定义但在执行路径中**未被提取和使用**

### 2. 协调器层（Core Layer）

#### a. 参数定义 (`LLMExecutionParams`)

**位置**: `sdk/core/execution/coordinators/llm-execution-coordinator.ts` L30-50

```typescript
export interface LLMExecutionParams {
  // ... 其他字段 ...
  /** 动态工具配置 */
  dynamicTools?: {
    toolIds: string[];
    descriptionTemplate?: string;
  };
}
```

**关键点**:
- 定义了 `LLMExecutionParams` 接口支持 `dynamicTools` 参数
- 但这个参数在实际调用中**从未被填充**

#### b. 工具合并逻辑

**位置**: `sdk/core/execution/coordinators/llm-execution-coordinator.ts` L282-298

```typescript
private getAvailableTools(workflowTools: Set<string>, dynamicTools?: any): any[] {
  const allToolIds = new Set(workflowTools);
  
  // 添加动态工具
  if (dynamicTools?.toolIds) {
    dynamicTools.toolIds.forEach((id: string) => allToolIds.add(id));
  }
  
  return Array.from(allToolIds)
    .map(id => this.toolService.getTool(id))
    .filter(Boolean)
    .map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
}
```

**问题**: 
- 该方法定义了工具合并逻辑，但在 `executeLLMLoop()` 中**未被调用**
- 目前 `executeLLM()` 直接使用 `params.tools` 而不是调用 `getAvailableTools()`

### 3. 配置转换层（Handler）

**位置**: `sdk/core/execution/handlers/node-handlers/config-utils.ts` L86-94

```typescript
export function transformLLMNodeConfig(config: LLMNodeConfig): LLMExecutionRequestData {
  return {
    prompt: config.prompt || '',
    profileId: config.profileId,
    parameters: config.parameters || {},
    stream: false
  };
}
```

**问题**: 
- **dynamicTools 字段在这里被丢弃**，未被提取和传递
- 转换后的 `LLMExecutionRequestData` 中也没有 `dynamicTools` 字段

### 4. 上层协调调用

**位置**: `sdk/core/execution/coordinators/node-execution-coordinator.ts` L314-341

```typescript
private async executeLLMManagedNode(...): Promise<NodeExecutionResult> {
  const requestData = extractLLMRequestData(node, threadContext);
  
  // 调用 LLMExecutionCoordinator
  const result = await this.llmCoordinator.executeLLM(
    {
      threadId: threadContext.getThreadId(),
      nodeId: node.id,
      prompt: requestData.prompt,
      profileId: requestData.profileId,
      parameters: requestData.parameters,
      tools: requestData.tools  // ❌ dynamicTools 未被传递
    },
    threadContext.conversationManager
  );
}
```

**问题**: 
- 即使 `transformLLMNodeConfig` 提取了 `dynamicTools`，也未在这里传递

### 5. 消息管理层（Conversation Manager）

**位置**: `sdk/core/execution/managers/conversation-manager.ts` L42-50

```typescript
availableTools?: {
  /** 初始可用工具集合 */
  initial: Set<string>;
  /** 动态工具配置 */
  dynamicTools?: {
    toolIds: string[];
    descriptionTemplate?: string;
  };
};
```

**状态**:
- `ConversationManager` 构造函数中有 `dynamicTools` 配置支持
- 但从未在运行时被填充或使用

## 现有动态工具扩展机制

### ThreadContext 的动态工具添加

**位置**: `sdk/core/execution/context/thread-context.ts` L664-669

```typescript
/**
 * 添加动态工具到可用集合
 */
addDynamicTools(toolIds: string[]): void {
  toolIds.forEach(id => this.availableTools.add(id));
}
```

**说明**:
- 存在一个运行时添加动态工具的接口
- 但这是针对 `ThreadContext.availableTools` 的静态集合操作
- **与LLM节点配置中的 `dynamicTools` 没有整合**

## 集成流程中的断裂点

```
LLM节点配置 (dynamicTools)
         ↓
    提取配置 (extractLLMRequestData)
         ↓
    转换配置 (transformLLMNodeConfig) ❌ dynamicTools被丢弃
         ↓
    LLM协调器 (executeLLM) ❌ 无法接收dynamicTools
         ↓
    工具合并 (getAvailableTools) ❌ 未被调用
         ↓
    LLM执行 ❌ 工具列表不完整
```

## 当前缺失的集成点

| 步骤 | 位置 | 状态 | 需要修复 |
|------|------|------|---------|
| 1. 类型定义 | `sdk/types/node.ts` | ✅ 已定义 | - |
| 2. 参数接口 | `sdk/core/execution/coordinators/llm-execution-coordinator.ts` | ✅ 已定义 | - |
| 3. 工具合并逻辑 | `sdk/core/execution/coordinators/llm-execution-coordinator.ts#L282` | ✅ 已实现 | ❌ 未被使用 |
| 4. 配置提取 | `sdk/core/execution/handlers/node-handlers/config-utils.ts#L86` | ❌ 缺失提取 | ✅ 需要添加 |
| 5. 参数传递 | `sdk/core/execution/coordinators/node-execution-coordinator.ts#L331` | ❌ 未传递 | ✅ 需要传递 |
| 6. 执行循环使用 | `sdk/core/execution/coordinators/llm-execution-coordinator.ts#L193` | ❌ 未调用合并逻辑 | ✅ 需要使用 |

## 修复方案

### 步骤1: 增强配置转换
在 `config-utils.ts` 中修改 `transformLLMNodeConfig()`:

```typescript
export function transformLLMNodeConfig(config: LLMNodeConfig): LLMExecutionRequestData {
  return {
    prompt: config.prompt || '',
    profileId: config.profileId,
    parameters: config.parameters || {},
    dynamicTools: config.dynamicTools,  // ✅ 添加这行
    stream: false
  };
}
```

### 步骤2: 更新请求数据接口
在 `llm-executor.ts` 中添加 `dynamicTools`:

```typescript
export interface LLMExecutionRequestData {
  // ... 其他字段 ...
  dynamicTools?: {
    toolIds: string[];
    descriptionTemplate?: string;
  };
}
```

### 步骤3: 传递参数到协调器
在 `node-execution-coordinator.ts` L331-338 修改:

```typescript
const result = await this.llmCoordinator.executeLLM(
  {
    threadId: threadContext.getThreadId(),
    nodeId: node.id,
    prompt: requestData.prompt,
    profileId: requestData.profileId,
    parameters: requestData.parameters,
    tools: requestData.tools,
    dynamicTools: requestData.dynamicTools,  // ✅ 添加这行
  },
  threadContext.conversationManager
);
```

### 步骤4: 执行循环中使用工具合并
在 `llm-execution-coordinator.ts` 中修改 `executeLLMLoop()`:

```typescript
// 在executeLLMLoop中：
const allTools = params.dynamicTools 
  ? this.getAvailableTools(threadContext.availableTools, params.dynamicTools)
  : params.tools;

const llmResult = await this.llmExecutor.executeLLMCall(
  conversationState.getMessages(),
  {
    prompt,
    profileId: profileId || 'default',
    parameters: parameters || {},
    tools: allTools  // ✅ 使用合并后的工具列表
  }
);
```

## 消息管理中的工具描述处理

### 当前状态
`ConversationManager` 中的工具描述处理：

```typescript
// L405: getInitialToolDescriptionMessage() - 仅处理 initial 工具
getInitialToolDescriptionMessage(): LLMMessage | null {
  const initialToolIds = Array.from(this.availableTools.initial);
  // ... 生成工具描述消息 ...
}

// L440: startNewBatchWithInitialTools() - 添加初始工具描述
startNewBatchWithInitialTools(boundaryIndex: number): void {
  // ... 仅使用 initial 工具 ...
}
```

### 缺陷
- `dynamicTools` 在消息管理中被定义但未使用
- 缺少在提示词中包含动态工具描述的机制

## 总结

**dynamicTools 的当前集成状态**:
- ✅ 类型系统完整：从 LLMNodeConfig 到 LLMExecutionParams 都已定义
- ✅ 工具服务支持：ToolService 可以获取任意工具定义
- ✅ 合并逻辑存在：getAvailableTools() 方法已实现
- ❌ **配置传递链断裂**：从节点配置到执行参数的传递路径不完整
- ❌ **执行循环未使用**：合并后的工具列表未被应用到LLM调用

**关键修复点**:
1. `transformLLMNodeConfig()` - 需要提取并转发 dynamicTools
2. `LLMExecutionRequestData` - 需要添加 dynamicTools 字段
3. `node-execution-coordinator.executeLLMManagedNode()` - 需要传递 dynamicTools
4. `llm-execution-coordinator.executeLLMLoop()` - 需要调用 getAvailableTools()

这将形成完整的端到端集成：节点配置 → 参数提取 → 传递 → 工具合并 → LLM执行

# 动态 Prompts 模块集成指南

## 概述

基于对项目代码的深入分析，本文档阐述了 `sdk/resources/dynamic/prompts` 模块中 `buildDynamicContextMessages()` 等功能的**正确集成点**和**集成模式**。

## 核心集成链路

### 1. 消息转换管道架构

```
AgentLoopRuntimeConfig.transformContext
    ↓
AgentIterationCoordinator.executeIteration()
    ↓
CoreLLMExecutionCoordinator.executeLLMCallWithMessages()
    ↓
LLMExecutionCoordinator.execute()
    ↓
llm-handler.ts: 调用 transformContext(messages)
    ↓
LLMMessage[] (最终传给 LLM)
```

### 2. 流式执行路径

```
AgentLoopRuntimeConfig.transformContext
    ↓
AgentIterationCoordinator.executeIterationStream()
    ↓
CoreLLMExecutionCoordinator.executeLLMStream()
    ↓
llm-handler.ts: 调用 transformContext(messages)
    ↓
MessageStream (流式消息)
```

---

## 正确的集成点

### 集成点 1：应用层配置构造（CLI App / Web App）

**位置**：`apps/cli-app/src/adapters/agent-loop-adapter.ts` 或类似应用适配器

**当前实现**：
- ✅ `applySkillsToConfig()` - 注入技能到系统提示
- ✅ `applyWorkflowsToConfig()` - 注入工作流到系统提示
- ✅ `applyAgentsToConfig()` - 注入代理配置

**缺失的集成**：
- ❌ 应该在适配器中添加 `applyDynamicContextToConfig()` 方法

#### 建议的实现模式：

```typescript
/**
 * Apply dynamic context transformation to agent loop runtime config.
 * 
 * Configures the transformContext function to inject dynamic system context
 * before each LLM call, including:
 * - Current time and timezone
 * - Environment variables
 * - Available tools and their documentation
 * 
 * This enables the LLM to have real-time context awareness.
 */
async applyDynamicContextToConfig(
  config: AgentLoopRuntimeConfig,
  options?: {
    includeCurrentTime?: boolean;      // default: true
    includeEnvironment?: boolean;      // default: true
    includeToolDocumentation?: boolean; // default: true
    customFragments?: Record<string, () => Promise<LLMMessage>>;
  }
): Promise<void> {
  try {
    // 1. Build context configuration
    const contextConfig: DynamicContextConfig = {
      includeCurrentTime: options?.includeCurrentTime ?? true,
      includeEnvironment: options?.includeEnvironment ?? true,
      includeToolDocumentation: options?.includeToolDocumentation ?? true,
      includeAvailableTools: true,
      customFragments: options?.customFragments,
    };

    // 2. Create the transformContext function
    config.transformContext = async (messages: LLMMessage[], signal?: AbortSignal) => {
      const runtimeContext: DynamicRuntimeContext = {
        executionId: "dynamic-context",
        timestamp: Date.now(),
        messageCount: messages.length,
        config: contextConfig,
      };

      // 3. Call buildDynamicContextMessages from the prompts module
      const contextMessages = await buildDynamicContextMessages(
        messages,
        runtimeContext,
        signal,
      );

      // 4. Merge with original messages
      return [...contextMessages, ...messages];
    };

    this.output.infoLog("Dynamic context transformation enabled");
  } catch (error) {
    this.output.infoLog(
      "Dynamic context not configured: " +
        (error instanceof Error ? error.message : String(error))
    );
  }
}
```

### 集成点 2：配置加载流程（Config Processor）

**位置**：`sdk/api/shared/config/processors/agent-loop.ts`

**当前状态**：
- 从 YAML/JSON 加载静态配置
- 不处理可执行的 `transformContext` 函数（因为函数无法序列化）

**改进方向**：
```typescript
// 在 loadAgentLoopConfig 后添加应用层集成钩子
export async function loadAgentLoopWithDynamicContext(
  configId: string,
  applicator: {
    applyDynamicContextToConfig(config: AgentLoopRuntimeConfig): Promise<void>;
  }
): Promise<AgentLoopRuntimeConfig> {
  const config = await loadAgentLoopConfig(configId);
  
  // 应用动态上下文转换
  await applicator.applyDynamicContextToConfig(config);
  
  return config;
}
```

### 集成点 3：LLM 消息转换执行点

**位置**：`sdk/workflow/execution/handlers/node-handlers/llm-handler.ts` 和 `sdk/core/coordinators/llm-execution-coordinator.ts`

**当前实现**（已完成）：
```typescript
// llm-execution-coordinator.ts - 已实现的集成
async execute(
  messages: LLMMessage[],
  config: LLMCallConfig,
  context: ExecutionContext,
  transformContext?: TransformContextFn, // ← 这里接收函数
): Promise<LLMResult> {
  // 1. Apply transformContext if provided
  let finalMessages = messages;
  if (transformContext) {
    finalMessages = await transformContext(messages, context.abortSignal);
  }

  // 2. Call LLM with transformed messages
  return this.llmWrapper.call(finalMessages, config);
}
```

**对应的代理侧调用**（已完成）：
```typescript
// agent-iteration-coordinator.ts 第 150 行
const llmResult = await this.coreCoordinator.executeLLMCallWithMessages(
  conversationManager.getMessages(),
  { profileId, parameters: {}, tools: toolSchemas },
  { abortSignal, executionId: entity.id, nodeId: entity.nodeId },
  entity.config.transformContext, // ← 直接传递配置中的函数
);
```

---

## prompts 模块的三层 API

### 层级 1：用户侧公开接口（应该导出）

```typescript
// 应用层在配置中直接调用这个函数
export async function buildDynamicContextMessages(
  messages: LLMMessage[],
  runtimeContext: DynamicRuntimeContext,
  signal?: AbortSignal,
): Promise<LLMMessage[]>;
```

**用途**：作为 `transformContext` 的实现被应用层调用

### 层级 2：内部聚合接口（内部使用）

```typescript
// 在 buildDynamicContextMessages 内部调用，不应对外导出
async function buildDynamicContextText(
  config: DynamicContextConfig,
): Promise<string>;

async function buildCompletePrompt(
  config: DynamicContextConfig,
): Promise<{ system: string; dynamic: string }>;
```

### 层级 3：低级片段生成器（工具函数）

```typescript
// 细粒度的上下文片段生成，支持定制化需求
export function generateCurrentTimeSection(): string;
export function generateCompactToolsContent(tools: Tool[]): string;
export function generateEnvironmentContext(): EnvironmentContext;
```

---

## 集成步骤清单

### 第一阶段：应用层集成

- [ ] 在 `cli-app/adapters/agent-loop-adapter.ts` 中添加 `applyDynamicContextToConfig()` 方法
- [ ] 在 `web-app-backend/adapters/agent-loop-adapter.ts` 中添加相同方法（如果存在）
- [ ] 从 `buildDynamicContextMessages` 导入

```typescript
import { buildDynamicContextMessages, type DynamicContextConfig, type DynamicRuntimeContext } from "@wf-agent/sdk/resources";
```

### 第二阶段：配置流程整合

- [ ] 在应用层调用 `executeAgentLoop()` 前，调用 `applyDynamicContextToConfig()`
- [ ] 确保 `transformContext` 在执行时有权限访问必要的上下文（工具列表、环境变量等）

```typescript
// 在 agent-loop-adapter.ts 中
async executeAgentLoop(
  config: AgentLoopRuntimeConfig,
  options: AgentLoopEntityOptions = {},
): Promise<AgentLoopResult> {
  // 应用动态上下文前置
  await this.applyDynamicContextToConfig(config);
  
  // 执行
  return this.coordinator.execute(config, options);
}
```

### 第三阶段：可选：配置级动态上下文启用

- [ ] 在代理配置 YAML 中添加 `dynamicContextConfig` 段（JSON 格式，应用层解析）
- [ ] 应用层根据配置动态启用/禁用某些上下文片段

```yaml
# agent-config.yaml 示例
agentId: my-agent
profile: gpt-4
dynamicContextConfig:
  includeCurrentTime: true
  includeEnvironment: true
  includeToolDocumentation: true
  excludeFragments: []
```

---

## 已完成的下游集成

✅ **核心层**：
- `CoreLLMExecutionCoordinator.execute()` - 正确处理 `transformContext` 参数
- `llm-execution-coordinator.ts` - 在 LLM 调用前应用转换

✅ **代理层**：
- `AgentIterationCoordinator.executeIteration()` - 传递 `entity.config.transformContext`
- `AgentIterationCoordinator.executeIterationStream()` - 在流式模式下传递

✅ **类型定义**：
- `TransformContextFn` - 已在 `packages/types/src/agent-execution/context.ts` 中定义
- `DynamicContextConfig` / `DynamicRuntimeContext` - 已在 `context.ts` 中定义

---

## 关键设计原则

### 1. 分离关注点

- **SDK 层**：定义接口 (`transformContext?: TransformContextFn`)，但不实现具体的上下文逻辑
- **应用层**：提供具体的 `transformContext` 实现，根据应用需求定制
- **prompts 模块**：提供可复用的上下文生成函数供应用层调用

### 2. 可配置性

- 应用层可完全控制是否启用动态上下文
- 应用层可通过 `DynamicContextConfig` 选择启用哪些片段
- 应用层可提供自定义片段覆盖默认行为

### 3. 向后兼容

- `transformContext` 是可选的（默认为 `undefined`）
- 不提供 `transformContext` 时，系统正常工作，只是没有动态上下文注入
- 现有配置无需修改

---

## 代码示例：完整的应用层集成

```typescript
// apps/cli-app/src/commands/agent/run-agent.ts

import { buildDynamicContextMessages, type DynamicContextConfig } from "@wf-agent/sdk/resources";

async function runAgent(agentConfigId: string) {
  const adapter = new AgentLoopAdapter();
  
  // 1. 加载基础配置
  const config = await loadAgentLoopConfig(agentConfigId);
  
  // 2. 应用技能、工作流等集成
  adapter.applySkillsToConfig(config);
  await adapter.applyWorkflowsToConfig(config);
  adapter.applyAgentsToConfig(config);
  
  // 3. 应用动态上下文（新增）
  await adapter.applyDynamicContextToConfig(config, {
    includeCurrentTime: true,
    includeEnvironment: true,
    includeToolDocumentation: true,
  });
  
  // 4. 执行代理循环
  const result = await adapter.executeAgentLoop(config);
  
  return result;
}
```

---

## 已识别的未使用导出（清理建议）

这些导出在应用层集成后应被清理：

| 符号 | 状态 | 清理建议 |
|------|------|--------|
| `generateCurrentTimeSection()` | 零外部引用 | 删除（被 `generateCurrentTimeContent()` 替代） |
| `ENVIRONMENT_FRAGMENT_ID` | 零引用 | 删除 |
| `generateCompactToolsContent()` | 零外部引用 | 删除或改为内部函数 |
| `generateToolDocumentation()` | 零外部引用 | 删除或改为内部函数 |
| `setEnvironmentInfo()` / `resetEnvironmentInfo()` | 零引用 | 删除 |
| `buildCompletePrompt()` | 零外部引用 | 删除或改为内部函数 |

---

## 相关文档引用

- `sdk/resources/dynamic/prompts/ARCHITECTURE.md` - 模块内部架构
- `packages/types/src/agent-execution/context.ts` - `TransformContextFn` 类型定义
- `sdk/agent/execution/coordinators/agent-iteration-coordinator.ts` - 代理侧集成点
- `sdk/core/coordinators/llm-execution-coordinator.ts` - 核心 LLM 转换执行

---

## 总结

**动态 prompts 模块的正确集成点**：

1. **应用层适配器**（新增） - 在 `applyDynamicContextToConfig()` 中创建 `transformContext` 函数
2. **配置对象** - 作为 `AgentLoopRuntimeConfig.transformContext` 传入
3. **核心 LLM 协调器**（已实现） - 在 LLM 调用前调用此函数转换消息
4. **LLM 处理器**（已实现） - 使用转换后的消息调用 LLM

整个链路已在 SDK 中正确打通，**仅缺应用层的集成钩子**。


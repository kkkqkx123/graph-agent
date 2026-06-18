# 动态 Prompts 模块：集成点架构图

## 1. 配置流程：从应用层到执行层

```
┌─────────────────────────────────────────────────────────────────────┐
│                     应用层（CLI / Web App）                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ① 加载配置                                                         │
│     ↓                                                               │
│  config = loadAgentLoopConfig(configId)                            │
│                                                                     │
│  ② 应用集成（现有）                                                 │
│     ├─ applySkillsToConfig(config)                                 │
│     ├─ applyWorkflowsToConfig(config)                              │
│     └─ applyAgentsToConfig(config)                                 │
│                                                                     │
│  ③ 应用动态上下文（新增 - 集成点 1）                                │
│     ↓                                                               │
│  applyDynamicContextToConfig(config)  ← 创建 transformContext     │
│     ↓                                                               │
│  config.transformContext = async (msgs) => {                       │
│    return buildDynamicContextMessages(msgs, ...)                   │
│  }                                                                  │
│                                                                     │
│  ④ 执行代理循环                                                     │
│     ↓                                                               │
│  executeAgentLoop(config)                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│           SDK 层：代理循环协调器（已完成）                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  AgentLoopCoordinator.execute(config)                              │
│    ↓                                                               │
│  AgentLoopExecutor                                                 │
│    ↓                                                               │
│  AgentExecutionCoordinator                                         │
│    ↓                                                               │
│  AgentIterationCoordinator.executeIteration()                      │
│    │                                                               │
│    └─ config.transformContext ← 从这里取出                        │
│       ↓                                                            │
│       coreCoordinator.executeLLMCallWithMessages(                 │
│         messages,                                                 │
│         config,                                                   │
│         context,                                                  │
│         entity.config.transformContext  ← 集成点 2             │
│       )                                                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│         核心 LLM 层：LLM 执行协调器（已完成）                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  CoreLLMExecutionCoordinator.execute(                              │
│    messages,                                                       │
│    config,                                                         │
│    context,                                                        │
│    transformContext  ← 接收 transformContext 函数                  │
│  )                                                                 │
│    ↓                                                               │
│  LLMExecutionCoordinator.execute()  ← 集成点 3                    │
│    │                                                               │
│    ├─ if (transformContext) {  ← 检查是否提供了转换函数           │
│    │    finalMessages = await transformContext(                   │
│    │      messages,                                               │
│    │      abortSignal                                             │
│    │    )                                                         │
│    │  }                                                           │
│    │                                                               │
│    └─ llm-handler.ts: execute(finalMessages, config)             │
│       ↓                                                            │
│       调用 LLM API 提供商（OpenAI / Anthropic / etc）            │
│       ↓                                                            │
│       return LLMResult                                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  LLM 响应处理                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  处理 LLM 响应                                                      │
│    ├─ 最终答案 → 完成迭代                                          │
│    └─ 工具调用 → 执行工具 → 继续迭代                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 消息转换流程：详细视图

```
┌──────────────────────────────────────────────────────────────────────┐
│                    AgentIterationCoordinator                         │
│                   executeIteration() 方法                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1️⃣ 获取消息                                                        │
│     messages = conversationManager.getMessages()                    │
│     例：[                                                           │
│       { role: "user", content: "What is 2+2?" },                  │
│       { role: "assistant", content: "..." },                      │
│       ...（可能包含很多历史消息）                                  │
│     ]                                                               │
│                                                                      │
│  2️⃣ 调用 LLM 时应用转换                                             │
│     const llmResult = await this.coreCoordinator              │
│       .executeLLMCallWithMessages(                                 │
│         messages,                                                  │
│         { profileId, parameters: {}, tools: toolSchemas },        │
│         context,                                                   │
│         entity.config.transformContext  ← 💡 关键：从 config 传入  │
│       )                                                             │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────────────────────┐
│                CoreLLMExecutionCoordinator                          │
│                executeLLMCallWithMessages()                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  向下转调至：                                                        │
│    llmWrapper.call(                                                │
│      messages,                                                     │
│      transformContext  ← 转发给核心层                              │
│    )                                                               │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────────────────────┐
│                  LLMExecutionCoordinator.execute()                  │
│                    (核心 LLM 执行)                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🔄 转换消息                                                         │
│     ┌─────────────────────────────────────────────────────────┐   │
│     │ if (transformContext) {                                 │   │
│     │   finalMessages = await transformContext(              │   │
│     │     messages,                                          │   │
│     │     { abortSignal, executionId, ... }                 │   │
│     │   )                                                    │   │
│     │ } else {                                               │   │
│     │   finalMessages = messages                            │   │
│     │ }                                                      │   │
│     └─────────────────────────────────────────────────────────┘   │
│                            ↓                                        │
│     💡 这是应用 buildDynamicContextMessages() 的地方                │
│        transformContext 就是应用层创建的这个函数！                  │
│                            ↓                                        │
│     finalMessages = [                                              │
│       { role: "system", content: "Current time: 2026-06-18 10:30" │
│       { role: "system", content: "Available tools:\n- tool1\n..." }, │
│       { role: "user", content: "What is 2+2?" },                 │
│       ... (原始消息)                                               │
│     ]                                                              │
│                                                                      │
│  📤 调用 LLM                                                        │
│     return this.llmWrapper.call(finalMessages, config)            │
│            ↓                                                       │
│       发送到 OpenAI / Anthropic / Gemini API                      │
│            ↓                                                       │
│       LLM 使用最新的系统上下文生成响应                               │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. 应用层中 transformContext 的创建

```typescript
// ┌─ 应用层适配器 ─────────────────────────────────────┐
// │ agents/cli-app/src/adapters/agent-loop-adapter.ts  │
// └──────────────────────────────────────────────────────┘

class AgentLoopAdapter {
  async applyDynamicContextToConfig(
    config: AgentLoopRuntimeConfig,
    options?: DynamicContextOptions
  ): Promise<void> {
    
    // 步骤 1️⃣：创建 transformContext 函数
    config.transformContext = async (
      messages: LLMMessage[],
      signal?: AbortSignal
    ) => {
      // ┌─ 调用 prompts 模块的核心函数 ─────┐
      // │ sdk/resources/dynamic/prompts      │
      // └───────────────────────────────────┘
      
      const runtimeContext: DynamicRuntimeContext = {
        executionId: "runtime-id",
        timestamp: Date.now(),
        messageCount: messages.length,
        config: {
          includeCurrentTime: true,
          includeEnvironment: true,
          includeToolDocumentation: true,
        }
      };
      
      // 💡 关键调用点：buildDynamicContextMessages
      const contextMessages = await buildDynamicContextMessages(
        messages,
        runtimeContext,
        signal
      );
      
      // 返回：动态上下文消息 + 原始消息
      return [...contextMessages, ...messages];
    };
  }
}

// ┌─ 使用流程 ──────────────────────┐
// │ 在代理启动命令中              │
// └──────────────────────────────┘

async function runAgent(agentConfigId: string) {
  const adapter = new AgentLoopAdapter();
  
  // 1. 加载配置
  const config = await loadAgentLoopConfig(agentConfigId);
  
  // 2. 应用所有集成（包括动态上下文）
  await adapter.applyDynamicContextToConfig(config);
  
  // 3. 现在 config.transformContext 已设置，
  //    代理循环会自动在每个 LLM 调用时使用它
  
  // 4. 执行
  const result = await adapter.executeAgentLoop(config);
}
```

---

## 4. prompts 模块内部：buildDynamicContextMessages 实现

```
┌─────────────────────────────────────────────────────────────┐
│      buildDynamicContextMessages()                          │
│   (sdk/resources/dynamic/prompts/context.ts)               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  输入：                                                     │
│    - messages: LLMMessage[]                                │
│    - runtimeContext: DynamicRuntimeContext                 │
│    - signal: AbortSignal                                   │
│                                                             │
│  处理流程：                                                 │
│                                                             │
│  1️⃣ 生成动态上下文片段                                     │
│     ┌──────────────────────────────────────┐              │
│     │ // 时间片段                          │              │
│     │ if (includeCurrentTime) {            │              │
│     │   timeMsg = generateCurrentTime()    │              │
│     │ }                                    │              │
│     │                                      │              │
│     │ // 环境片段                          │              │
│     │ if (includeEnvironment) {            │              │
│     │   envMsg = generateEnvironment()     │              │
│     │ }                                    │              │
│     │                                      │              │
│     │ // 工具片段                          │              │
│     │ if (includeToolDocumentation) {      │              │
│     │   toolsMsg = generateToolsDoc()      │              │
│     │ }                                    │              │
│     └──────────────────────────────────────┘              │
│                                                             │
│  2️⃣ 组织成 LLMMessage 对象                                │
│     return [                                              │
│       { role: "system", content: timeContent },           │
│       { role: "system", content: envContent },            │
│       { role: "system", content: toolsContent },          │
│     ]                                                     │
│                                                             │
│  输出：LLMMessage[] (系统上下文消息)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 完整的消息流示例

```
初始消息历史：
┌──────────────────────────────┐
│ [                            │
│   {                          │
│     role: "user",            │
│     content: "What time..."  │
│   },                         │
│   {                          │
│     role: "assistant",       │
│     content: "..."           │
│   }                          │
│ ]                            │
└──────────────────────────────┘
           ↓
    transformContext()
    应用 buildDynamicContextMessages()
           ↓
转换后的消息：
┌─────────────────────────────────────────┐
│ [                                       │
│   {                                     │
│     role: "system",                     │
│     content: "Current time: 2026-06-18" │
│   },                                    │
│   {                                     │
│     role: "system",                     │
│     content: "Available tools:\n..."    │
│   },                                    │
│   {                                     │
│     role: "system",                     │
│     content: "Environment: NODE_ENV=..."│
│   },                                    │
│   {  ← 原始消息                         │
│     role: "user",                       │
│     content: "What time..."             │
│   },                                    │
│   {                                     │
│     role: "assistant",                  │
│     content: "..."                      │
│   }                                     │
│ ]                                       │
└─────────────────────────────────────────┘
           ↓
      发送给 LLM
```

---

## 6. 关键集成点速览表

| 集成点 | 文件位置 | 当前状态 | 操作 |
|-------|---------|--------|------|
| 1️⃣ | `apps/cli-app/src/adapters/agent-loop-adapter.ts` | ❌ 缺失 | 添加 `applyDynamicContextToConfig()` |
| 2️⃣ | `sdk/agent/execution/coordinators/agent-iteration-coordinator.ts` | ✅ 完成 | 已在第 150 行传递 `transformContext` |
| 3️⃣ | `sdk/core/coordinators/llm-execution-coordinator.ts` | ✅ 完成 | 已调用 `transformContext(messages)` |
| - | `sdk/resources/dynamic/prompts/context.ts` | ✅ 完成 | `buildDynamicContextMessages()` 已实现 |

---

## 7. 状态转移示例

```
应用层决策：
  ├─ 启用动态上下文
  │  └─ 创建 transformContext = async (msgs) => buildDynamicContextMessages(...)
  │
  └─ 禁用动态上下文
     └─ transformContext = undefined (或不设置)

↓

配置对象：
  config = {
    profileId: "gpt-4",
    systemPrompt: "...",
    transformContext: <function>  ← 或 undefined
  }

↓

执行时：
  ├─ transformContext 被定义
  │  └─ 每次 LLM 调用都应用转换 ✅
  │
  └─ transformContext 未定义
     └─ 跳过转换，直接使用原始消息 ✅
```

---

## 总结：集成点地图

```
应用层
  ↓
  执行器创建 transformContext 函数
  ↓
  传入 AgentLoopRuntimeConfig
  ↓
代理层
  ↓
  每次迭代时从 config 取出 transformContext
  ↓
  传给 CoreLLMExecutionCoordinator
  ↓
核心层
  ↓
  在 LLM 调用前调用 transformContext(messages)
  ↓
  获得转换后的消息
  ↓
  发送给 LLM API
```


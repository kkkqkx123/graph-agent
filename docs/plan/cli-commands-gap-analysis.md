# CLI 命令功能对比分析

## 概述

本文档对比 `sdk/api` 目录中定义的功能与 `apps/cli-app/src/commands` 目录中已实现的命令，识别需要补充的功能。

---

## 一、SDK API 资源管理功能

### 1.1 已实现的命令组

| 资源类型 | SDK API | CLI 命令组 | 状态 |
|---------|---------|-----------|------|
| 检查点 | CheckpointResourceAPI | checkpoint | ✅ 已实现 |
| 节点模板 | NodeTemplateRegistryAPI | template | ✅ 已实现 |
| 触发器模板 | TriggerTemplateRegistryAPI | template | ✅ 已实现 |
| 线程 | ThreadRegistryAPI | thread | ✅ 已实现 |
| 工作流 | WorkflowRegistryAPI | workflow | ✅ 已实现 |

### 1.2 缺失的命令组

| 资源类型 | SDK API | CLI 命令组 | 优先级 | 说明 |
|---------|---------|-----------|--------|------|
| **LLM Profile** | LLMProfileRegistryAPI | llm-profile | 🔴 高 | 管理 LLM 配置文件 |
| **脚本** | ScriptRegistryAPI | script | 🔴 高 | 脚本注册、执行、管理 |
| **工具** | ToolRegistryAPI | tool | 🔴 高 | 工具注册、执行、管理 |
| **触发器** | TriggerResourceAPI | trigger | 🟡 中 | 触发器启用/禁用管理 |
| **消息** | MessageResourceAPI | message | 🟡 中 | 查看线程消息历史 |
| **变量** | VariableResourceAPI | variable | 🟡 中 | 查看线程变量 |
| **事件** | EventResourceAPI | event | 🟢 低 | 查看系统事件历史 |
| **Human Relay** | HumanRelayResourceAPI | human-relay | 🟢 低 | Human Relay 配置管理 |

---

## 二、SDK API 命令功能

### 2.1 已实现的命令

| 命令类型 | SDK 命令 | CLI 命令 | 状态 |
|---------|---------|---------|------|
| 检查点 | RestoreFromCheckpointCommand | checkpoint load | ✅ 已实现 |
| 线程执行 | ExecuteThreadCommand | thread run | ✅ 已实现 |
| 线程控制 | PauseThreadCommand | thread pause | ✅ 已实现 |
| 线程控制 | ResumeThreadCommand | thread resume | ✅ 已实现 |
| 线程控制 | StopThreadCommand | thread stop | ✅ 已实现 |

### 2.2 缺失的命令

| 命令类型 | SDK 命令 | CLI 命令 | 优先级 | 说明 |
|---------|---------|---------|--------|------|
| **LLM 生成** | GenerateCommand | llm generate | 🔴 高 | 单次 LLM 生成 |
| **LLM 批量生成** | GenerateBatchCommand | llm generate-batch | 🔴 高 | 批量 LLM 生成 |
| **脚本执行** | ExecuteScriptCommand | script execute | 🔴 高 | 执行已注册脚本 |
| **工具执行** | ExecuteToolCommand | tool execute | 🔴 高 | 执行已注册工具 |
| **触发器控制** | EnableTriggerCommand | trigger enable | 🟡 中 | 启用触发器 |
| **触发器控制** | DisableTriggerCommand | trigger disable | 🟡 中 | 禁用触发器 |

---

## 三、详细功能分析

### 3.1 LLM Profile 命令组（缺失）

**SDK API**: [`LLMProfileRegistryAPI`](../../sdk/api/resources/llm/llm-profile-registry-api.ts)

**需要实现的命令**:
- `llm-profile register <file>` - 从文件注册 LLM Profile
- `llm-profile register-batch <directory>` - 批量注册 LLM Profile
- `llm-profile list` - 列出所有 LLM Profile
- `llm-profile show <id>` - 查看 LLM Profile 详情
- `llm-profile delete <id>` - 删除 LLM Profile
- `llm-profile update <id>` - 更新 LLM Profile
- `llm-profile validate <file>` - 验证 LLM Profile 配置

**需要创建的适配器**: `LLMProfileAdapter`

---

### 3.2 脚本命令组（缺失）

**SDK API**: [`ScriptRegistryAPI`](../../sdk/api/resources/scripts/script-registry-api.ts)

**需要实现的命令**:
- `script register <file>` - 从文件注册脚本
- `script register-batch <directory>` - 批量注册脚本
- `script list` - 列出所有脚本
- `script show <id>` - 查看脚本详情
- `script delete <id>` - 删除脚本
- `script execute <id>` - 执行脚本（对应 ExecuteScriptCommand）
- `script validate <file>` - 验证脚本配置

**需要创建的适配器**: `ScriptAdapter`

---

### 3.3 工具命令组（缺失）

**SDK API**: [`ToolRegistryAPI`](../../sdk/api/resources/tools/tool-registry-api.ts)

**需要实现的命令**:
- `tool register <file>` - 从文件注册工具
- `tool register-batch <directory>` - 批量注册工具
- `tool list` - 列出所有工具
- `tool show <id>` - 查看工具详情
- `tool delete <id>` - 删除工具
- `tool execute <id>` - 执行工具（对应 ExecuteToolCommand）
- `tool validate <file>` - 验证工具配置

**需要创建的适配器**: `ToolAdapter`

---

### 3.4 触发器命令组（缺失）

**SDK API**: [`TriggerResourceAPI`](../../sdk/api/resources/triggers/trigger-resource-api.ts)

**需要实现的命令**:
- `trigger list` - 列出所有触发器
- `trigger show <id>` - 查看触发器详情
- `trigger enable <id>` - 启用触发器（对应 EnableTriggerCommand）
- `trigger disable <id>` - 禁用触发器（对应 DisableTriggerCommand）

**需要创建的适配器**: `TriggerAdapter`

---

### 3.5 消息命令组（缺失）

**SDK API**: [`MessageResourceAPI`](../../sdk/api/resources/messages/message-resource-api.ts)

**需要实现的命令**:
- `message list <thread-id>` - 列出线程的所有消息
- `message show <message-id>` - 查看消息详情
- `message stats <thread-id>` - 查看消息统计信息

**需要创建的适配器**: `MessageAdapter`

---

### 3.6 变量命令组（缺失）

**SDK API**: [`VariableResourceAPI`](../../sdk/api/resources/variables/variable-resource-api.ts)

**需要实现的命令**:
- `variable list <thread-id>` - 列出线程的所有变量
- `variable show <thread-id> <variable-name>` - 查看变量值
- `variable set <thread-id> <variable-name> <value>` - 设置变量值

**需要创建的适配器**: `VariableAdapter`

---

### 3.7 事件命令组（缺失）

**SDK API**: [`EventResourceAPI`](../../sdk/api/resources/events/event-resource-api.ts)

**需要实现的命令**:
- `event list` - 列出所有事件
- `event show <event-id>` - 查看事件详情
- `event stats` - 查看事件统计信息
- `event watch` - 实时监听事件流

**需要创建的适配器**: `EventAdapter`

---

### 3.8 Human Relay 命令组（缺失）

**SDK API**: [`HumanRelayResourceAPI`](../../sdk/api/resources/human-relay/human-relay-resource-api.ts)

**需要实现的命令**:
- `human-relay register <file>` - 注册 Human Relay 配置
- `human-relay list` - 列出所有配置
- `human-relay show <id>` - 查看配置详情
- `human-relay delete <id>` - 删除配置
- `human-relay enable <id>` - 启用配置
- `human-relay disable <id>` - 禁用配置

**需要创建的适配器**: `HumanRelayAdapter`

---

### 3.9 LLM 生成命令（缺失）

**SDK 命令**: [`GenerateCommand`](../../sdk/api/operations/commands/llm/generate-command.ts), [`GenerateBatchCommand`](../../sdk/api/operations/commands/llm/generate-batch-command.ts)

**需要实现的命令**:
- `llm generate <profile-id>` - 使用指定 Profile 生成内容
- `llm generate-batch <profile-id>` - 批量生成内容

**可以集成到**: `llm-profile` 命令组或创建独立的 `llm` 命令组

---

## 四、优先级建议

### 🔴 高优先级（核心功能）

1. **LLM Profile 命令组** - LLM 配置管理是基础功能
2. **脚本命令组** - 脚本执行是工作流的重要组成部分
3. **工具命令组** - 工具执行是工作流的重要组成部分
4. **LLM 生成命令** - 直接调用 LLM 的能力

### 🟡 中优先级（增强功能）

5. **触发器命令组** - 触发器管理功能
6. **消息命令组** - 查看对话历史
7. **变量命令组** - 调试和监控变量状态

### 🟢 低优先级（辅助功能）

8. **事件命令组** - 系统事件监控
9. **Human Relay 命令组** - 特殊场景功能

---

## 五、实现建议

### 5.1 命令组结构

建议按照以下结构组织命令：

```
apps/cli-app/src/commands/
├── checkpoint/          # ✅ 已实现
├── template/            # ✅ 已实现
├── thread/              # ✅ 已实现
├── workflow/            # ✅ 已实现
├── llm-profile/         # ❌ 待实现
├── script/              # ❌ 待实现
├── tool/                # ❌ 待实现
├── trigger/             # ❌ 待实现
├── message/             # ❌ 待实现
├── variable/            # ❌ 待实现
├── event/               # ❌ 待实现
└── human-relay/         # ❌ 待实现
```

### 5.2 适配器结构

```
apps/cli-app/src/adapters/
├── base-adapter.ts      # ✅ 已实现
├── checkpoint-adapter.ts    # ✅ 已实现
├── template-adapter.ts      # ✅ 已实现
├── thread-adapter.ts        # ✅ 已实现
├── workflow-adapter.ts      # ✅ 已实现
├── llm-profile-adapter.ts   # ❌ 待实现
├── script-adapter.ts        # ❌ 待实现
├── tool-adapter.ts          # ❌ 待实现
├── trigger-adapter.ts       # ❌ 待实现
├── message-adapter.ts       # ❌ 待实现
├── variable-adapter.ts      # ❌ 待实现
├── event-adapter.ts         # ❌ 待实现
└── human-relay-adapter.ts   # ❌ 待实现
```

### 5.3 格式化工具

需要为新的资源类型添加格式化函数：

- `formatLLMProfile()`
- `formatScript()`
- `formatTool()`
- `formatTrigger()`
- `formatMessage()`
- `formatVariable()`
- `formatEvent()`
- `formatHumanRelay()`

---

## 六、总结

### 缺失功能统计

- **命令组**: 8 个缺失（共 13 个）
- **适配器**: 8 个缺失（共 13 个）
- **命令**: 约 50+ 个命令待实现

### 实施路线图

1. **第一阶段**: 实现高优先级命令组（LLM Profile、脚本、工具）
2. **第二阶段**: 实现中优先级命令组（触发器、消息、变量）
3. **第三阶段**: 实现低优先级命令组（事件、Human Relay）

### 注意事项

1. 所有适配器应继承 `BaseAdapter` 以保持一致性
2. 命令选项应遵循现有模式（如 `-v, --verbose`, `-t, --table`）
3. 错误处理应使用统一的日志记录方式
4. 输出格式应支持 JSON 和表格两种模式
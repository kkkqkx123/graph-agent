# CLI 应用配置集成实施总结

## 完成的工作

### 1. 创建 ConfigManager

**文件**: [`apps/cli-app/src/config/config-manager.ts`](apps/cli-app/src/config/config-manager.ts:1)

**功能**:
- 统一的配置加载接口
- 支持单文件和批量加载
- 使用 SDK config 模块进行解析和验证
- 支持配置继承和注册表模式

**核心方法**:
```typescript
// 单文件加载
loadWorkflow(filePath, parameters?)
loadNodeTemplate(filePath)
loadTriggerTemplate(filePath)
loadScript(filePath)

// 批量加载
loadWorkflows(options)
loadNodeTemplates(options)
loadTriggerTemplates(options)
loadScripts(options)

// 注册表加载
loadFromRegistry(registryPath, options)
```

### 2. 重构 WorkflowAdapter

**文件**: [`apps/cli-app/src/adapters/workflow-adapter.ts`](apps/cli-app/src/adapters/workflow-adapter.ts:1)

**改进**:
- 使用 ConfigManager 替换直接文件读取
- 移除了 `parseWorkflowFile` 方法（不再需要）
- 添加了 `registerFromDirectory` 方法支持批量注册
- 支持运行时参数替换

**新增方法**:
```typescript
async registerFromFile(filePath: string, parameters?: Record<string, any>)
async registerFromDirectory(options: ConfigLoadOptions)
```

### 3. 重构 TemplateAdapter

**文件**: [`apps/cli-app/src/adapters/template-adapter.ts`](apps/cli-app/src/adapters/template-adapter.ts:1)

**改进**:
- 使用 ConfigManager 替换直接文件读取
- 移除了 `parseTemplateFile` 方法（不再需要）
- 添加了批量注册方法
- 支持节点模板和触发器模板的批量加载

**新增方法**:
```typescript
async registerNodeTemplatesFromDirectory(options: ConfigLoadOptions)
async registerTriggerTemplatesFromDirectory(options: ConfigLoadOptions)
```

### 4. 更新 CLI 命令

**文件**: 
- [`apps/cli-app/src/commands/workflow/index.ts`](apps/cli-app/src/commands/workflow/index.ts:1)
- [`apps/cli-app/src/commands/template/index.ts`](apps/cli-app/src/commands/template/index.ts:1)

**新增命令**:

#### 工作流命令
```bash
# 注册单个工作流（支持参数）
modular-agent workflow register <file> --params '{"model": "gpt-4"}'

# 批量注册工作流
modular-agent workflow register-batch <directory> [--recursive] [--pattern <pattern>]
```

#### 模板命令
```bash
# 批量注册节点模板
modular-agent template register-nodes-batch <directory> [--recursive] [--pattern <pattern>]

# 批量注册触发器模板
modular-agent template register-triggers-batch <directory> [--recursive] [--pattern <pattern>]
```

## 架构改进

### 之前的架构问题

1. **配置加载逻辑分散**
   - Adapters 中直接进行文件读取和解析
   - 配置加载逻辑与业务逻辑混合
   - 重复实现解析逻辑

2. **不支持批量加载**
   - 只支持单个文件加载
   - 无法利用 SDK 的批量解析功能

3. **未使用 SDK 抽象**
   - 重复造轮子
   - 功能不完整（缺少验证、参数替换等）

### 改进后的架构

```
CLI 命令
  ↓
Adapters (业务逻辑)
  ↓
ConfigManager (配置加载)
  ↓
SDK config (解析和验证)
  ↓
文件系统
```

**关键改进**:
- ✅ 配置加载逻辑完全独立
- ✅ 使用 SDK config 模块
- ✅ 支持批量加载
- ✅ 支持参数替换
- ✅ 支持配置继承
- ✅ 支持注册表模式

## 使用示例

### 1. 注册单个工作流（带参数）

```bash
# 工作流配置文件中使用 {{parameters.model}} 占位符
modular-agent workflow register ./workflows/chat-workflow.json --params '{"model": "gpt-4-turbo"}'
```

### 2. 批量注册工作流

```bash
# 从目录批量注册所有工作流
modular-agent workflow register-batch ./workflows

# 递归加载子目录
modular-agent workflow register-batch ./workflows --recursive

# 使用文件模式过滤
modular-agent workflow register-batch ./workflows --pattern "^prod-.*\.json$"
```

### 3. 批量注册节点模板

```bash
# 从目录批量注册所有节点模板
modular-agent template register-nodes-batch ./templates/node-templates

# 递归加载子目录
modular-agent template register-nodes-batch ./templates/node-templates --recursive
```

### 4. 批量注册触发器模板

```bash
# 从目录批量注册所有触发器模板
modular-agent template register-triggers-batch ./templates/trigger-templates
```

## 配置文件示例

### 工作流配置（支持参数替换）

```json
{
  "id": "chat-workflow",
  "name": "聊天工作流",
  "version": "1.0.0",
  "createdAt": 0,
  "updatedAt": 0,
  "nodes": [
    {
      "id": "llm",
      "type": "LLM",
      "name": "LLM节点",
      "config": {
        "profileId": "{{parameters.model}}"
      },
      "outgoingEdgeIds": [],
      "incomingEdgeIds": []
    }
  ],
  "edges": []
}
```

### TOML 格式配置

```toml
id = "chat-workflow"
name = "聊天工作流"
version = "1.0.0"
createdAt = 0
updatedAt = 0

[[nodes]]
id = "llm"
type = "LLM"
name = "LLM节点"

[nodes.config]
profileId = "{{parameters.model}}"

outgoingEdgeIds = []
incomingEdgeIds = []

[[edges]]
```

## 技术细节

### ConfigManager 的设计

**职责**:
- 统一的配置加载接口
- 文件系统扫描
- 格式检测
- 调用 SDK 解析和验证

**不负责**:
- 业务逻辑
- 注册到 SDK
- 错误处理（由调用者处理）

### Adapters 的改进

**之前**:
```typescript
// 直接读取和解析
const content = await readFile(filePath, 'utf-8');
const workflow = this.parseWorkflowFile(content, filePath);
```

**现在**:
```typescript
// 使用 ConfigManager
const workflow = await this.configManager.loadWorkflow(filePath, parameters);
```

### 错误处理

批量操作会返回详细的结果：

```typescript
{
  success: [...],  // 成功加载的配置
  failures: [      // 失败的文件和错误信息
    {
      filePath: "...",
      error: "..."
    }
  ]
}
```

## 兼容性

### 向后兼容

- ✅ 单文件注册命令保持不变
- ✅ 现有配置文件格式完全兼容
- ✅ 不影响 [`config-loader.ts`](apps/cli-app/src/config/config-loader.ts:1)（CLI 应用配置）

### 新功能

- ✅ 批量注册命令
- ✅ 参数替换支持
- ✅ 文件模式过滤
- ✅ 递归目录扫描

## 性能优化

1. **批量加载**: 一次性加载多个配置，减少 I/O 操作
2. **并行处理**: 可以并行解析多个配置文件
3. **缓存**: ConfigManager 可以添加缓存机制（未来优化）

## 未来改进

### 短期
- [ ] 添加配置验证命令
- [ ] 添加配置导出功能
- [ ] 改进错误信息显示

### 中期
- [ ] 添加配置热重载
- [ ] 添加配置版本管理
- [ ] 添加配置依赖管理

### 长期
- [ ] 添加配置可视化工具
- [ ] 添加配置迁移工具
- [ ] 添加配置测试工具

## 总结

本次重构实现了以下目标：

1. ✅ **配置加载逻辑独立**: 创建了 ConfigManager 统一处理配置加载
2. ✅ **使用 SDK 抽象**: 完全依赖 SDK 的 config 模块
3. ✅ **支持批量加载**: 支持从目录批量加载配置
4. ✅ **支持参数替换**: 支持运行时参数替换
5. ✅ **架构清晰**: 职责分离，易于维护和扩展

**关键文件**:
- [`apps/cli-app/src/config/config-manager.ts`](apps/cli-app/src/config/config-manager.ts:1) - 配置管理器
- [`apps/cli-app/src/adapters/workflow-adapter.ts`](apps/cli-app/src/adapters/workflow-adapter.ts:1) - 工作流适配器
- [`apps/cli-app/src/adapters/template-adapter.ts`](apps/cli-app/src/adapters/template-adapter.ts:1) - 模板适配器
- [`apps/cli-app/src/commands/workflow/index.ts`](apps/cli-app/src/commands/workflow/index.ts:1) - 工作流命令
- [`apps/cli-app/src/commands/template/index.ts`](apps/cli-app/src/commands/template/index.ts:1) - 模板命令

**相关文档**:
- [`docs/plan/cli-config-integration-plan-v2.md`](docs/plan/cli-config-integration-plan-v2.md:1) - 详细设计方案
- [`sdk/api/config/README.md`](sdk/api/config/README.md:1) - SDK config 模块文档
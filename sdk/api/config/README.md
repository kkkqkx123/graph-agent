# 配置模块使用指南

## 概述

配置模块提供了从外部配置文件（TOML/JSON）加载和解析工作流定义的功能。该模块支持参数化配置、配置验证和自动转换为WorkflowDefinition。

## 核心组件

### 1. ConfigParser
主配置解析器，整合了TOML/JSON解析、验证和转换功能。

### 2. TomlParser
TOML格式解析器（需要安装 `@iarna/toml` 或 `toml` 包）。

### 3. JsonParser
JSON格式解析器。

### 4. ConfigValidator
配置验证器，验证配置文件的有效性。

### 5. ConfigTransformer
配置转换器，将配置文件格式转换为WorkflowDefinition。

## 使用方式

### 方式1：通过WorkflowBuilder加载配置

```typescript
import { WorkflowBuilder } from '@modular-agent/sdk';

// 从配置文件内容加载
const builder = WorkflowBuilder.fromConfig(
  configContent,
  'json', // 或 'toml'
  { model: 'gpt-4' } // 可选的运行时参数
);

// 从配置文件路径加载
const builder = await WorkflowBuilder.fromConfigFile(
  './workflows/chat-workflow.json',
  { model: 'gpt-4' }
);

// 构建工作流定义
const workflowDef = builder.build();
```

### 方式2：通过ConfigurationAPI加载配置

```typescript
import { ConfigurationAPI } from '@modular-agent/sdk';

const configAPI = new ConfigurationAPI();

// 加载并注册工作流
const workflowId = await configAPI.loadAndRegisterWorkflow(
  './workflows/chat-workflow.json',
  { model: 'gpt-4' }
);

// 仅加载工作流定义（不注册）
const workflowDef = await configAPI.loadWorkflowDefinition(
  './workflows/chat-workflow.json',
  { model: 'gpt-4' }
);

// 验证配置文件
const validationResult = await configAPI.validateConfigFile(
  './workflows/chat-workflow.json'
);

if (!validationResult.valid) {
  console.error('配置验证失败:', validationResult.errors);
}
```

### 方式3：直接使用ConfigParser

```typescript
import { ConfigParser, ConfigFormat } from '@modular-agent/sdk';

const parser = new ConfigParser();

// 解析并转换配置
const workflowDef = parser.parseAndTransform(
  configContent,
  ConfigFormat.JSON,
  { model: 'gpt-4' }
);

// 从文件加载
const workflowDef = await parser.loadAndTransform(
  './workflows/chat-workflow.json',
  { model: 'gpt-4' }
);

// 导出工作流为配置文件
await parser.saveWorkflow(workflowDef, './workflows/exported.json');
```

## 配置文件格式

### JSON格式示例

```json
{
  "workflow": {
    "id": "example-chat",
    "name": "示例聊天工作流",
    "description": "一个简单的聊天工作流示例",
    "version": "1.0.0",
    "parameters": {
      "model": {
        "type": "string",
        "default": "gpt-4o-mini",
        "description": "使用的LLM模型"
      }
    },
    "nodes": [
      {
        "id": "start",
        "type": "START",
        "name": "开始",
        "config": {}
      },
      {
        "id": "chat_llm",
        "type": "LLM",
        "name": "聊天LLM",
        "config": {
          "profileId": "{{parameters.model}}",
          "prompt": "请回答用户的问题：{{input.message}}"
        }
      },
      {
        "id": "end",
        "type": "END",
        "name": "结束",
        "config": {}
      }
    ],
    "edges": [
      {
        "from": "start",
        "to": "chat_llm"
      },
      {
        "from": "chat_llm",
        "to": "end"
      }
    ]
  }
}
```

### TOML格式示例

```toml
[workflow]
id = "example-chat"
name = "示例聊天工作流"
description = "一个简单的聊天工作流示例"
version = "1.0.0"

[workflow.parameters.model]
type = "string"
default = "gpt-4o-mini"
description = "使用的LLM模型"

[[workflow.nodes]]
id = "start"
type = "START"
name = "开始"

[[workflow.nodes]]
id = "chat_llm"
type = "LLM"
name = "聊天LLM"

[workflow.nodes.config]
profileId = "{{parameters.model}}"
prompt = "请回答用户的问题：{{input.message}}"

[[workflow.nodes]]
id = "end"
type = "END"
name = "结束"

[[workflow.edges]]
from = "start"
to = "chat_llm"

[[workflow.edges]]
from = "chat_llm"
to = "end"
```

## 参数化配置

配置文件支持参数化，使用 `{{parameters.xxx}}` 语法引用参数：

```json
{
  "workflow": {
    "parameters": {
      "model": {
        "type": "string",
        "default": "gpt-4"
      }
    },
    "nodes": [
      {
        "id": "llm",
        "type": "LLM",
        "config": {
          "profileId": "{{parameters.model}}"
        }
      }
    ]
  }
}
```

在加载时提供参数值：

```typescript
const workflowDef = parser.parseAndTransform(
  configContent,
  ConfigFormat.JSON,
  { model: 'gpt-4-turbo' } // 覆盖默认值
);
```

## 配置验证

配置验证器会检查以下内容：

1. **必需字段**：id、name、version
2. **节点验证**：
   - 必须包含一个START节点
   - 必须包含一个END节点
   - 节点ID不能重复
   - 节点类型必须有效
3. **边验证**：
   - 边的源节点和目标节点必须存在
4. **参数验证**：
   - 参数类型必须有效
5. **变量验证**：
   - 变量名称不能重复
   - 变量类型必须有效

## 高级功能

### 批量加载工作流

```typescript
const workflowIds = await configAPI.batchLoadAndRegisterWorkflows([
  './workflows/workflow1.json',
  './workflows/workflow2.json',
  './workflows/workflow3.json'
]);
```

### 导出工作流为配置文件

```typescript
// 导出到文件
await configAPI.exportWorkflowToConfig('workflow-id', './exported.json');

// 导出为内容字符串
const content = configAPI.exportWorkflowToConfigContent(
  'workflow-id',
  ConfigFormat.JSON
);
```

## 依赖安装

如果需要使用TOML格式，请安装TOML解析库：

```bash
pnpm add @iarna/toml
# 或
pnpm add toml
```

## 注意事项

1. **TOML序列化**：当前TOML解析器不支持序列化，导出时请使用JSON格式
2. **参数替换**：参数替换是递归的，会替换所有嵌套对象中的占位符
3. **边引用**：转换后会自动更新节点的边引用（outgoingEdgeIds和incomingEdgeIds）
4. **验证警告**：验证过程中的警告不会阻止转换，但建议修复

## 示例

完整示例请参考：
- [`sdk/api/config/__tests__/config-parser.test.ts`](./__tests__/config-parser.test.ts)
- [`sdk/api/config/__tests__/example-workflow.json`](./__tests__/example-workflow.json)
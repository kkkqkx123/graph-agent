# 脚本配置指南

本文档介绍如何使用新的脚本模块配置模式，该模式将脚本执行配置从节点配置中分离出来，由脚本模块统一管理。

## 配置模式变更

### 旧模式（已弃用）

在旧模式中，脚本执行配置（超时、重试等）直接在CodeNodeConfig中定义：

```typescript
// 旧模式 - 已弃用
interface CodeNodeConfig {
  scriptName: string;
  scriptType: string;
  risk: string;
  timeout?: number;      // 由节点管理
  retries?: number;      // 由节点管理
  retryDelay?: number;   // 由节点管理
  inline?: boolean;
}
```

### 新模式

在新模式中，脚本执行配置由脚本模块统一管理：

```typescript
// 新模式
interface CodeNodeConfig {
  scriptName: string;    // 引用已注册的脚本
  scriptType: string;    // 脚本类型映射
  risk: string;          // 风险等级
  inline?: boolean;      // 是否为内联代码
}

// 脚本定义由脚本模块管理
interface Script {
  name: string;
  type: ScriptType;
  description: string;
  content?: string;
  filePath?: string;
  options: ScriptExecutionOptions;  // 执行配置由脚本模块管理
  metadata?: ScriptMetadata;
}
```

## 脚本配置格式

脚本配置使用TOML格式，存储在 `configs/scripts/` 目录下。

### 基本配置结构

```toml
# 脚本基本配置
name = "script-name"
script_type = "SHELL"  # 或 "PYTHON", "JAVASCRIPT" 等
description = "脚本描述"
enabled = true

# 脚本内容（内联代码）
content = """
#!/bin/bash
echo "Hello, World!"
"""

# 执行选项
[options]
timeout = 30000        # 超时时间（毫秒）
retries = 2            # 重试次数
retryDelay = 1000      # 重试延迟（毫秒）
workingDirectory = "/tmp"
sandbox = false

# 环境变量
[options.environment]
SCRIPT_NAME = "script-name"
CUSTOM_VAR = "value"

# 沙箱配置（可选）
[options.sandboxConfig]
type = "docker"
image = "python:3.9-slim"
resourceLimits = { memory = 512, cpu = 1, disk = 100 }
network = { enabled = false }

# 元数据
[metadata]
category = "category-name"
tags = ["tag1", "tag2"]
author = "author-name"
version = "1.0.0"
documentationUrl = "https://example.com/docs"
```

### 配置字段说明

#### 基本字段
- `name`: 脚本唯一名称，在节点配置中引用
- `script_type`: 脚本类型，支持 `SHELL`, `CMD`, `POWERSHELL`, `PYTHON`, `JAVASCRIPT`
- `description`: 脚本描述
- `enabled`: 是否启用脚本
- `content`: 内联脚本内容
- `filePath`: 外部脚本文件路径（与content二选一）

#### 执行选项
- `timeout`: 执行超时时间（毫秒）
- `retries`: 重试次数
- `retryDelay`: 重试延迟（毫秒）
- `workingDirectory`: 工作目录
- `sandbox`: 是否启用沙箱
- `environment`: 环境变量映射

#### 沙箱配置
- `type`: 沙箱类型（docker, nodejs, python, custom）
- `image`: Docker镜像（仅docker类型）
- `resourceLimits`: 资源限制（内存、CPU、磁盘）
- `network`: 网络配置

#### 元数据
- `category`: 脚本分类
- `tags`: 标签数组
- `author`: 作者
- `version`: 版本
- `documentationUrl`: 文档URL

## 使用示例

### 1. 注册脚本

```typescript
import { codeService } from 'sdk/core/services/code-service';
import { ScriptType } from 'sdk/types/code';

// 从配置文件加载脚本
const scriptConfig = loadScriptConfig('configs/scripts/builtin/hello-world.toml');
codeService.registerScript(scriptConfig);

// 或者手动创建脚本
const script: Script = {
  id: generateId(),
  name: 'custom-script',
  type: ScriptType.SHELL,
  description: 'Custom shell script',
  content: 'echo "Hello from custom script"',
  options: {
    timeout: 30000,
    retries: 2,
    retryDelay: 1000,
    workingDirectory: '/tmp'
  },
  metadata: {
    category: 'custom',
    tags: ['custom', 'demo']
  }
};
codeService.registerScript(script);
```

### 2. 在节点中使用

```typescript
// 工作流节点配置
const codeNode: Node = {
  id: 'node-1',
  type: 'CODE',
  config: {
    scriptName: 'hello-world',  // 引用已注册的脚本
    scriptType: 'shell',
    risk: 'low',
    inline: false
  }
};
```

### 3. 执行脚本

```typescript
// 使用脚本服务执行
const result = await codeService.execute('hello-world');

// 或者在code-handler中自动执行
const result = await codeHandler(thread, codeNode);
```

## 配置管理最佳实践

### 1. 脚本分类
- 将相关脚本放在同一分类中
- 使用有意义的标签便于搜索
- 保持脚本名称简洁且具有描述性

### 2. 安全配置
- 根据脚本风险等级配置适当的沙箱设置
- 限制网络访问权限
- 设置合理的资源限制

### 3. 性能优化
- 设置适当的超时时间
- 配置合理的重试策略
- 使用缓存机制减少重复执行

### 4. 版本管理
- 为脚本配置版本号
- 记录变更历史
- 提供文档链接

## 迁移指南

### 从旧模式迁移

1. **提取执行配置**: 将节点中的 `timeout`, `retries`, `retryDelay` 配置提取到脚本配置中
2. **创建脚本定义**: 为每个脚本创建独立的配置文件
3. **更新节点配置**: 移除执行配置，只保留脚本引用
4. **注册脚本**: 在应用启动时注册所有脚本

### 示例迁移

**旧配置**:
```typescript
// 节点配置
const oldNodeConfig: CodeNodeConfig = {
  scriptName: 'process-data',
  scriptType: 'python',
  risk: 'medium',
  timeout: 60000,    // 迁移到脚本配置
  retries: 3,        // 迁移到脚本配置
  retryDelay: 2000,  // 迁移到脚本配置
  inline: false
};
```

**新配置**:
```toml
# configs/scripts/data/process-data.toml
name = "process-data"
script_type = "PYTHON"
description = "Data processing script"
enabled = true

[options]
timeout = 60000
retries = 3
retryDelay = 2000
```

```typescript
// 节点配置
const newNodeConfig: CodeNodeConfig = {
  scriptName: 'process-data',  // 引用脚本名称
  scriptType: 'python',
  risk: 'medium',
  inline: false
};
```

## 总结

新的脚本配置模式提供了以下优势：

1. **配置集中管理**: 所有脚本执行配置统一管理
2. **配置复用**: 同一脚本可在多个节点中复用
3. **安全增强**: 沙箱配置与脚本绑定
4. **维护性**: 脚本配置独立于节点配置，便于维护
5. **扩展性**: 支持多种脚本类型和执行环境

通过这种模式，脚本的执行行为由脚本模块统一管理，节点配置更加简洁，专注于业务逻辑。
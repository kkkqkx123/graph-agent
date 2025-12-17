# HumanRelay LLM Provider 配置设计

## 概述

本文档详细描述了HumanRelay LLM Provider的配置系统设计，包括配置结构、配置选项、配置加载机制和最佳实践。

## 配置系统架构

### 设计原则
- **分层配置**：通用配置 + 模式特定配置 + 高级配置
- **环境变量注入**：支持通过环境变量覆盖配置值
- **配置验证**：在加载时验证配置的有效性
- **热重载**：支持运行时配置更新（部分配置）

### 配置文件结构
```
configs/llms/provider/human_relay/
├── common.toml          # 通用配置
├── human-relay-s.toml   # 单轮模式配置
├── human-relay-m.toml   # 多轮模式配置
└── human-relay-advanced.toml  # 高级配置
```

## 通用配置 (common.toml)

### 基础配置
```toml
# HumanRelay Provider通用配置

# 基础标识
provider = "human-relay"
model_type = "human-relay"

# HumanRelay特定配置
mode = "single"                    # single 或 multi
default_timeout = 300              # 默认超时时间（秒）
max_history_length = 50            # 多轮对话最大历史长度
```

### 前端交互配置
```toml
# 前端交互配置
[frontend]
type = "tui"                       # tui, web, api
auto_detect = true                 # 自动检测可用前端
fallback_order = ["tui", "web", "api"]  # 前端回退顺序
```

### TUI配置
```toml
# TUI前端配置
[frontend.tui]
prompt_style = "highlight"         # minimal, highlight, detailed
input_area_height = 10             # 输入区域高度
show_timer = true                  # 显示计时器
show_history = true                # 显示历史记录
history_format = "compact"         # compact, detailed
auto_save = true                   # 自动保存输入
```

### Web配置
```toml
# Web前端配置
[frontend.web]
port = 8080                        # WebSocket端口
host = "localhost"                 # 绑定主机
path = "/human-relay"              # WebSocket路径
cors_enabled = true                # 启用CORS
cors_origins = ["*"]               # 允许的源
max_connections = 10               # 最大连接数
heartbeat_interval = 30            # 心跳间隔（秒）
```

### API配置
```toml
# API前端配置
[frontend.api]
endpoint = "/api/human-relay"      # API端点
auth_required = false              # 是否需要认证
auth_method = "bearer"             # bearer, basic, apikey
timeout = 600                      # API超时时间
rate_limit = 100                   # 速率限制（请求/分钟）
```

### 提示词模板
```toml
# 提示词模板配置
[templates]
single = """
请将以下提示词输入到Web LLM中，并将回复粘贴回来：

{prompt}

回复：
"""

multi = """
请继续对话，将以下提示词输入到Web LLM中：

{incremental_prompt}

对话历史：
{conversation_history}

回复：
"""

# 自定义模板变量
[templates.variables]
{prompt} = "完整提示词内容"
{incremental_prompt} = "增量提示词内容"
{conversation_history} = "对话历史记录"
{timestamp} = "当前时间戳"
{session_id} = "会话ID"
```

### 功能开关
```toml
# 功能支持配置
[features]
conversation_history = true         # 支持对话历史
custom_templates = true            # 支持自定义模板
timeout_control = true             # 支持超时控制
cancel_interaction = true          # 支持取消交互
session_persistence = false        # 会话持久化
export_history = false             # 导出历史记录
auto_save = true                   # 自动保存
voice_input = false                # 语音输入（实验性）
```

### 错误处理
```toml
# 错误处理配置
[error_handling]
retry_on_timeout = false           # 超时是否重试
max_retries = 0                    # 最大重试次数
retry_delay = 5.0                  # 重试延迟（秒）
retry_backoff = 1.5                # 退避倍数
log_errors = true                  # 记录错误日志
error_notification = false         # 错误通知
```

### 支持的模型
```toml
# 支持的模型列表
models = [
    "human-relay-s",
    "human-relay-m",
]

# 模型映射
[model_mapping]
"human-relay-s" = { mode = "single", description = "单轮对话模式" }
"human-relay-m" = { mode = "multi", description = "多轮对话模式" }
```

### 元数据
```toml
# 元数据
[metadata]
provider = "human-relay"
version = "1.0"
description = "HumanRelay Provider - 通过前端与Web LLM交互"
author = "Modular Agent Team"
license = "MIT"
homepage = "https://github.com/modular-agent/human-relay"
supported_features = [
    "human_interaction",
    "web_llm_integration",
    "conversation_history",
    "custom_templates",
]
unsupported_features = [
    "streaming",
    "function_calling",
    "image_input",
]
```

## 单轮模式配置 (human-relay-s.toml)

```toml
# 继承通用配置
inherits_from = "../common.toml"
model_name = "human-relay-s"

# 单轮模式特定配置
mode = "single"
max_history_length = 1             # 单轮模式不需要历史
default_timeout = 300              # 单轮模式标准超时

# 前端配置优化
[frontend.tui]
show_history = false               # 单轮模式不显示历史
prompt_style = "minimal"           # 简化显示

[frontend.web]
max_connections = 5                # 单轮模式连接数较少

# 模板优化
[templates]
single = """
🎯 **单轮任务**

请将以下内容输入到Web LLM：

{prompt}

📝 **请将回复粘贴到下方：**
"""

[metadata]
description = "HumanRelay单轮对话模式"
capabilities = [
    "human_interaction",
    "web_llm_integration",
]
use_cases = [
    "一次性分析",
    "代码审查",
    "简单问答",
]
```

## 多轮模式配置 (human-relay-m.toml)

```toml
# 继承通用配置
inherits_from = "../common.toml"
model_name = "human-relay-m"

# 多轮模式特定配置
mode = "multi"
max_history_length = 100           # 扩展历史长度
default_timeout = 600              # 多轮对话可能需要更长时间

# 前端配置优化
[frontend.tui]
show_history = true                # 显示历史记录
history_format = "detailed"        # 详细历史格式
auto_save = true                   # 自动保存会话

[frontend.web]
max_connections = 10               # 多轮模式可能需要更多连接
session_timeout = 3600             # 会话超时时间（秒）

# 模板优化
[templates]
multi = """
🔄 **继续对话**

请继续将以下内容输入到Web LLM：

{incremental_prompt}

📋 **对话历史：**
{conversation_history}

📝 **请将Web LLM的回复粘贴到下方：**
"""

# 会话管理
[session_management]
auto_save_interval = 60            # 自动保存间隔（秒）
max_session_duration = 7200        # 最大会话持续时间（秒）
session_cleanup_interval = 300     # 会话清理间隔（秒）

[metadata]
description = "HumanRelay多轮对话模式"
capabilities = [
    "human_interaction",
    "web_llm_integration",
    "conversation_history",
]
use_cases = [
    "复杂分析",
    "多轮讨论",
    "迭代开发",
    "教学场景",
]
```

## 高级配置 (human-relay-advanced.toml)

```toml
# 继承通用配置
inherits_from = "../common.toml"
model_name = "human-relay-advanced"

# 高级配置
mode = "multi"
default_timeout = 1200             # 20分钟超时
max_history_length = 200

# 前端配置
[frontend]
type = "web"                       # 使用Web前端
fallback_to_tui = true             # Web不可用时回退到TUI
auto_detect = true
fallback_order = ["web", "tui", "api"]

# Web高级配置
[frontend.web]
port = 8080
host = "0.0.0.0"                   # 允许远程连接
ssl_enabled = false                # SSL配置
ssl_cert = ""
ssl_key = ""
max_connections = 20
compression = true                 # 启用压缩
cache_enabled = true               # 启用缓存

# 自定义模板
[templates]
single = """
╔═══════════════════════════════════════════
║ 🎯 任务指令
╚═══════════════════════════════════════════

{prompt}

╔═══════════════════════════════════════════
║ 📝 请在此处粘贴Web LLM的回复：
╚═══════════════════════════════════════════
"""

multi = """
╔═══════════════════════════════════════════
║ 🔄 继续对话
╚═══════════════════════════════════════════

{incremental_prompt}

╔═══════════════════════════════════════════
║ 📜 对话历史
╚═══════════════════════════════════════════
{conversation_history}

╔═══════════════════════════════════════════
║ 📝 新的回复：
╚═══════════════════════════════════════════
"""

# 高级功能
[features]
session_persistence = true         # 会话持久化
export_history = true              # 导出历史记录
voice_input = false                # 语音输入（实验性）
auto_save = true                   # 自动保存
collaboration = false              # 协作功能（实验性）
analytics = false                  # 分析功能

# 会话持久化配置
[persistence]
enabled = true
storage_type = "file"              # file, database, redis
storage_path = "./human-relay-sessions"
auto_save_interval = 60            # 自动保存间隔（秒）
compression = true                 # 压缩存储
encryption = false                 # 加密存储
retention_days = 30                # 保留天数

# 数据库配置（如果使用数据库存储）
[persistence.database]
type = "sqlite"                    # sqlite, postgresql, mysql
connection_string = "./human-relay.db"
pool_size = 10
timeout = 30

# 导出配置
[export]
formats = ["json", "markdown", "txt", "csv"]
include_metadata = true
include_timestamps = true
max_export_size = 100              # 最大导出条数
export_path = "./exports"

# 分析配置
[analytics]
enabled = false
track_response_time = true
track_session_duration = true
track_user_patterns = true
export_interval = 3600             # 导出间隔（秒）
storage_path = "./analytics"

# 协作配置
[collaboration]
enabled = false
max_participants = 5
session_sharing = true
real_time_sync = true

[metadata]
description = "HumanRelay高级配置"
capabilities = [
    "human_interaction",
    "web_llm_integration",
    "conversation_history",
    "session_persistence",
    "export_history",
    "custom_templates",
]
use_cases = [
    "企业级应用",
    "团队协作",
    "长期项目",
    "研究分析",
]
```

## 环境变量支持

### 支持的环境变量
```bash
# 基础配置
HUMAN_RELAY_MODE=single|multi
HUMAN_RELAY_TIMEOUT=300
HUMAN_RELAY_MAX_HISTORY=50

# 前端配置
HUMAN_RELAY_FRONTEND_TYPE=tui|web|api
HUMAN_RELAY_WEB_PORT=8080
HUMAN_RELAY_WEB_HOST=localhost
HUMAN_RELAY_API_ENDPOINT=/api/human-relay

# 功能开关
HUMAN_RELAY_ENABLE_HISTORY=true
HUMAN_RELAY_ENABLE_PERSISTENCE=false
HUMAN_RELAY_ENABLE_EXPORT=false

# 安全配置
HUMAN_RELAY_AUTH_REQUIRED=false
HUMAN_RELAY_API_KEY=your_api_key
HUMAN_RELAY_SSL_CERT=path/to/cert.pem
HUMAN_RELAY_SSL_KEY=path/to/key.pem

# 存储配置
HUMAN_RELAY_STORAGE_PATH=./sessions
HUMAN_RELAY_DB_CONNECTION_STRING=./human-relay.db
```

### 环境变量优先级
1. 环境变量（最高优先级）
2. 模型特定配置文件
3. 通用配置文件（最低优先级）

## 配置验证

### 验证规则
- **必需字段验证**：确保所有必需字段都有值
- **类型验证**：确保字段值类型正确
- **范围验证**：确保数值在合理范围内
- **依赖验证**：确保相关配置的一致性

### 验证示例
```typescript
// 配置验证规则示例
const validationRules = {
  mode: {
    required: true,
    type: 'string',
    enum: ['single', 'multi']
  },
  default_timeout: {
    required: true,
    type: 'number',
    min: 1,
    max: 3600
  },
  max_history_length: {
    required: true,
    type: 'number',
    min: 1,
    max: 1000
  },
  'frontend.type': {
    required: true,
    type: 'string',
    enum: ['tui', 'web', 'api']
  },
  'frontend.web.port': {
    type: 'number',
    min: 1024,
    max: 65535
  }
};
```

## 配置最佳实践

### 1. 配置分层
- 将通用配置放在`common.toml`中
- 将模式特定配置放在单独文件中
- 将高级配置放在`advanced.toml`中

### 2. 环境特定配置
- 使用环境变量覆盖敏感信息
- 为不同环境创建不同的配置文件
- 使用配置继承减少重复

### 3. 安全考虑
- 不要在配置文件中存储敏感信息
- 使用环境变量或密钥管理系统
- 启用配置文件访问权限控制

### 4. 性能优化
- 合理设置超时时间和连接数
- 启用缓存和压缩
- 定期清理过期数据

### 5. 监控和日志
- 记录配置加载和变更
- 监控配置使用情况
- 提供配置诊断工具

## 配置迁移

### 从旧配置迁移
1. 分析旧配置文件结构
2. 创建配置映射规则
3. 实现自动迁移脚本
4. 验证迁移结果

### 配置版本管理
- 为配置文件添加版本号
- 提供配置升级路径
- 保持向后兼容性

## 总结

HumanRelay的配置系统采用分层设计，支持灵活的配置管理和环境适应。通过合理的配置结构、验证机制和最佳实践，确保系统的可维护性和可扩展性。配置系统支持从简单到复杂的各种使用场景，满足不同用户的需求。
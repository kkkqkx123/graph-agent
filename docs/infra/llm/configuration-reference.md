# 轮询池和任务组配置参考

## 配置系统概述

轮询池和任务组使用基于TOML的配置系统，支持配置继承、环境变量注入和热重载功能。配置文件按功能分类组织，通过注册表统一管理。

## 配置文件组织

### 目录结构

```
configs/llms/
├── _registry.toml           # 配置注册表
├── pools/                   # 轮询池配置
├── task-groups/             # 任务组配置
├── wrappers/                # 包装器配置
└── strategies/              # 策略配置
```

### 配置注册表

注册表文件管理所有配置的元数据和启用状态：

```toml
[registry]
version = "1.0.0"
description = "LLM轮询池和任务组配置注册表"

# 全局设置
[global]
config_validation = "strict"
enable_hot_reload = true
reload_interval = 300
cache_enabled = true

# 轮询池注册
[pools]
fast_pool = { file = "pools/fast-pool.toml", enabled = true }
thinking_pool = { file = "pools/thinking-pool.toml", enabled = true }

# 任务组注册
[task_groups]
fast_group = { file = "task-groups/fast-group.toml", enabled = true }

# 包装器注册
[wrappers]
pool_wrappers = { file = "wrappers/pool-wrappers.toml", enabled = true }
```

## 轮询池配置

### 基本结构

轮询池配置文件定义池的基本属性、轮询策略、健康检查和降级机制：

```toml
[pool]
name = "fast_pool"
description = "快速响应任务专用轮询池"
task_groups = ["fast_group"]

[pool.rotation_strategy]
type = "round_robin"
options = {}

[pool.health_check]
interval = 30
failure_threshold = 3
recovery_time = 60

[pool.fallback]
strategy = "instance_rotation"
max_instance_attempts = 2

[pool.rate_limiting]
enabled = true
algorithm = "token_bucket"
```

### 配置选项详解

#### 池基本配置

- `name`: 池的唯一标识符
- `description`: 池的描述信息
- `task_groups`: 关联的任务组列表

#### 轮询策略配置

支持多种轮询策略：

- `round_robin`: 轮询策略
- `weighted_random`: 加权随机策略
- `least_connections`: 最少连接策略
- `response_time`: 响应时间策略

#### 健康检查配置

- `interval`: 健康检查间隔（秒）
- `failure_threshold`: 故障阈值
- `recovery_time`: 恢复时间（秒）

#### 降级配置

- `strategy`: 降级策略类型
- `max_instance_attempts`: 最大实例尝试次数
- `fallback_pools`: 备用轮询池列表

#### 速率限制配置

支持两种算法：

- `token_bucket`: 令牌桶算法
- `fixed_window`: 固定窗口算法

## 任务组配置

### 基本结构

任务组配置定义层级模型、降级策略和熔断器设置：

```toml
[task_group]
name = "fast_group"
description = "快速响应任务组"
fallback_strategy = "echelon_down"

[task_group.circuit_breaker]
failure_threshold = 5
recovery_time = 60
half_open_requests = 1

[task_group.fallback]
strategy = "echelon_down"
fallback_groups = ["fast_group.echelon2"]
max_attempts = 3
retry_delay = 1.0

[task_group.echelons]

[task_group.echelons.echelon1]
models = ["openai:gpt-4o", "anthropic:claude-3-5-sonnet"]
concurrency_limit = 10
rpm_limit = 100
priority = 1
timeout = 30
max_retries = 3
temperature = 0.7
max_tokens = 2000
```

### 配置选项详解

#### 任务组基本配置

- `name`: 任务组唯一标识符
- `description`: 任务组描述
- `fallback_strategy`: 降级策略类型

#### 熔断器配置

- `failure_threshold`: 失败阈值
- `recovery_time`: 恢复时间（秒）
- `half_open_requests`: 半开状态请求数

#### 降级配置

- `strategy`: 降级策略
- `fallback_groups`: 降级组列表
- `max_attempts`: 最大尝试次数
- `retry_delay`: 重试延迟（秒）

#### 层级配置

每个层级包含以下配置：

- `models`: 模型列表
- `concurrency_limit`: 并发限制
- `rpm_limit`: 每分钟请求限制
- `priority`: 优先级（数字越小优先级越高）
- `timeout`: 超时时间（秒）
- `max_retries`: 最大重试次数
- `temperature`: 温度参数
- `max_tokens`: 最大令牌数

## 包装器配置

### 基本结构

包装器配置定义包装器的类型和关联的池或任务组：

```toml
[wrappers]
fast_pool_wrapper = { 
  type = "pool", 
  pool_name = "fast_pool",
  enabled = true 
}

fast_group_wrapper = { 
  type = "task_group", 
  group_name = "fast_group",
  enabled = true 
}

[global]
default_timeout = 30
max_retries = 3
enable_metrics = true
metrics_interval = 60
```

### 配置选项详解

#### 包装器定义

- `type`: 包装器类型（pool/task_group/direct）
- `pool_name`: 关联的轮询池名称
- `group_name`: 关联的任务组名称
- `enabled`: 是否启用

#### 全局配置

- `default_timeout`: 默认超时时间
- `max_retries`: 最大重试次数
- `enable_metrics`: 是否启用指标收集
- `metrics_interval`: 指标收集间隔

## 策略配置

### 轮询策略配置

```toml
[strategies.rotation.round_robin]
description = "轮询策略"
options = {}

[strategies.rotation.weighted_random]
description = "加权随机策略"
options = { weight_attribute = "performance_score" }

[strategies.rotation.least_connections]
description = "最少连接策略"
options = { connection_timeout = 30 }
```

### 降级策略配置

```toml
[strategies.fallback.echelon_down]
description = "层级降级策略"
options = { 
  respect_priority = true,
  skip_unhealthy = true 
}

[strategies.fallback.group_fallback]
description = "组降级策略"
options = { 
  fallback_order = ["fast_group", "thinking_group"],
  max_group_attempts = 2 
}
```

## 配置继承

### 继承语法

配置文件支持继承，使用`inherits_from`字段：

```toml
inherits_from = "../common/base-pool.toml"

[pool]
name = "derived_pool"
# 继承base-pool.toml的所有配置，只覆盖需要的字段
```

### 继承规则

- 子配置覆盖父配置的同名字段
- 数组字段会合并而非覆盖
- 支持多级继承
- 循环继承会被检测并拒绝

## 环境变量注入

### 注入语法

使用`${VARIABLE_NAME}`语法注入环境变量：

```toml
[pool]
api_key = "${OPENAI_API_KEY}"
base_url = "${LLM_BASE_URL:http://localhost:8080}"
timeout = "${REQUEST_TIMEOUT:30}"
```

### 默认值

支持提供默认值，使用冒号分隔：

```toml
# 如果环境变量不存在，使用默认值
api_key = "${API_KEY:default_key_value}"
timeout = "${TIMEOUT:30}"
```

### 类型转换

环境变量会自动转换为目标类型：

- 数字字符串转换为数字
- "true"/"false"转换为布尔值
- JSON字符串转换为对象

## 配置验证

### 验证规则

配置加载时会进行以下验证：

1. **必需字段检查**: 确保所有必需字段存在
2. **类型验证**: 验证字段类型正确
3. **值范围验证**: 验证数值在合理范围内
4. **依赖关系验证**: 验证配置间的依赖关系
5. **引用完整性**: 验证引用的配置存在

### 验证模式

支持两种验证模式：

- `strict`: 严格模式，任何验证失败都会阻止加载
- `lenient`: 宽松模式，记录警告但允许加载

## 配置热重载

### 重载机制

当启用热重载时，系统会监控配置文件变化：

1. 检测文件修改
2. 重新加载配置
3. 验证新配置
4. 应用配置变更
5. 通知相关组件

### 重载策略

不同类型的配置有不同的重载策略：

- **池配置**: 需要重新创建池实例
- **任务组配置**: 需要重新初始化任务组
- **策略配置**: 立即生效
- **包装器配置**: 需要重新创建包装器

## 配置最佳实践

### 命名约定

- 使用描述性名称
- 避免特殊字符
- 保持名称一致性
- 使用连字符分隔单词

### 组织原则

- 按功能分组配置
- 使用继承减少重复
- 分离敏感信息
- 保持配置简洁

### 安全考虑

- 使用环境变量存储敏感信息
- 限制配置文件权限
- 定期轮换密钥
- 审计配置变更

### 性能优化

- 合理设置缓存时间
- 避免频繁重载
- 优化配置文件大小
- 使用配置压缩

## 故障排除

### 常见问题

#### 配置加载失败

- 检查文件路径
- 验证TOML语法
- 确认权限设置
- 查看错误日志

#### 环境变量未注入

- 确认变量名称正确
- 检查变量是否设置
- 验证注入语法
- 查看调试信息

#### 继承不生效

- 检查继承路径
- 验证父配置存在
- 确认没有循环继承
- 查看继承日志

#### 热重载不工作

- 确认热重载启用
- 检查文件监控权限
- 验证配置格式
- 查看重载日志

### 调试技巧

1. **启用详细日志**: 设置日志级别为DEBUG
2. **使用配置验证工具**: 独立验证配置文件
3. **检查配置缓存**: 清除缓存重新加载
4. **逐步加载**: 逐个加载配置文件定位问题

## 总结

配置系统是轮询池和任务组功能的重要组成部分，提供了灵活、安全、高效的配置管理能力。通过合理使用配置继承、环境变量注入和热重载功能，可以大大简化系统的部署和维护工作。

关键要点：
- 使用结构化的配置组织
- 利用继承减少重复配置
- 通过环境变量管理敏感信息
- 启用热重载提高运维效率
- 遵循命名和组织最佳实践
# 配置文件重构分析

## 概述
分析当前配置文件结构，提出按类别拆分和简化任务组配置的方案。

## 当前配置结构

### 文件组织
```
configs/llms/
├── pools.toml              # 所有池配置（4个池）
├── task_groups.toml        # 所有任务组配置（4个任务组）
└── provider/
    ├── openai/
    │   ├── common.toml
    │   ├── gpt-4o.toml
    │   ├── gpt-4.1.toml
    │   └── gpt-5.1.toml
    ├── gemini/
    │   ├── common.toml
    │   ├── gemini-2.5-flash.toml
    │   └── gemini-2.5-pro.toml
    └── human_relay/
        ├── common.toml
        ├── human-relay-m.toml
        └── human-relay-s.toml
```

### 当前配置内容

#### pools.toml
包含4个池配置：
- fast_pool（快速池）
- economy_pool（经济池）
- high_availability_pool（高可用池）
- default_pool（默认池）

每个池配置包含：
- instances数组（多个实例）
- rotation策略
- health_check配置
- concurrencyControl配置
- rateLimiting配置
- fallbackConfig配置

#### task_groups.toml
包含4个任务组配置：
- fast_group（快速任务组）
- economy_group（经济任务组）
- high_availability_group（高可用任务组）
- default_group（默认任务组）

每个任务组配置包含：
- echelon1/echelon2/echelon3（多个层级）
- 每个层级包含多个模型（数组）
- circuit_breaker配置

## 问题分析

### 1. 配置文件过于集中
**问题：**
- pools.toml包含所有池配置，文件较大（116行）
- task_groups.toml包含所有任务组配置，文件较大（74行）
- 难以维护和查找特定配置
- 修改一个配置可能影响其他配置

**影响：**
- 可维护性差
- 配置冲突风险高
- 难以进行版本控制
- 不利于团队协作

### 2. 任务组配置过于复杂
**问题：**
- 每个层级包含多个模型（数组）
- 需要在同级别模型之间进行切换
- 配置逻辑复杂，容易出错

**当前配置示例：**
```toml
[task_groups.fast_group.echelon1]
models = ["openai:gpt-4o", "anthropic:claude-3-5-sonnet"]  # 2个模型
priority = 1

[task_groups.fast_group.echelon2]
models = ["openai:gpt-4o-mini", "anthropic:claude-3-haiku"]  # 2个模型
priority = 2
```

**影响：**
- 配置复杂度高
- 需要实现同级别模型切换逻辑
- 增加系统复杂度
- 难以理解和调试

### 3. 配置格式不统一
**问题：**
- pools使用instances数组格式
- task_groups使用provider:model格式
- 两种格式不一致，容易混淆

**影响：**
- 学习成本高
- 容易配置错误
- 需要维护两套解析逻辑

## 重构方案

### 方案1：按类别拆分配置文件

#### 新的文件结构
```
configs/llms/
├── pools/
│   ├── fast_pool.toml
│   ├── economy_pool.toml
│   ├── high_availability_pool.toml
│   └── default_pool.toml
├── task_groups/
│   ├── fast_group.toml
│   ├── economy_group.toml
│   ├── high_availability_group.toml
│   └── default_group.toml
└── provider/
    ├── openai/
    │   ├── common.toml
    │   ├── gpt-4o.toml
    │   ├── gpt-4.1.toml
    │   └── gpt-5.1.toml
    ├── gemini/
    │   ├── common.toml
    │   ├── gemini-2.5-flash.toml
    │   └── gemini-2.5-pro.toml
    └── human_relay/
        ├── common.toml
        ├── human-relay-m.toml
        └── human-relay-s.toml
```

#### 优点
- ✅ 配置文件更小，易于维护
- ✅ 每个配置独立，修改不影响其他配置
- ✅ 便于版本控制和团队协作
- ✅ 可以单独启用/禁用某个配置
- ✅ 符合单一职责原则

#### 缺点
- ❌ 文件数量增加
- ❌ 需要修改配置加载逻辑
- ❌ 需要更新相关文档

### 方案2：简化任务组配置

#### 新的配置格式
**每个层级只配置1个模型：**

```toml
[task_groups.fast_group]
name = "fast_group"

[task_groups.fast_group.echelon1]
model = "gpt-4o"              # 单个模型，不是数组
provider = "openai"           # 明确指定provider
priority = 1

[task_groups.fast_group.echelon2]
model = "gpt-4o-mini"
provider = "openai"
priority = 2

[task_groups.fast_group.circuit_breaker]
failure_threshold = 5
reset_timeout = 60
```

#### 优点
- ✅ 配置更简洁，易于理解
- ✅ 消除同级别模型切换逻辑
- ✅ 降低系统复杂度
- ✅ 配置格式统一（与pools一致）
- ✅ 减少出错概率

#### 缺点
- ❌ 灵活性降低（每个层级只能有一个模型）
- ❌ 需要修改Schema定义
- ❌ 需要修改相关代码逻辑

### 方案3：结合方案1和方案2（推荐）

#### 新的文件结构
```
configs/llms/
├── pools/
│   ├── fast_pool.toml
│   ├── economy_pool.toml
│   ├── high_availability_pool.toml
│   └── default_pool.toml
├── task_groups/
│   ├── fast_group.toml
│   ├── economy_group.toml
│   ├── high_availability_group.toml
│   └── default_group.toml
└── provider/
    ├── openai/
    │   ├── common.toml
    │   ├── gpt-4o.toml
    │   ├── gpt-4.1.toml
    │   └── gpt-5.1.toml
    ├── gemini/
    │   ├── common.toml
    │   ├── gemini-2.5-flash.toml
    │   └── gemini-2.5-pro.toml
    └── human_relay/
        ├── common.toml
        ├── human-relay-m.toml
        └── human-relay-s.toml
```

#### 新的配置格式

**pools/fast_pool.toml:**
```toml
name = "fast_pool"
task_groups = ["fast_group"]

[rotation]
strategy = "round_robin"

[health_check]
interval = 30
failure_threshold = 3

[[instances]]
name = "openai_gpt4o"
provider = "openai"
model = "gpt-4o"
weight = 1

[[instances]]
name = "openai_gpt4o_mini"
provider = "openai"
model = "gpt-4o-mini"
weight = 2

[[instances]]
name = "anthropic_claude35"
provider = "anthropic"
model = "claude-3-5-sonnet"
weight = 1
```

**task_groups/fast_group.toml:**
```toml
name = "fast_group"

[echelon1]
model = "gpt-4o"
provider = "openai"
priority = 1

[echelon2]
model = "gpt-4o-mini"
provider = "openai"
priority = 2

[circuit_breaker]
failure_threshold = 5
reset_timeout = 60
```

#### 优点
- ✅ 配置文件更小，易于维护
- ✅ 配置格式统一，易于理解
- ✅ 消除同级别模型切换逻辑
- ✅ 降低系统复杂度
- ✅ 便于版本控制和团队协作
- ✅ 符合单一职责原则

#### 缺点
- ❌ 文件数量增加
- ❌ 灵活性降低（每个层级只能有一个模型）
- ❌ 需要修改配置加载逻辑
- ❌ 需要修改Schema定义
- ❌ 需要更新相关文档

## 配置加载逻辑修改

### 当前加载逻辑
```typescript
// ConfigLoadingModule.loadModuleConfig()
// 按模块类型分组，然后加载所有文件
const moduleFiles = this.groupByModuleType(allFiles);
for (const [moduleType, files] of moduleFiles) {
  const moduleConfig = await this.loadModuleConfig(moduleType, files);
  this.configs[moduleType] = moduleConfig;
}
```

### 新的加载逻辑
```typescript
// ConfigLoadingModule.loadModuleConfig()
// 按模块类型分组，然后加载所有文件并合并
const moduleFiles = this.groupByModuleType(allFiles);
for (const [moduleType, files] of moduleFiles) {
  const moduleConfig = await this.loadModuleConfig(moduleType, files);
  this.configs[moduleType] = moduleConfig;
}

// loadModuleConfig内部会：
// 1. 加载所有该模块类型的文件
// 2. 按文件名提取配置键（如fast_pool.toml -> fast_pool）
// 3. 合并所有配置到一个对象中
```

### 需要修改的文件
1. `src/infrastructure/config/loading/config-loading-module.ts`
   - 修改`loadModuleConfig`方法，支持从多个文件中提取配置键
   - 添加配置键提取逻辑

2. `src/infrastructure/config/loading/schemas/pool-schema.ts`
   - 修改为单个池配置的Schema
   - 移除pools对象包装

3. `src/infrastructure/config/loading/schemas/task-group-schema.ts`
   - 修改EchelonSchema，将models数组改为单个model字段
   - 添加provider字段
   - 修改为单个任务组配置的Schema
   - 移除taskGroups对象包装

## Schema修改

### pool-schema.ts修改

**修改前：**
```typescript
export const PoolSchema = z.object({
  pools: z.record(z.string(), PoolConfigSchema).optional(),
  _registry: z.string().optional(),
});
```

**修改后：**
```typescript
export const PoolSchema = PoolConfigSchema;
```

### task-group-schema.ts修改

**修改前：**
```typescript
const EchelonSchema = z.object({
  priority: z.number(),
  models: z.array(z.string()),  // 数组
});

export const TaskGroupSchema = z.object({
  taskGroups: z.record(z.string(), TaskGroupConfigSchema).optional(),
  _registry: z.string().optional(),
});
```

**修改后：**
```typescript
const EchelonSchema = z.object({
  priority: z.number(),
  model: z.string(),           // 单个模型
  provider: z.string(),        // provider字段
});

export const TaskGroupSchema = TaskGroupConfigSchema;
```

## 实施步骤

### 阶段1：配置文件拆分
1. 创建`configs/llms/pools/`目录
2. 创建`configs/llms/task_groups/`目录
3. 将pools.toml拆分为4个单独的文件
4. 将task_groups.toml拆分为4个单独的文件
5. 删除原有的pools.toml和task_groups.toml

### 阶段2：简化任务组配置
1. 修改task_groups/*.toml文件
2. 将每个层级的models数组改为单个model字段
3. 添加provider字段
4. 统一使用模型名称（非provider:model格式）

### 阶段3：修改Schema
1. 修改pool-schema.ts
2. 修改task-group-schema.ts
3. 更新类型定义

### 阶段4：修改配置加载逻辑
1. 修改config-loading-module.ts
2. 添加配置键提取逻辑
3. 测试配置加载

### 阶段5：更新相关代码
1. 更新pool-manager.ts
2. 更新task-group-manager.ts
3. 移除provider:model格式解析支持
4. 更新相关文档

### 阶段6：测试验证
1. 运行类型检查
2. 测试配置加载
3. 测试功能完整性

## 风险评估

### 高风险
- 配置加载逻辑修改可能影响现有功能
- Schema修改可能导致配置验证失败

### 中风险
- 文件拆分可能导致配置丢失
- 简化任务组配置可能影响灵活性

### 低风险
- 文件数量增加
- 文档更新

## 建议

### 推荐方案
采用**方案3：结合方案1和方案2**

### 理由
1. 配置文件拆分可以提高可维护性
2. 简化任务组配置可以降低复杂度
3. 统一配置格式可以减少出错概率
4. 符合单一职责原则和最佳实践

### 注意事项
1. 需要充分测试配置加载逻辑
2. 需要更新所有相关文档
3. 需要考虑向后兼容性（如果需要）
4. 需要团队沟通和培训

## 总结

通过配置文件重构，可以实现：
- ✅ 更好的可维护性
- ✅ 更低的复杂度
- ✅ 更统一的配置格式
- ✅ 更清晰的职责划分
- ✅ 更好的团队协作

建议采用方案3，按阶段实施，确保每个阶段都经过充分测试。
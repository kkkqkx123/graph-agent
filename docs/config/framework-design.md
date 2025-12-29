# 配置管理框架重构设计文档

## 1. 重构策略

基于现有架构进行渐进式重构，删除多余的抽象层，简化设计有问题的文件。

## 2. 需要删除的抽象层

### 2.1 RuleManager（规则管理器）
**问题**：主要是工厂函数的包装器，没有提供实质性的配置管理功能
**处理**：删除 `loading/rules/rule-manager.ts`，将规则创建逻辑内联到ConfigLoadingModule

### 2.2 BaseModuleLoader及其子类
**问题**：复杂的继承层次增加了维护成本但未提供相应价值
**处理**：删除 `loading/base-loader.ts` 和 `loading/loaders/` 目录下的所有加载器，将加载逻辑简化为ConfigLoadingModule的一部分

### 2.3 rules目录
**问题**：规则概念过于复杂，可以简化为直接的Schema定义
**处理**：删除 `loading/rules/` 目录，将Schema定义移到 `loading/schemas/` 目录

## 3. 需要重写的文件

### 3.1 ConfigLoadingModule
**当前问题**：
- 过度依赖RuleManager和Loaders
- 职责不够清晰
- 接口过于复杂

**重构方案**：
- 移除对RuleManager的依赖
- 移除对Loaders的依赖
- 直接实现配置加载逻辑
- 简化接口

### 3.2 SchemaRegistry
**当前问题**：
- 功能过于复杂
- 版本管理功能当前阶段不需要

**重构方案**：
- 简化为核心的Schema注册和验证功能
- 移除版本历史记录
- 移除兼容性检查

### 3.3 ConfigDiscovery
**当前问题**：
- 功能基本合理，但可以简化

**重构方案**：
- 保留核心功能
- 简化配置选项
- 优化性能

## 4. 新的目录结构

```
src/infrastructure/config/
├── loading/                     # 配置加载模块（重构后）
│   ├── index.ts                 # 导出接口
│   ├── types.ts                 # 类型定义
│   ├── config-loading-module.ts # 配置加载模块（重写）
│   ├── discovery.ts             # 配置发现器（简化）
│   ├── schema-registry.ts       # Schema注册表（简化）
│   ├── schemas/                 # Schema定义（新增）
│   │   ├── index.ts
│   │   ├── llm-schema.ts
│   │   ├── tool-schema.ts
│   │   ├── prompt-schema.ts
│   │   └── pool-schema.ts
│   ├── processors/              # 配置处理器（保留）
│   │   ├── index.ts
│   │   ├── environment-processor.ts
│   │   └── inheritance-processor.ts
│   └── utils.ts                 # 工具函数（新增）
├── sources/                     # 配置源（保留）
│   ├── index.ts
│   ├── environment-source.ts
│   ├── file-source.ts
│   └── memory-source.ts
├── validators/                  # 验证器（保留）
│   ├── index.ts
│   ├── business-validator.ts
│   └── schema-validator.ts
├── config-manager.ts            # 旧的配置管理器（待删除）
└── index.ts                     # 配置模块入口
```

## 5. 核心组件重构设计

### 5.1 ConfigLoadingModule（重写）

**职责**：
- 配置发现和加载
- 配置验证
- 配置合并
- 提供配置访问接口

**主要方法**：
```typescript
class ConfigLoadingModule {
  // 初始化
  async initialize(basePath: string): Promise<void>
  
  // 加载所有配置
  async loadAll(): Promise<Record<string, any>>
  
  // 加载特定模块配置
  async loadModule(moduleType: string): Promise<Record<string, any>>
  
  // 重新加载配置
  async reload(): Promise<void>
  
  // 配置访问
  get<T>(key: string, defaultValue?: T): T
  getAll(): Record<string, any>
  has(key: string): boolean
  
  // Schema管理
  registerSchema(moduleType: string, schema: z.ZodType<any>): void
  validateModule(moduleType: string, config: any): ConfigValidationResult
}
```

**内部实现**：
- 直接使用ConfigDiscovery发现配置文件
- 直接使用SchemaRegistry验证配置
- 内置简单的配置合并逻辑
- 移除对Loaders和RuleManager的依赖

### 5.2 SchemaRegistry（简化）

**职责**：
- 注册和管理Schema
- 提供配置验证功能

**主要方法**：
```typescript
class SchemaRegistry {
  // 注册Schema
  register(moduleType: string, schema: z.ZodType<any>): void
  
  // 获取Schema
  get(moduleType: string): z.ZodType<any> | undefined
  
  // 验证配置
  validate(moduleType: string, config: any): ConfigValidationResult
  
  // 检查模块类型是否存在
  has(moduleType: string): boolean
  
  // 获取所有已注册的模块类型
  getRegisteredTypes(): string[]
}
```

**移除的功能**：
- 版本历史记录
- Schema兼容性检查
- 预验证功能

### 5.3 ConfigDiscovery（简化）

**职责**：
- 扫描文件系统发现配置文件
- 按模块类型分组

**主要方法**：
```typescript
class ConfigDiscovery {
  // 发现所有配置文件
  async discoverAll(basePath: string): Promise<ConfigFile[]>
  
  // 发现特定模块的配置文件
  async discoverModule(modulePath: string, moduleType: string): Promise<ConfigFile[]>
  
  // 按模块类型分组
  groupByModuleType(files: ConfigFile[]): Map<string, ConfigFile[]>
}
```

**简化内容**：
- 减少配置选项
- 简化优先级计算逻辑
- 优化文件扫描性能

## 6. Schema定义组织

### 6.1 Schema目录结构

```
loading/schemas/
├── index.ts           # 导出所有Schema
├── llm-schema.ts      # LLM配置Schema
├── tool-schema.ts     # 工具配置Schema
├── prompt-schema.ts   # 提示配置Schema
└── pool-schema.ts     # 池配置Schema
```

### 6.2 Schema定义示例

```typescript
// loading/schemas/llm-schema.ts
import { z } from 'zod';

export const LLMSchema = z.object({
  providers: z.record(z.object({
    type: z.enum(['openai', 'anthropic', 'gemini', 'mock']),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
    model: z.string(),
    timeout: z.number().optional(),
    maxRetries: z.number().optional()
  })),
  defaultProvider: z.string().optional(),
  globalSettings: z.object({
    timeout: z.number().optional(),
    maxRetries: z.number().optional(),
    temperature: z.number().optional()
  }).optional()
});

// loading/schemas/index.ts
export { LLMSchema } from './llm-schema';
export { ToolSchema } from './tool-schema';
export { PromptSchema } from './prompt-schema';
export { PoolSchema } from './pool-schema';

export const ALL_SCHEMAS = {
  llm: LLMSchema,
  tools: ToolSchema,
  prompts: PromptSchema,
  pools: PoolSchema
};
```

## 7. 配置加载流程（简化后）

```
1. ConfigLoadingModule.initialize(basePath)
   ↓
2. 注册默认Schema
   ↓
3. ConfigDiscovery.discoverAll(basePath)
   ↓
4. 按模块类型分组配置文件
   ↓
5. 对每个模块：
   a. 读取并解析配置文件
   b. 应用处理器（环境变量、继承）
   c. SchemaRegistry.validate()
   d. 简单的深度合并
   ↓
6. 合并所有模块配置
   ↓
7. 返回最终配置
```

## 8. 工具函数

创建 `loading/utils.ts` 文件，提供通用的工具函数：

```typescript
// 解析配置文件
export async function parseConfigFile(filePath: string): Promise<any>

// 深度合并对象
export function deepMerge(target: any, source: any): any

// 浅度合并对象
export function shallowMerge(target: any, source: any): any

// 获取嵌套值
export function getNestedValue(obj: any, path: string): any

// 设置嵌套值
export function setNestedValue(obj: any, path: string, value: any): void

// 检测模块类型
export function detectModuleType(relativePath: string): string

// 计算文件优先级
export function calculatePriority(relativePath: string, moduleType: string): number
```

## 9. 迁移步骤

### 9.1 第一阶段：创建新的Schema定义

1. 创建 `loading/schemas/` 目录
2. 从 `loading/rules/` 目录提取Schema定义
3. 创建 `loading/schemas/index.ts`

### 9.2 第二阶段：简化SchemaRegistry

1. 移除版本管理功能
2. 移除兼容性检查
3. 简化验证逻辑

### 9.3 第三阶段：重写ConfigLoadingModule

1. 移除对RuleManager的依赖
2. 移除对Loaders的依赖
3. 直接实现配置加载逻辑
4. 简化接口

### 9.4 第四阶段：简化ConfigDiscovery

1. 减少配置选项
2. 简化优先级计算
3. 优化性能

### 9.5 第五阶段：创建工具函数

1. 创建 `loading/utils.ts`
2. 提取通用工具函数
3. 更新所有引用

### 9.6 第六阶段：删除旧代码

1. 删除 `loading/rules/` 目录
2. 删除 `loading/loaders/` 目录
3. 删除 `loading/base-loader.ts`
4. 删除 `loading/dependency-resolver.ts`
5. 删除 `loading/loading-cache.ts`
6. 删除旧的 `config-manager.ts`

### 9.7 第七阶段：更新导入和测试

1. 更新所有导入路径
2. 运行测试验证
3. 修复发现的问题

## 10. 预期收益

### 10.1 代码简化

- **删除约500行代码**：移除不必要的抽象层
- **减少文件数量**：从约15个文件减少到约8个文件
- **简化依赖关系**：移除复杂的继承和依赖

### 10.2 性能提升

- **加载速度提升**：减少中间处理步骤
- **内存使用优化**：避免重复的对象创建
- **启动时间缩短**：简化的初始化流程

### 10.3 维护性改善

- **职责清晰**：每个组件职责单一
- **易于理解**：代码结构更直观
- **便于扩展**：简化的架构更容易添加新功能

## 11. 风险和注意事项

### 11.1 向后兼容性

- 确保配置文件格式不变
- 确保API接口保持兼容
- 提供迁移指南

### 11.2 测试覆盖

- 确保所有功能有测试覆盖
- 运行完整的测试套件
- 修复发现的问题

### 11.3 渐进式迁移

- 逐步迁移，避免一次性大改动
- 每个阶段都进行测试验证
- 保留回滚方案

## 12. 下一步行动

1. ✅ 创建设计文档
2. ⏳ 创建Schema定义
3. ⏳ 简化SchemaRegistry
4. ⏳ 重写ConfigLoadingModule
5. ⏳ 简化ConfigDiscovery
6. ⏳ 创建工具函数
7. ⏳ 删除旧代码
8. ⏳ 更新导入和测试
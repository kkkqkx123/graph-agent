# 工具实现目录结构设计方案

## 设计原则

基于项目架构约束和现有工具系统，遵循以下原则：

1. **分层架构约束**：严格遵循4层架构依赖规则
2. **配置驱动**：所有工具通过TOML配置定义和管理
3. **类型分类**：按工具类型组织目录结构
4. **可扩展性**：支持新工具类型和执行器
5. **测试友好**：便于单元测试和集成测试

## 推荐目录结构

### 1. 工具实现根目录
```
src/tools/
├── README.md                    # 工具开发指南
├── development-guide.md         # 开发规范和最佳实践
├── testing-guide.md            # 测试指南
├── examples/                    # 示例工具
│   ├── simple-tool/            # 简单工具示例
│   ├── complex-tool/           # 复杂工具示例
│   └── template/               # 工具模板
├── implementations/            # 工具实现
│   ├── builtin/               # 内置工具实现
│   │   ├── calculator/        # 计算器工具
│   │   │   ├── implementation.ts
│   │   │   ├── tests/
│   │   │   └── README.md
│   │   ├── hash-convert/      # 哈希转换工具
│   │   └── time-tool/         # 时间工具
│   ├── native/                # 原生工具实现
│   │   ├── sequential-thinking/ # 顺序思考工具
│   │   └── custom-tools/       # 自定义原生工具
│   ├── rest/                  # REST工具实现
│   │   ├── weather/           # 天气工具
│   │   ├── search/            # 搜索工具
│   │   └── fetch/             # HTTP请求工具
│   └── mcp/                   # MCP工具实现
│       ├── database/          # 数据库工具
│       └── custom-mcp/         # 自定义MCP工具
├── shared/                    # 共享工具组件
│   ├── utils/                 # 工具工具函数
│   ├── types/                 # 共享类型定义
│   ├── validators/            # 参数验证器
│   └── transformers/          # 数据转换器
└── testing/                   # 测试工具
    ├── mocks/                 # 模拟数据
    ├── fixtures/              # 测试固件
    └── helpers/               # 测试辅助函数
```

### 2. 单个工具目录结构
```
tool-name/
├── implementation.ts          # 工具实现主文件
├── index.ts                   # 导出文件
├── config.toml               # 工具配置
├── types.ts                  # 类型定义
├── validators.ts             # 参数验证
├── transformers.ts           # 数据转换
├── errors.ts                 # 错误定义
├── tests/                    # 测试文件
│   ├── unit.test.ts          # 单元测试
│   ├── integration.test.ts   # 集成测试
│   └── fixtures/             # 测试数据
├── docs/                     # 文档
│   ├── README.md             # 工具说明
│   ├── API.md                # API文档
│   └── examples/             # 使用示例
└── examples/                 # 示例代码
    ├── basic-usage.ts        # 基本用法
    └── advanced-usage.ts     # 高级用法
```

### 3. 配置组织结构
```
configs/tools/
├── __registry__.toml          # 工具注册表
├── builtin/                   # 内置工具配置
│   ├── calculator.toml
│   ├── hash_convert.toml
│   └── time_tool.toml
├── native/                    # 原生工具配置
│   ├── sequentialthinking.toml
│   └── custom-tools/
├── rest/                      # REST工具配置
│   ├── weather.toml
│   ├── fetch.toml
│   └── search.toml
└── mcp/                       # MCP工具配置
    ├── database.toml
    └── custom-mcp/
```

## 工具开发最佳实践

### 1. 实现规范

#### 内置工具实现
```typescript
// src/tools/implementations/builtin/calculator/implementation.ts
import { ToolExecutorBase } from '../../../../services/tools/executors/tool-executor-base';
import { Tool } from '../../../../domain/tools/entities/tool';
import { ToolExecution } from '../../../../domain/tools/entities/tool-execution';
import { ToolResult } from '../../../../domain/tools/entities/tool-result';

export class CalculatorImplementation {
  /**
   * 执行计算
   * 遵循单一职责原则
   */
  async calculate(expression: string, precision: number = 2): Promise<number> {
    // 实现计算逻辑
    // 参数验证
    // 错误处理
    // 结果格式化
  }

  /**
   * 验证表达式
   * 确保输入安全
   */
  private validateExpression(expression: string): void {
    // 安全检查
    // 语法验证
  }
}
```

#### 原生工具实现
```typescript
// src/tools/implementations/native/sequential-thinking/implementation.ts
import { NativeToolExecutor } from '../../../shared/executors/native-tool-executor';
import { ToolConfig } from '../../../../domain/tools/value-objects/tool-config';

export class SequentialThinkingImplementation extends NativeToolExecutor {
  constructor(config: ToolConfig) {
    super(config);
  }

  /**
   * 执行顺序思考
   * 状态管理
   * 步骤跟踪
   */
  async executeThinking(
    problem: string,
    steps: number,
    context?: Record<string, any>
  ): Promise<ThinkingResult> {
    // 初始化状态
    // 分步处理
    // 结果汇总
  }
}
```

### 2. 配置规范

#### TOML配置模板
```toml
# 工具基本信息
name = "tool-name"
tool_type = "builtin|native|rest|mcp"
description = "工具描述"
enabled = true
timeout = 30

# 功能路径
function_path = "src.tools.implementations.{type}.{name}.implementation:{function}"

# 参数模式定义
[parameters_schema]
type = "object"

[parameters_schema.properties]
param1 = { type = "string", description = "参数1描述", required = true }
param2 = { type = "number", description = "参数2描述", default = 10 }

parameters_schema.required = ["param1"]

# 返回模式定义
[returns_schema]
type = "object"
properties = { result = { type = "string" } }

# 元数据
[metadata]
category = "category"
tags = ["tag1", "tag2"]
author = "developer"
version = "1.0.0"

# 特定类型配置
[builtin_config]
# 内置工具特定配置

[native_config]
# 原生工具特定配置
command = "node"
args = ["--max-old-space-size=512"]

[rest_config]
# REST工具特定配置
base_url = "https://api.example.com"
headers = { "Content-Type" = "application/json" }
timeout = 30

[mcp_config]
# MCP工具特定配置
server_command = "mcp-server"
server_args = ["--config", "config.json"]
```

### 3. 测试规范

#### 单元测试结构
```typescript
// tests/unit.test.ts
import { ToolImplementation } from '../implementation';
import { mockTool, mockExecution } from '../../../testing/mocks';

describe('ToolImplementation', () => {
  let implementation: ToolImplementation;

  beforeEach(() => {
    implementation = new ToolImplementation();
  });

  describe('execute', () => {
    it('应该成功执行有效参数', async () => {
      // 测试成功场景
    });

    it('应该处理无效参数', async () => {
      // 测试错误处理
    });

    it('应该处理超时情况', async () => {
      // 测试超时处理
    });
  });

  describe('validate', () => {
    it('应该验证参数模式', () => {
      // 测试参数验证
    });
  });
});
```

#### 集成测试结构
```typescript
// tests/integration.test.ts
import { ToolExecutor } from '../../../../services/tools/executors';
import { Container } from '../../../../di/container';

describe('Tool Integration', () => {
  let container: Container;
  let executor: ToolExecutor;

  beforeAll(async () => {
    container = await Container.create();
    executor = container.get(ToolExecutor);
  });

  it('应该集成到执行器', async () => {
    // 测试完整集成流程
  });

  it('应该处理并发执行', async () => {
    // 测试并发场景
  });
});
```

## 开发流程

### 1. 新工具开发步骤

1. **需求分析**
   - 确定工具类型（builtin/native/rest/mcp）
   - 定义功能和参数
   - 设计错误处理策略

2. **目录创建**
   - 在对应类型目录下创建工具目录
   - 遵循标准目录结构

3. **配置定义**
   - 创建TOML配置文件
   - 定义参数和返回模式
   - 配置元数据和特定类型设置

4. **实现开发**
   - 实现核心功能
   - 添加参数验证
   - 实现错误处理
   - 编写文档和示例

5. **测试编写**
   - 单元测试覆盖核心逻辑
   - 集成测试验证集成
   - 性能测试（如需要）

6. **注册配置**
   - 更新注册表文件
   - 添加工具到对应分类

7. **验证部署**
   - 本地测试验证
   - 配置加载测试
   - 集成环境测试

### 2. 工具模板生成器

建议创建工具脚手架生成器：

```bash
# 生成新工具模板
npm run generate:tool --type=native --name=my-tool

# 生成器将创建：
# - 标准目录结构
# - 配置文件模板
# - 实现文件模板
# - 测试文件模板
# - 文档模板
```

## 质量保证

### 1. 代码质量标准

- **类型安全**：完整的TypeScript类型定义
- **错误处理**：统一的错误处理和日志记录
- **参数验证**：输入参数严格验证
- **文档完整**：API文档和使用示例
- **测试覆盖**：核心逻辑100%测试覆盖

### 2. 性能标准

- **响应时间**：工具执行超时控制
- **资源使用**：内存和CPU使用监控
- **并发处理**：支持并发执行
- **缓存策略**：适当的缓存机制

### 3. 安全标准

- **输入验证**：防止注入攻击
- **权限控制**：访问权限验证
- **数据加密**：敏感数据加密处理
- **审计日志**：完整的操作日志

## 迁移策略

### 现有工具迁移

1. **评估现有工具**：分析当前工具实现
2. **制定迁移计划**：分阶段迁移策略
3. **保持兼容性**：确保API兼容性
4. **逐步迁移**：按优先级逐步迁移
5. **验证测试**：完整测试验证

### 新工具开发

1. **遵循新结构**：直接使用新目录结构
2. **使用模板**：利用工具模板生成器
3. **完整测试**：确保质量和性能
4. **文档完善**：提供完整文档

这个设计方案既保持了与现有架构的一致性，又提供了清晰的开发指导和质量保证机制。
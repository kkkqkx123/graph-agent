# LLM工具定义改进方案

## 1. 当前问题分析

### 1.1 模块依赖关系混乱

**当前架构问题**：
- `tool-converter.ts`位于`packages/common-utils/src/llm/`目录，但它是处理工具转换的
- LLM模块和Tool模块职责不清，存在双向依赖风险
- 工具定义的验证逻辑分散在多个地方

**正确的依赖关系**：
```
Tool模块（独立）
    ↓ 提供类型定义和转换功能
LLM模块（依赖Tool）
    ↓ 使用工具定义
LLM Provider（OpenAI/Anthropic/Gemini）
```

### 1.2 类型定义不完整

当前`ToolProperty`类型缺少重要的JSON Schema属性：
- 嵌套类型支持（items、properties）
- 约束条件（minLength、maxLength、minimum、maximum等）
- 复合类型（anyOf、oneOf、allOf）

### 1.3 验证逻辑分散

- 工具定义验证在`sdk/core/validation/tool-config-validator.ts`
- 参数验证在`packages/tool-executors/src/core/base/ParameterValidator.ts`
- 缺少统一的验证入口

## 2. Anthropic SDK功能评估

### 2.1 不需要迁移的功能

1. **toolRunner**：高级工具执行器，当前系统有自己的工具执行机制
2. **betaZodTool**：已有Zod，不需要重复实现
3. **流式工具执行**：当前系统有自己的流式处理机制
4. **工具执行器**：当前系统在tool-executors包中已有实现

### 2.2 值得参考的设计

1. **工具定义格式**：使用完整的JSON Schema规范
2. **类型安全**：使用Zod提供编译时和运行时验证
3. **描述增强**：在schema中添加详细的描述信息

## 3. 运行时检查的目的和范围

### 3.1 工具定义验证（配置时）

**目的**：验证工具定义是否符合JSON Schema规范

**检查内容**：
- 工具名称和描述是否有效
- 参数schema结构是否正确
- 必需参数是否在properties中定义
- 类型定义是否有效

**执行时机**：工具注册时

**责任模块**：Tool模块

### 3.2 参数验证（运行时）

**目的**：验证工具调用参数是否符合schema定义

**检查内容**：
- 必需参数是否提供
- 参数类型是否正确
- 枚举值是否有效
- 约束条件是否满足

**执行时机**：工具执行前

**责任模块**：Tool模块（ParameterValidator）

### 3.3 LLM响应解析（解析时）

**目的**：验证LLM返回的工具调用格式是否正确

**检查内容**：
- 工具调用ID是否有效
- 工具名称是否存在
- 参数是否为有效的JSON

**执行时机**：解析LLM响应时

**责任模块**：LLM模块

**关键点**：这三个验证目的不同，不应该混淆。

## 4. Zod使用策略

### 4.1 继续使用Zod的理由

1. **已在项目中广泛使用**：tool-executors、validation等模块都在使用
2. **统一的验证框架**：避免引入多个验证库
3. **类型安全**：提供编译时和运行时验证
4. **生态成熟**：文档完善，社区活跃

### 4.2 使用原则

1. **统一使用Zod**：所有验证逻辑都使用Zod
2. **避免重复实现**：不要创建自定义的验证器
3. **利用Zod特性**：使用Zod的类型推断和自动转换

## 5. 改进的模块架构

### 5.1 模块职责划分

```
packages/types/
├── tool/
│   ├── definition.ts        # 工具定义类型（核心）
│   ├── config.ts            # 工具配置类型
│   └── index.ts

packages/tool-utils/         # 新建：工具工具包
├── schema/
│   ├── validator.ts         # 工具定义验证器
│   └── converter.ts         # 工具格式转换器
├── parameter/
│   └── validator.ts         # 参数验证器（已有，迁移）
├── builder/
│   └── tool-builder.ts      # 工具构建器
└── index.ts

packages/common-utils/
├── llm/
│   ├── clients/             # LLM客户端实现
│   ├── base-client.ts       # 基础客户端
│   └── index.ts
└── index.ts
```

### 5.2 依赖关系

```
packages/types (基础类型)
    ↓
packages/tool-utils (工具工具)
    ↓
packages/common-utils/llm (LLM模块)
    ↓
LLM Provider Clients
```

**单向依赖**：
- LLM模块依赖Tool模块的类型定义
- LLM模块使用Tool模块的转换功能
- Tool模块不依赖LLM模块

### 5.3 职责分离

**Tool模块负责**：
- 工具定义的类型定义
- 工具定义的验证
- 工具格式的转换
- 参数验证

**LLM模块负责**：
- LLM请求构建
- LLM响应解析
- 工具调用的格式化
- 与LLM Provider的交互

## 6. 实施计划

### 阶段一：模块重构（优先级：高）

**目标**：将tool-converter从LLM模块移到Tool模块

**任务**：
1. 创建`packages/tool-utils`包
2. 将`tool-converter.ts`从`common-utils/llm`移到`tool-utils/schema`
3. 更新LLM客户端的导入路径
4. 更新测试用例

**文件**：
- `packages/tool-utils/package.json`（新建）
- `packages/tool-utils/src/schema/converter.ts`（从common-utils迁移）
- `packages/common-utils/src/llm/clients/anthropic.ts`（更新导入）
- `packages/common-utils/src/llm/clients/openai-chat.ts`（更新导入）

**预计工作量**：2-3小时

### 阶段二：类型定义增强（优先级：高）

**目标**：完善ToolProperty类型定义

**任务**：
1. 扩展`ToolProperty`类型，添加完整的JSON Schema属性
2. 添加嵌套类型支持
3. 添加约束条件支持
4. 更新相关测试

**文件**：
- `packages/types/src/tool/config.ts`
- `packages/types/src/tool/__tests__/config.test.ts`

**预计工作量**：2-3小时

### 阶段三：验证器统一（优先级：高）

**目标**：统一工具定义验证逻辑

**任务**：
1. 在`tool-utils/schema`创建`validator.ts`
2. 使用Zod实现工具定义验证
3. 整合现有的验证逻辑
4. 更新测试用例

**文件**：
- `packages/tool-utils/src/schema/validator.ts`（新建）
- `packages/tool-utils/src/schema/__tests__/validator.test.ts`（新建）
- `sdk/core/validation/tool-config-validator.ts`（更新，使用新的验证器）

**预计工作量**：3-4小时

### 阶段四：参数验证器迁移（优先级：中）

**目标**：将参数验证器迁移到tool-utils

**任务**：
1. 将`ParameterValidator`从tool-executors迁移到tool-utils
2. 使用Zod增强验证功能
3. 更新tool-executors的导入路径
4. 更新测试用例

**文件**：
- `packages/tool-utils/src/parameter/validator.ts`（从tool-executors迁移）
- `packages/tool-executors/src/core/base/ParameterValidator.ts`（删除）
- `packages/tool-executors/src/core/base/ToolExecutor.ts`（更新导入）

**预计工作量**：2-3小时

### 阶段五：工具构建器（优先级：中）

**目标**：提供便捷的工具定义方式

**任务**：
1. 创建`ToolBuilder`类
2. 创建工具模板函数
3. 编写使用示例
4. 编写单元测试

**文件**：
- `packages/tool-utils/src/builder/tool-builder.ts`（新建）
- `packages/tool-utils/src/builder/templates.ts`（新建）
- `packages/tool-utils/src/builder/__tests__/tool-builder.test.ts`（新建）
- `packages/tool-utils/src/index.ts`（更新导出）

**预计工作量**：3-4小时

### 阶段六：LLM响应解析验证（优先级：低）

**目标**：增强LLM响应解析的验证

**任务**：
1. 在LLM客户端添加工具调用格式验证
2. 使用Zod验证工具调用参数
3. 添加错误处理和日志
4. 更新测试用例

**文件**：
- `packages/common-utils/src/llm/clients/anthropic.ts`
- `packages/common-utils/src/llm/clients/openai-chat.ts`
- `packages/common-utils/src/llm/__tests__/anthropic.test.ts`
- `packages/common-utils/src/llm/__tests__/openai-chat.test.ts`

**预计工作量**：2-3小时

## 7. 兼容性保证

### 7.1 向后兼容

1. **类型定义**：新添加的字段都是可选的
2. **API接口**：保持相同的函数签名
3. **现有代码**：通过导入路径映射保持兼容

### 7.2 迁移路径

1. **渐进式迁移**：可以逐步使用新功能
2. **可选验证**：验证器可以按需启用
3. **工具构建器**：提供更便捷的方式，但不强制使用

## 8. 测试策略

### 8.1 单元测试

- 工具定义验证器测试
- 参数验证器测试
- 格式转换器测试
- 工具构建器测试

### 8.2 集成测试

- 工具定义到LLM请求的完整流程
- 不同provider的工具转换
- 工具执行的端到端测试

### 8.3 兼容性测试

- 确保现有工具定义仍然有效
- 测试各种JSON Schema结构
- 测试边界情况

## 9. 总结

### 9.1 核心改进

1. **模块解耦**：Tool模块独立，LLM模块单向依赖
2. **类型完整**：支持完整的JSON Schema规范
3. **验证统一**：使用Zod统一验证逻辑
4. **职责清晰**：明确不同验证的目的和范围

### 9.2 不做的事情

1. 不实现toolRunner（已有自己的工具执行机制）
2. 不实现betaZodTool（已有Zod）
3. 不实现流式工具执行（已有自己的流式处理）
4. 不创建自定义验证器（统一使用Zod）

### 9.3 预计工作量

总计：14-20小时

- 阶段一：2-3小时
- 阶段二：2-3小时
- 阶段三：3-4小时
- 阶段四：2-3小时
- 阶段五：3-4小时
- 阶段六：2-3小时
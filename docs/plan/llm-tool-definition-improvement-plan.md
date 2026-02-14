# LLM工具定义改进方案

## 1. 核心问题识别

### 1.1 当前架构的根本问题

**错误的模块划分**：
- `tool-converter.ts`位于LLM模块中，但实际上它应该属于Tool模块
- 工具转换逻辑与LLM客户端耦合，违反了单一职责原则

**混淆验证目的**：
- 静态检查（工具定义验证）和运行时检查（LLM响应解析）混在一起
- 没有明确区分配置时验证和执行时验证

### 1.2 正确的职责划分

```
静态检查（配置时） → sdk/core/validation
    ↓
工具定义 → packages/types
    ↓  
工具格式转换 → packages/common-utils/tool
    ↓
LLM请求构建 → packages/common-utils/llm  
    ↓
LLM响应解析 → packages/common-utils/llm（运行时检查）
    ↓
工具参数验证 → packages/tool-executors（运行时检查）
    ↓
工具执行 → packages/tool-executors
```

## 2. 静态检查 vs 运行时检查

### 2.1 静态检查（Static Validation）

**目的**：确保工具定义符合JSON Schema规范

**时机**：工具注册、配置加载时

**责任模块**：`sdk/core/validation/tool-config-validator.ts`

**输入**：完整的`Tool`对象

**验证内容**：
- 工具名称、描述是否有效
- 参数schema结构是否正确
- 必需参数是否在properties中定义
- 类型定义是否完整

**输出**：验证通过或配置错误

### 2.2 运行时检查 - LLM响应解析（Runtime Parsing）

**目的**：将LLM返回的原始数据转换为标准化格式

**时机**：LLM API响应处理时

**责任模块**：`packages/common-utils/src/llm/clients/*.ts`

**输入**：LLM Provider的原始API响应

**处理内容**：
- 提取工具调用信息
- 转换为统一的`LLMToolCall`格式
- 处理不同Provider的格式差异

**输出**：标准化的`LLMResult`对象

### 2.3 运行时检查 - 工具参数验证（Runtime Validation）

**目的**：验证LLM生成的工具调用参数是否有效

**时机**：工具执行前

**责任模块**：`packages/tool-executors/src/core/base/ParameterValidator.ts`

**输入**：LLM生成的参数对象（已解析的JSON）

**验证内容**：
- 参数是否符合工具定义的schema
- 必需参数是否提供
- 参数类型和约束是否满足

**输出**：验证通过或运行时错误

## 3. 正确的模块架构

### 3.1 模块依赖关系

```
packages/types (基础类型定义)
    ↓
packages/common-utils/tool (工具格式转换)
    ↓
sdk/core/validation (静态检查)
    ↓
packages/common-utils/llm (LLM模块，使用工具转换)
    ↓
packages/tool-executors (工具执行，使用参数验证)
```

### 3.2 目录结构

```
packages/
├── types/
│   └── src/
│       └── tool/
│           ├── config.ts          # ToolProperty等类型定义
│           └── definition.ts      # ToolSchema等类型定义
│
├── common-utils/
│   └── src/
│       ├── tool/                  # 工具相关工具函数
│       │   ├── converter.ts       # 工具格式转换（从llm移过来）
│       │   └── index.ts
│       ├── llm/                   # LLM模块
│       │   ├── clients/
│       │   ├── base-client.ts
│       │   └── index.ts
│       └── index.ts
│
└── tool-executors/
    └── src/
        └── core/
            └── base/
                └── ParameterValidator.ts  # 运行时参数验证
```

### 3.3 各模块职责

**packages/types**：
- 定义`ToolSchema`、`ToolProperty`等基础类型
- 提供完整的JSON Schema类型支持

**packages/common-utils/tool**：
- **仅包含工具格式转换函数**：`convertToolsToOpenAIFormat`、`convertToolsToAnthropicFormat`等
- **不包含任何验证逻辑**
- **纯函数，无副作用**

**sdk/core/validation**：
- 静态检查：验证工具定义的完整性
- 使用Zod进行编译时和运行时验证
- 在配置加载时执行

**packages/common-utils/llm**：
- LLM客户端实现
- 在请求构建时调用`common-utils/tool`的转换函数
- 在响应解析时处理工具调用格式

**packages/tool-executors**：
- 工具执行逻辑
- 运行时参数验证
- 在执行前验证LLM生成的参数

## 4. 具体改进措施

### 4.1 移动tool-converter到正确位置

**当前**：`packages/common-utils/src/llm/tool-converter.ts`

**目标**：`packages/common-utils/src/tool/converter.ts`

**理由**：
- 工具转换是工具相关的功能，不属于LLM模块
- LLM模块只需要使用转换结果，不需要知道转换逻辑
- 符合单一职责原则

### 4.2 增强类型定义

**文件**：`packages/types/src/tool/config.ts`

**改进**：
- 扩展`ToolProperty`类型，支持完整的JSON Schema属性
- 添加嵌套类型支持（items、properties）
- 添加约束条件（minLength、maxLength、minimum、maximum等）
- 添加复合类型支持（anyOf、oneOf、allOf）

**注意**：这只是类型定义，不包含验证逻辑

### 4.3 简化tool-converter

**当前问题**：考虑添加验证逻辑

**正确做法**：保持纯转换，不做任何验证

```typescript
// packages/common-utils/src/tool/converter.ts
export function convertToolsToAnthropicFormat(tools: ToolSchema[]): AnthropicTool[] {
  // 只做格式转换，不验证
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',  // Anthropic要求明确指定type
      ...tool.parameters
    }
  }));
}
```

### 4.4 明确验证边界

**静态检查**（sdk/core/validation）：
- 验证工具定义是否符合扩展后的JSON Schema规范
- 在工具注册时执行
- 使用Zod进行完整验证

**运行时检查**（tool-executors）：
- 验证LLM生成的参数是否符合工具定义
- 在工具执行前执行
- 使用Zod验证具体参数值

**LLM响应解析**（common-utils/llm）：
- 不做验证，只做格式转换
- 将Provider特定格式转换为统一格式
- 如果格式错误，直接抛出解析异常

## 5. 实施计划

### 阶段一：移动tool-converter（1小时）

**任务**：
1. 在`packages/common-utils/src`创建`tool`目录
2. 将`tool-converter.ts`从`llm`移到`tool`目录
3. 更新`tool/index.ts`导出转换函数
4. 更新LLM客户端的导入路径（从`@modular-agent/common-utils/llm`改为`@modular-agent/common-utils/tool`）
5. 更新`common-utils/index.ts`导出tool模块
6. 确保所有测试通过

**验证**：现有功能完全不变，只是文件位置改变

### 阶段二：增强类型定义（2小时）

**任务**：
1. 扩展`ToolProperty`类型定义
2. 添加完整的JSON Schema属性支持
3. 更新相关测试用例
4. 确保向后兼容

**验证**：现有代码继续工作，新功能可选使用

### 阶段三：更新静态验证（2小时）

**任务**：
1. 更新`ToolConfigValidator`以支持新的类型定义
2. 使用Zod验证完整的JSON Schema规范
3. 添加相应的测试用例

**验证**：工具定义验证更加严格和完整

### 阶段四：简化tool-converter（1小时）

**任务**：
1. 移除tool-converter中的任何验证逻辑
2. 确保只做纯格式转换
3. 添加必要的格式修正（如Anthropic的type字段）

**验证**：转换函数更简单，职责更清晰

## 6. 关键原则

### 6.1 单一职责
- 每个模块只负责一个明确的职责
- 静态检查、格式转换、运行时验证分离

### 6.2 单向依赖
- Tool模块不依赖LLM模块
- LLM模块依赖Tool模块的类型和转换功能
- 验证模块依赖类型定义

### 6.3 无重复逻辑
- 验证逻辑只在一处实现
- 转换逻辑只在一处实现
- 避免在多个地方重复相同的功能

### 6.4 向后兼容
- 所有改进保持向后兼容
- 现有代码无需修改即可继续工作
- 新功能可选使用

### 6.5 简洁架构
- 不创建新的独立包
- 工具相关功能放在`packages/common-utils/tool`
- 保持项目结构简洁

## 7. 总结

**核心改进**：
1. **正确的模块划分**：tool-converter移到`common-utils/tool`
2. **清晰的职责边界**：静态检查、格式转换、运行时验证分离
3. **完整的类型支持**：支持完整的JSON Schema规范
4. **简化的转换逻辑**：tool-converter只做纯格式转换
5. **简洁的架构**：不增加新包，利用现有的common-utils

**不做的事情**：
1. 不在tool-converter中添加验证逻辑
2. 不创建复杂的工具构建器
3. 不实现toolRunner等高级功能
4. 不改变现有的验证和执行机制
5. 不创建新的独立包

这个方案解决了根本的架构问题，同时保持了系统的简洁性和向后兼容性。
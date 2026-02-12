# 工具模块重构方案

## 背景
根据项目架构原则，**sdk中不应该包含工具的具体实现**。当前sdk/core/tools目录中包含了具体的执行逻辑，这违反了模块化设计原则。

## 问题分析

### 当前状态
1. **sdk/core/tools/index.ts** 导出了不存在的执行器文件引用
2. **BaseToolExecutor** 类包含了参数验证、重试、超时等具体实现逻辑
3. **ToolExecutorHelper** 类提供了重复的执行辅助功能
4. **packages/tool-executors** 模块已经提供了完整的执行器实现

### 违反的原则
- **职责分离**: SDK应该只负责执行框架，工具实现应由应用层或专用包负责
- **模块化**: 具体实现应该放在专门的包中，而不是核心SDK中

## 重构方案

### 移除的内容
1. **sdk/core/tools/base-tool-executor.ts**
   - 完全移除 `BaseToolExecutor` 类
   - 所有具体的执行逻辑（参数验证、重试、超时）都已存在于 `packages/tool-executors` 中

2. **sdk/core/tools/utils/tool-executor-helper.ts**
   - 完全移除 `ToolExecutorHelper` 类
   - 这些辅助功能在 `packages/tool-executors` 的具体执行器中已经实现

3. **sdk/core/tools/index.ts** 中的错误导出
   - 移除对不存在的执行器文件的引用：
     ```typescript
     // 移除以下行
     export { StatelessToolExecutor } from './executors/stateless';
     export { StatefulToolExecutor } from './executors/stateful';
     export { RestToolExecutor } from './executors/rest';
     export { McpToolExecutor } from './executors/mcp';
     ```

### 保留的内容
1. **sdk/core/tools/tool-registry.ts**
   - 保留 `ToolRegistry` 类
   - 这是框架层面的工具注册和管理功能

2. **sdk/core/tools/interfaces/tool-executor.ts**
   - 保留 `IToolExecutor` 接口
   - 这是标准的执行器接口定义

3. **sdk/core/tools/README.md**
   - 更新文档以反映新的架构

### 更新后的内容

#### sdk/core/tools/index.ts (更新后)
```typescript
/**
 * 工具模块导出
 */

// 工具注册表
export { ToolRegistry } from './tool-registry';

// 执行器接口
export type { IToolExecutor } from './interfaces/tool-executor';

// 执行选项和结果类型
export type { ToolExecutionOptions, ToolExecutionResult } from '@modular-agent/types/tool';
```

#### sdk/core/tools/README.md (更新要点)
- 移除关于内置执行器的详细说明
- 强调SDK只提供工具注册和接口定义
- 指向 `@modular-agent/tool-executors` 包获取具体执行器实现

## 依赖关系调整

### SDK依赖
- 保持对 `@modular-agent/tool-executors` 的依赖
- 在需要使用具体执行器的地方，直接从 `@modular-agent/tool-executors` 导入

### 使用示例 (更新后)
```typescript
// 以前的方式（错误）
import { StatelessToolExecutor } from '@modular-agent/sdk/core/tools/executors/stateless';

// 新的方式（正确）
import { StatelessExecutor } from '@modular-agent/tool-executors';
```

## 测试影响

### 需要更新的测试
1. **sdk/core/tools/__tests__/rest-executor.test.ts**
   - 这个测试文件引用了不存在的 `RestToolExecutor`
   - 应该被移除或重构为集成测试

2. **sdk/core/tools/__tests__/tool-registry.test.ts**
   - 保留，因为 `ToolRegistry` 仍然存在

### 新的测试策略
- 单元测试应该在 `packages/tool-executors` 中进行
- SDK中的测试应该专注于集成测试，验证工具注册和调用流程

## 实施步骤

### 步骤1: 移除多余文件
- 删除 `sdk/core/tools/base-tool-executor.ts`
- 删除 `sdk/core/tools/utils/tool-executor-helper.ts`
- 删除 `sdk/core/tools/__tests__/rest-executor.test.ts`

### 步骤2: 更新索引文件
- 更新 `sdk/core/tools/index.ts` 移除错误的导出
- 只保留 `ToolRegistry` 和接口类型导出

### 步骤3: 更新文档
- 更新 `sdk/core/tools/README.md` 反映新的架构
- 移除关于具体执行器实现的说明

### 步骤4: 验证依赖
- 确保所有使用工具执行器的地方都从 `@modular-agent/tool-executors` 导入
- 更新相关的导入语句

### 步骤5: 更新测试
- 移除无效的测试文件
- 确保剩余的测试仍然通过

## 预期收益

1. **清晰的职责分离**: SDK只负责框架，具体实现在专用包中
2. **减少代码重复**: 避免在SDK和tool-executors包中维护相同的逻辑
3. **更好的可维护性**: 具体实现的修改不会影响SDK核心
4. **符合架构原则**: 遵循"SDK不应该包含工具的具体实现"的设计原则

## 风险评估

### 低风险
- 所有具体实现都已经在 `packages/tool-executors` 中存在
- SDK的package.json已经包含了对 `@modular-agent/tool-executors` 的依赖
- 只需要更新导入路径，不需要重写业务逻辑

### 注意事项
- 需要确保所有使用方都更新了导入语句
- 需要验证现有的集成测试仍然通过
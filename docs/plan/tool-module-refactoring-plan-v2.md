# 工具模块重构方案（修订版）

## 背景
根据项目架构原则，**sdk中不应该包含工具的具体实现**。当前架构存在接口不一致和职责分离不清的问题。

## 问题深度分析

### 核心问题
1. **接口定义冲突**：
   - `@modular-agent/types` 中的 `IToolExecutor` 返回 `Promise<any>`
   - SDK期望的执行器返回 `Promise<ToolExecutionResult>`
   
2. **职责分离错误**：
   - `packages/tool-executors` 只返回原始结果，缺少通用功能（重试、超时、标准化结果）
   - SDK中的 `BaseToolExecutor` 实现了本应属于tool-executors包的功能

3. **类型安全风险**：
   - SDK定义了自己的接口，与实际执行器实现不匹配
   - 可能导致运行时类型错误

## 正确的架构设计

### 原则
- **单一职责**: 每个包只负责一个明确的职责
- **接口统一**: 所有执行器实现同一个标准接口
- **功能完整**: tool-executors包提供完整的执行器功能

### 职责分配
| 组件 | 职责 |
|------|------|
| `@modular-agent/types` | 定义标准接口和类型 |
| `@modular-agent/tool-executors` | 提供完整的执行器实现（包含重试、超时、标准化结果） |
| `@modular-agent/sdk` | 提供工具注册、管理和调用框架 |

## 重构方案

### 第一阶段：修复接口定义

#### 1. 更新types包中的IToolExecutor接口
```typescript
// packages/types/src/tool.ts
export interface IToolExecutor {
  execute(
    tool: Tool,
    parameters: Record<string, any>,
    options?: ToolExecutionOptions,
    threadContext?: any
  ): Promise<ToolExecutionResult>; // 返回标准化结果
}
```

#### 2. 移除SDK中的重复接口定义
- 删除 `sdk/core/tools/interfaces/tool-executor.ts`
- 所有引用改为从 `@modular-agent/types/tool` 导入

### 第二阶段：增强tool-executors包

#### 1. 为所有执行器添加通用功能
- 参数验证
- 重试机制
- 超时控制  
- 标准化结果格式 (`ToolExecutionResult`)

#### 2. 统一执行器基类
在 `packages/tool-executors` 中创建基类，包含通用逻辑：

```typescript
// packages/tool-executors/src/base-executor.ts
export abstract class BaseToolExecutor implements IToolExecutor {
  async execute(
    tool: Tool,
    parameters: Record<string, any>,
    options?: ToolExecutionOptions,
    threadContext?: any
  ): Promise<ToolExecutionResult> {
    // 通用逻辑：参数验证、重试、超时、结果包装
    // 调用子类的 doExecute 方法
  }
  
  protected abstract doExecute(
    tool: Tool,
    parameters: Record<string, any>,
    threadContext?: any
  ): Promise<any>;
}
```

#### 3. 更新具体执行器
- `StatelessExecutor`、`StatefulExecutor`、`RestExecutor`、`McpExecutor` 继承基类
- 只实现具体的 `doExecute` 方法

### 第三阶段：简化SDK

#### 1. 移除多余实现
- 删除 `sdk/core/tools/base-tool-executor.ts`
- 删除 `sdk/core/tools/utils/tool-executor-helper.ts`
- 删除不存在的执行器引用

#### 2. 更新索引文件
```typescript
// sdk/core/tools/index.ts
export { ToolRegistry } from './tool-registry';
export type { ToolExecutionOptions, ToolExecutionResult } from '@modular-agent/types/tool';
// 不再导出执行器，由用户直接从 tool-executors 包导入
```

#### 3. 更新文档
- 明确说明SDK只提供注册和管理功能
- 指向tool-executors包获取具体执行器

## 实施步骤

### 步骤1: 更新types包
- 修改 `IToolExecutor` 接口返回类型为 `Promise<ToolExecutionResult>`

### 步骤2: 增强tool-executors包  
- 添加 `BaseToolExecutor` 基类
- 更新所有具体执行器继承基类并实现 `doExecute`
- 确保所有执行器返回标准化的 `ToolExecutionResult`

### 步骤3: 清理SDK
- 移除所有具体实现代码
- 更新导入语句使用types包中的接口
- 更新文档和测试

### 步骤4: 验证和测试
- 确保所有执行器通过相同的接口测试
- 验证SDK集成正常工作
- 更新相关文档和示例

## 预期收益

1. **类型安全**: 统一的接口定义，消除类型不一致风险
2. **职责清晰**: 每个包只负责明确的职责
3. **功能完整**: tool-executors包提供完整的执行器功能
4. **易于维护**: 修改执行器逻辑只需在tool-executors包中进行
5. **符合架构原则**: SDK真正只包含框架代码，不包含具体实现

## 风险评估

### 中等风险
- 需要同时修改多个包（types、tool-executors、sdk）
- 接口变更可能影响现有代码

### 缓解措施
- 保持向后兼容性（如果可能）
- 提供详细的迁移指南
- 充分的测试覆盖
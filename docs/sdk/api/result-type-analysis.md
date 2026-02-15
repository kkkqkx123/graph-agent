# Result 类型重复性分析与改进方案

## 问题分析

### 1. ExecutionError 类型重复

**packages/types/src/errors.ts**:
- 类类型，继承自 `SDKError`
- 包含 `nodeId`, `workflowId` 等上下文信息
- 支持错误严重程度
- 用于 Core 层的错误处理

**sdk/api/types/execution-result.ts**:
- 接口类型
- 包含 `code`, `timestamp`, `requestId` 等信息
- 用于 API 层的执行结果

**问题**: 两个 `ExecutionError` 名称相同但类型不同，容易造成混淆。

### 2. Result 类型重复

**packages/types/src/result.ts**:
- 函数式编程风格
- `Result<T, E>` 类型
- 丰富的链式操作方法
- 适用于需要复杂错误处理的场景

**sdk/api/types/execution-result.ts**:
- 命令式风格
- `ExecutionResult<T>` 类型
- 包含 `executionTime` 字段
- 适用于命令执行场景

**问题**: 功能相似但设计理念不同，可能导致使用混乱。

## 改进方案

### 方案1: 统一使用 packages/types 的 Result 类型（推荐）

**优点**:
- 统一类型系统，减少重复
- 利用函数式编程的优势
- 更好的类型安全

**实施步骤**:
1. 修改 `ExecutionResult<T>` 为 `Result<T, ExecutionError>`
2. 保留 `executionTime` 作为上下文信息
3. 使用 `packages/types/src/errors.ts` 中的 `ExecutionError`
4. 更新所有使用 `ExecutionResult` 的代码

**示例**:
```typescript
// 修改前
export interface ExecutionSuccess<T> {
  success: true;
  data: T;
  executionTime: number;
}

// 修改后
export type ExecutionResult<T> = Result<T, ExecutionError & { executionTime: number }>;
```

### 方案2: 保持分离，明确职责（保守方案）

**优点**:
- 最小化改动
- 保持现有 API 不变
- 两个类型服务于不同场景

**实施步骤**:
1. 重命名 `sdk/api/types/execution-result.ts` 中的 `ExecutionError` 为 `CommandExecutionError`
2. 添加文档说明两个类型的区别和使用场景
3. 在 `packages/types/src/errors.ts` 中添加注释说明

**示例**:
```typescript
// sdk/api/types/execution-result.ts
export interface CommandExecutionError {
  message: string;
  code?: string;
  details?: Record<string, any>;
  timestamp?: number;
  requestId?: string;
  cause?: {
    name: string;
    message: string;
    stack?: string;
  };
}
```

### 方案3: 创建统一的 Result 包装器（折中方案）

**优点**:
- 兼顾两种设计理念
- 渐进式迁移
- 保持向后兼容

**实施步骤**:
1. 创建 `ExecutionResult<T>` 作为 `Result<T, ExecutionError>` 的包装器
2. 添加 `executionTime` 字段
3. 提供转换方法
4. 逐步迁移现有代码

**示例**:
```typescript
export interface ExecutionResult<T> {
  result: Result<T, ExecutionError>;
  executionTime: number;
}

export function toExecutionResult<T>(
  result: Result<T, ExecutionError>,
  executionTime: number
): ExecutionResult<T> {
  return { result, executionTime };
}
```

## 推荐方案

**推荐方案1**，理由：
1. 统一类型系统，减少维护成本
2. 函数式编程风格更安全、更易测试
3. `packages/types` 已经提供了完善的错误类型系统
4. 可以通过扩展类型来满足 `executionTime` 的需求

## 实施建议

如果采用方案1，需要：
1. 更新 `sdk/api/types/command.ts` 中的 `BaseCommand`
2. 更新所有命令类的返回类型
3. 更新 `execution-builder.ts` 中的使用方式
4. 更新所有测试文件
5. 提供迁移指南

## 风险评估

- **方案1**: 改动较大，需要全面测试，但长期收益高
- **方案2**: 改动最小，但类型系统仍然重复
- **方案3**: 渐进式迁移，但增加了复杂度

## 结论

建议采用**方案1**，统一使用 `packages/types` 的类型系统，但需要分阶段实施，确保向后兼容性。
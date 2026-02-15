# 简化错误处理方案设计

## 1. 问题分析

### 1.1 当前方案的复杂性问题

之前设计的错误处理中间件和转换器方案存在以下问题：

1. **过度设计**：引入了太多抽象层（检测器、转换器、中间件）
2. **性能开销**：每次错误处理都需要经过多层转换
3. **维护成本高**：需要维护大量的检测器和转换器
4. **学习曲线陡峭**：新开发者需要理解复杂的架构

### 1.2 根本问题

**核心问题**：底层服务抛出异常，上层代码必须用 try-catch 捕获，然后进行类型检查和转换。

```typescript
// 当前代码模式（重复89次）
try {
  await someService.execute();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const sdkError = error instanceof Error ? error : new Error(String(error));
  // ... 处理错误
}
```

## 2. 简化方案：使用 Result 类型

### 2.1 核心思想

**直接修改底层服务的返回类型，从抛出异常改为返回 `Result<T, SDKError>`**

这样调用方就不需要 try-catch，而是直接处理 Result。

### 2.2 已有基础设施

SDK 已经有完整的 Result 类型支持：

**文件**: `packages/types/src/result.ts`
```typescript
export type Result<T, E = Error> = Ok<T> | Err<E>;

export interface Ok<T, E = Error> {
  readonly _tag: 'Ok';
  readonly value: T;
  isOk(): this is Ok<T, E>;
  isErr(): this is Err<E>;
  unwrap(): T;
  // ... 其他方法
}

export interface Err<E> {
  readonly _tag: 'Err';
  readonly error: E;
  isOk(): this is Ok<never, E>;
  isErr(): this is Err<E>;
  // ... 其他方法
}
```

**文件**: `packages/common-utils/src/utils/result-utils.ts`
```typescript
export function ok<T, E = Error>(value: T): Ok<T, E>;
export function err<E>(error: E): Err<E>;
export function tryCatch<T>(fn: () => T): Result<T, Error>;
export function tryCatchAsync<T>(promise: Promise<T>): Promise<Result<T, Error>>;
```

### 2.3 改进后的代码模式

```typescript
// 改进后的代码模式
const result = await someService.execute();

if (result.isErr()) {
  // 直接使用 result.error，它已经是 SDKError 类型
  console.error(result.error.message);
  return;
}

// 使用 result.value
console.log(result.value);
```

## 3. 具体实施方案

### 3.1 修改 LLMWrapper

**当前实现**（`sdk/core/llm/wrapper.ts:50-70`）：
```typescript
async generate(request: LLMRequest): Promise<LLMResult> {
  const profile = this.getProfile(request.profileId);
  if (!profile) {
    throw new ConfigurationError('LLM Profile not found', ...);
  }
  
  const client = this.clientFactory.createClient(profile);
  const startTime = now();
  
  try {
    const result = await client.generate(request);
    result.duration = diffTimestamp(startTime, now());
    return result;
  } catch (error) {
    throw this.handleError(error, profile);
  }
}
```

**改进后实现**：
```typescript
async generate(request: LLMRequest): Promise<Result<LLMResult, LLMError>> {
  const profile = this.getProfile(request.profileId);
  if (!profile) {
    return err(new LLMError(
      'LLM Profile not found',
      'unknown',
      undefined,
      undefined,
      { profileId: request.profileId }
    ));
  }
  
  const client = this.clientFactory.createClient(profile);
  const startTime = now();
  
  const result = await tryCatchAsync(client.generate(request));
  
  if (result.isErr()) {
    return err(this.convertToLLMError(result.error, profile));
  }
  
  result.value.duration = diffTimestamp(startTime, now());
  return ok(result.value);
}

private convertToLLMError(error: unknown, profile: LLMProfile): LLMError {
  if (error instanceof LLMError) {
    return error;
  }
  
  const message = error instanceof Error ? error.message : String(error);
  const statusCode = error instanceof Error && 'statusCode' in error 
    ? (error as any).statusCode 
    : undefined;
  
  return new LLMError(
    `${profile.provider} API error: ${message}`,
    profile.provider,
    profile.model,
    statusCode,
    { profileId: profile.id },
    error instanceof Error ? error : undefined
  );
}
```

### 3.2 修改 ToolService

**当前实现**（`sdk/core/services/tool-service.ts:158-172`）：
```typescript
async execute(
  toolName: string,
  parameters: Record<string, any>,
  options?: ToolExecutionOptions,
  threadId?: string
): Promise<ToolExecutionResult> {
  const tool = this.getTool(toolName);
  const executor = this.executors.get(tool.type);
  
  try {
    return await executor.execute(tool, parameters, options, threadId);
  } catch (error) {
    if (error instanceof Error) {
      throw new ToolError(
        `Tool execution failed: ${error.message}`,
        toolName,
        tool.type,
        { parameters },
        error
      );
    }
    throw error;
  }
}
```

**改进后实现**：
```typescript
async execute(
  toolName: string,
  parameters: Record<string, any>,
  options?: ToolExecutionOptions,
  threadId?: string
): Promise<Result<ToolExecutionResult, ToolError>> {
  const tool = this.getTool(toolName);
  const executor = this.executors.get(tool.type);
  
  if (!executor) {
    return err(new ToolError(
      `No executor found for tool type '${tool.type}'`,
      toolName,
      tool.type,
      { parameters }
    ));
  }
  
  const result = await tryCatchAsync(
    executor.execute(tool, parameters, options, threadId)
  );
  
  if (result.isErr()) {
    return err(this.convertToToolError(result.error, toolName, tool.type, parameters));
  }
  
  return ok(result.value);
}

private convertToToolError(
  error: unknown,
  toolName: string,
  toolType: string,
  parameters: Record<string, any>
): ToolError {
  if (error instanceof ToolError) {
    return error;
  }
  
  const message = error instanceof Error ? error.message : String(error);
  
  return new ToolError(
    `Tool execution failed: ${message}`,
    toolName,
    toolType,
    { parameters },
    error instanceof Error ? error : undefined
  );
}
```

### 3.3 修改 CodeService

**当前实现**（`sdk/core/services/code-service.ts:203-216`）：
```typescript
async execute(
  scriptName: string,
  options?: Partial<ScriptExecutionOptions>,
  threadContext?: ThreadContext
): Promise<ScriptExecutionResult> {
  const script = this.getScript(scriptName);
  const executor = this.executorRegistry.get(script.type);
  
  try {
    return await executor.execute(script, executionOptions);
  } catch (error) {
    if (error instanceof Error) {
      throw new CodeExecutionError(
        `Script execution failed: ${error.message}`,
        scriptName,
        script.type,
        { options: executionOptions },
        error
      );
    }
    throw error;
  }
}
```

**改进后实现**：
```typescript
async execute(
  scriptName: string,
  options?: Partial<ScriptExecutionOptions>,
  threadContext?: ThreadContext
): Promise<Result<ScriptExecutionResult, CodeExecutionError>> {
  const script = this.getScript(scriptName);
  const executor = this.executorRegistry.get(script.type);
  
  if (!executor) {
    return err(new CodeExecutionError(
      `No executor found for script type '${script.type}'`,
      scriptName,
      script.type,
      { options }
    ));
  }
  
  const result = await tryCatchAsync(
    executor.execute(script, executionOptions)
  );
  
  if (result.isErr()) {
    return err(this.convertToCodeExecutionError(
      result.error,
      scriptName,
      script.type,
      executionOptions
    ));
  }
  
  return ok(result.value);
}

private convertToCodeExecutionError(
  error: unknown,
  scriptName: string,
  scriptType: string,
  options: ScriptExecutionOptions
): CodeExecutionError {
  if (error instanceof CodeExecutionError) {
    return error;
  }
  
  const message = error instanceof Error ? error.message : String(error);
  
  return new CodeExecutionError(
    `Script execution failed: ${message}`,
    scriptName,
    scriptType,
    { options },
    error instanceof Error ? error : undefined
  );
}
```

### 3.4 修改上层调用代码

**当前实现**（`sdk/core/execution/executors/llm-executor.ts:109-178`）：
```typescript
try {
  if (llmRequest.stream) {
    const messageStream = await this.llmWrapper.generateStream(llmRequest);
    // ... 处理流
  } else {
    finalResult = await this.llmWrapper.generate(llmRequest);
  }
} catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
    // 处理 AbortError
    throw new ThreadInterruptedException(...);
  }
  
  throw new ExecutionError(
    `LLM call failed: ${error instanceof Error ? error.message : String(error)}`,
    undefined,
    undefined,
    { originalError: error, profileId: requestData.profileId },
    error instanceof Error ? error : undefined
  );
}
```

**改进后实现**：
```typescript
let result: Result<LLMResult, LLMError>;

if (llmRequest.stream) {
  result = await this.llmWrapper.generateStream(llmRequest);
} else {
  result = await this.llmWrapper.generate(llmRequest);
}

if (result.isErr()) {
  const error = result.error;
  
  // 检查是否是 AbortError
  if (error.cause?.name === 'AbortError') {
    throw new ThreadInterruptedException(
      'LLM call aborted',
      'STOP',
      options?.threadId || '',
      options?.nodeId || ''
    );
  }
  
  // 转换为 ExecutionError
  throw new ExecutionError(
    `LLM call failed: ${error.message}`,
    undefined,
    undefined,
    { originalError: error, profileId: requestData.profileId },
    error
  );
}

finalResult = result.value;
```

## 4. 优势分析

### 4.1 代码简洁性

**改进前**：
```typescript
try {
  const result = await service.execute();
  // 处理结果
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const sdkError = error instanceof Error ? error : new Error(String(error));
  // 处理错误
}
```

**改进后**：
```typescript
const result = await service.execute();

if (result.isErr()) {
  // result.error 已经是 SDKError 类型
  console.error(result.error.message);
  return;
}

// 处理 result.value
```

### 4.2 类型安全

- **改进前**：`error` 类型是 `unknown`，需要运行时类型检查
- **改进后**：`result.error` 类型是明确的 `SDKError`，编译时类型检查

### 4.3 性能提升

- **改进前**：每次错误处理都需要 `instanceof` 检查和类型转换
- **改进后**：直接使用类型化的错误对象，无需运行时检查

### 4.4 可维护性

- **改进前**：错误处理逻辑分散在89个地方
- **改进后**：错误转换逻辑集中在服务层，调用方只需处理 Result

## 5. 实施计划

### 5.1 阶段一：修改核心服务（3-5天）

1. **修改 LLMWrapper**
   - [ ] 修改 `generate()` 返回类型为 `Result<LLMResult, LLMError>`
   - [ ] 修改 `generateStream()` 返回类型为 `Result<MessageStream, LLMError>`
   - [ ] 实现 `convertToLLMError()` 方法
   - [ ] 编写单元测试

2. **修改 ToolService**
   - [ ] 修改 `execute()` 返回类型为 `Result<ToolExecutionResult, ToolError>`
   - [ ] 修改 `executeBatch()` 返回类型为 `Result<ToolExecutionResult[], ToolError>`
   - [ ] 实现 `convertToToolError()` 方法
   - [ ] 编写单元测试

3. **修改 CodeService**
   - [ ] 修改 `execute()` 返回类型为 `Result<ScriptExecutionResult, CodeExecutionError>`
   - [ ] 修改 `executeBatch()` 返回类型为 `Result<ScriptExecutionResult[], CodeExecutionError>`
   - [ ] 实现 `convertToCodeExecutionError()` 方法
   - [ ] 编写单元测试

### 5.2 阶段二：修改上层调用（5-7天）

1. **修改 LLMExecutor**
   - [ ] 更新 `executeLLMCall()` 方法
   - [ ] 移除 try-catch，改为处理 Result
   - [ ] 编写集成测试

2. **修改 ToolCallExecutor**
   - [ ] 更新 `executeToolCalls()` 方法
   - [ ] 更新 `executeSingleToolCall()` 方法
   - [ ] 移除 try-catch，改为处理 Result
   - [ ] 编写集成测试

3. **修改其他调用方**
   - [ ] 更新所有调用这些服务的地方
   - [ ] 移除不必要的 try-catch
   - [ ] 编写集成测试

### 5.3 阶段三：清理和优化（2-3天）

1. **清理代码**
   - [ ] 移除不再使用的错误处理代码
   - [ ] 移除重复的类型检查
   - [ ] 优化错误消息

2. **更新文档**
   - [ ] 更新 API 文档
   - [ ] 添加使用示例
   - [ ] 更新迁移指南

3. **性能测试**
   - [ ] 运行性能基准测试
   - [ ] 对比改进前后的性能
   - [ ] 优化热点代码

## 6. 风险和缓解措施

### 6.1 风险

1. **破坏性变更**：修改返回类型会影响所有调用方
2. **迁移成本**：需要更新大量代码
3. **测试覆盖**：需要充分的测试覆盖

### 6.2 缓解措施

1. **渐进式迁移**：
   - 先修改核心服务，保持向后兼容
   - 提供迁移工具和指南
   - 分阶段更新调用方

2. **充分测试**：
   - 单元测试覆盖所有服务
   - 集成测试覆盖所有调用场景
   - 回归测试确保功能正常

3. **文档支持**：
   - 详细的迁移指南
   - 代码示例和最佳实践
   - FAQ 和故障排除

## 7. 总结

### 7.1 核心改进

1. **简化架构**：从复杂的中间件/转换器改为简单的 Result 类型
2. **类型安全**：明确的错误类型，无需运行时检查
3. **性能提升**：减少不必要的类型检查和转换
4. **易于维护**：错误处理逻辑集中在服务层

### 7.2 对比

| 特性 | 中间件/转换器方案 | Result 类型方案（推荐） |
|------|------------------|----------------------|
| 复杂度 | 高 | 低 |
| 性能 | 中等 | 高 |
| 类型安全 | 中等 | 高 |
| 可维护性 | 中等 | 高 |
| 学习曲线 | 陡峭 | 平缓 |
| 实施成本 | 高 | 中等 |

### 7.3 推荐方案

**强烈推荐使用 Result 类型方案**，原因：

1. **更简单**：利用已有的 Result 类型基础设施
2. **更高效**：直接返回类型化的结果，无需中间层
3. **更安全**：完整的类型检查，编译时捕获错误
4. **更易维护**：清晰的代码结构，易于理解和扩展

这个方案充分利用了 SDK 已有的 Result 类型系统，避免了过度设计，是一个务实且高效的解决方案。
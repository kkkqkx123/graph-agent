# 脚本执行器迁移指南

本文档帮助您从旧的 `ScriptExecutor` 接口迁移到新的 `IScriptExecutor` 接口。

## 概述

重构后的脚本执行器模块提供了以下改进：

1. **独立的包**: `@modular-agent/script-executors` 现在是一个独立的包
2. **统一的架构**: 与 `tool-executors` 保持一致的架构设计
3. **内置执行器**: 提供开箱即用的脚本执行器实现
4. **简化的 CodeService**: 职责更加单一，专注于脚本管理和执行器协调

## 迁移步骤

### 1. 更新依赖

在 `sdk/package.json` 中添加新的依赖：

```json
{
  "dependencies": {
    "@modular-agent/script-executors": "workspace:*"
  }
}
```

### 2. 更新导入

**旧代码**:

```typescript
import type { ScriptExecutor } from '@modular-agent/types';
```

**新代码**:

```typescript
import type { IScriptExecutor } from '@modular-agent/script-executors';
```

### 3. 更新 CodeService

**旧代码**:

```typescript
class CodeService {
  private executors: Map<ScriptType, ScriptExecutor> = new Map();

  registerExecutor(type: ScriptType, executor: ScriptExecutor): void {
    this.executors.set(type, executor);
  }

  getExecutor(type: ScriptType): ScriptExecutor | undefined {
    return this.executors.get(type);
  }
}
```

**新代码**:

```typescript
import type { IScriptExecutor } from '@modular-agent/script-executors';

class CodeService {
  private executors: Map<ScriptType, IScriptExecutor> = new Map();

  registerExecutor(type: ScriptType, executor: IScriptExecutor): void {
    this.executors.set(type, executor);
  }

  getExecutor(type: ScriptType): IScriptExecutor | undefined {
    return this.executors.get(type);
  }
}
```

### 4. 使用内置执行器

**旧代码**（需要自己实现执行器）:

```typescript
class MyShellExecutor implements ScriptExecutor {
  async execute(script: Script, options?: Partial<ScriptExecutionOptions>): Promise<ScriptExecutionResult> {
    // 自己实现执行逻辑
    // 包括验证、重试、超时等
  }

  validate(script: Script): { valid: boolean; errors: string[] } {
    // 自己实现验证逻辑
  }

  getSupportedTypes(): ScriptType[] {
    return ['SHELL'];
  }
}

const codeService = new CodeService();
codeService.registerExecutor('SHELL', new MyShellExecutor());
```

**新代码**（使用内置执行器）:

```typescript
import { ShellExecutor, PythonExecutor, JavaScriptExecutor } from '@modular-agent/script-executors';

const codeService = new CodeService();
codeService.registerExecutor('SHELL', new ShellExecutor());
codeService.registerExecutor('PYTHON', new PythonExecutor());
codeService.registerExecutor('JAVASCRIPT', new JavaScriptExecutor());
```

### 5. 自定义执行器配置

如果您需要自定义执行器行为，可以通过配置参数：

```typescript
import { ShellExecutor } from '@modular-agent/script-executors';

const shellExecutor = new ShellExecutor({
  type: 'SHELL',
  maxRetries: 5,
  retryDelay: 2000,
  exponentialBackoff: true,
  timeout: 10000,
  resourceLimits: {
    memory: 256,
    cpu: 2
  }
});

codeService.registerExecutor('SHELL', shellExecutor);
```

### 6. 实现自定义执行器

如果您需要实现自定义执行器，可以继承 `BaseScriptExecutor`：

```typescript
import { BaseScriptExecutor } from '@modular-agent/script-executors';
import type { Script } from '@modular-agent/types';
import type { ExecutionContext, ExecutionOutput } from '@modular-agent/script-executors';

class MyCustomExecutor extends BaseScriptExecutor {
  constructor() {
    super({ type: 'CUSTOM' });
  }

  protected async doExecute(
    script: Script,
    context?: ExecutionContext
  ): Promise<ExecutionOutput> {
    // 实现具体的执行逻辑
    // 基类已经处理了验证、重试、超时等
    return {
      stdout: 'output',
      stderr: '',
      exitCode: 0
    };
  }

  getSupportedTypes(): ScriptType[] {
    return ['CUSTOM'];
  }

  getExecutorType(): string {
    return 'CUSTOM';
  }
}
```

## 接口变更

### ScriptExecutor vs IScriptExecutor

**旧接口** (`ScriptExecutor`):

```typescript
interface ScriptExecutor {
  execute(script: Script, options?: Partial<ScriptExecutionOptions>): Promise<ScriptExecutionResult>;
  validate(script: Script): { valid: boolean; errors: string[] };
  getSupportedTypes(): ScriptType[];
}
```

**新接口** (`IScriptExecutor`):

```typescript
interface IScriptExecutor {
  execute(
    script: Script,
    options?: ScriptExecutionOptions,
    context?: ExecutionContext
  ): Promise<ScriptExecutionResult>;

  validate(script: Script): ValidationResult;

  getSupportedTypes(): ScriptType[];

  cleanup?(): Promise<void>;

  getExecutorType(): string;
}
```

### 主要变更

1. **execute 方法**:
   - 新增 `context` 参数，用于传递执行上下文（线程隔离等）
   - `options` 参数类型从 `Partial<ScriptExecutionOptions>` 改为 `ScriptExecutionOptions`

2. **validate 方法**:
   - 返回类型从 `{ valid: boolean; errors: string[] }` 改为 `ValidationResult`

3. **新增方法**:
   - `cleanup?()`: 可选的资源清理方法
   - `getExecutorType()`: 返回执行器类型字符串

## 向后兼容性

### CodeService API 保持不变

`CodeService` 的公共 API 保持不变，现有代码无需修改：

```typescript
// 这些 API 保持不变
codeService.registerScript(script);
codeService.execute(scriptName, options);
codeService.executeBatch(executions);
```

### 执行器注册方式保持不变

```typescript
// 注册方式保持不变
codeService.registerExecutor('SHELL', executor);
```

## 测试迁移

### 更新测试导入

```typescript
// 旧代码
import type { ScriptExecutor } from '@modular-agent/types';

// 新代码
import type { IScriptExecutor } from '@modular-agent/script-executors';
```

### 使用内置执行器进行测试

```typescript
import { ShellExecutor } from '@modular-agent/script-executors';

describe('CodeService', () => {
  it('should execute shell script', async () => {
    const codeService = new CodeService();
    codeService.registerExecutor('SHELL', new ShellExecutor());

    codeService.registerScript({
      id: 'test',
      name: 'test',
      type: 'SHELL',
      description: 'Test',
      content: 'echo "test"',
      options: { timeout: 5000 }
    });

    const result = await codeService.execute('test');
    expect(result.isOk()).toBe(true);
  });
});
```

## 常见问题

### Q: 我的自定义执行器如何迁移？

A: 如果您的自定义执行器实现了 `ScriptExecutor` 接口，您需要：

1. 更新导入：`import type { IScriptExecutor } from '@modular-agent/script-executors'`
2. 实现 `getExecutorType()` 方法
3. 可选：实现 `cleanup()` 方法
4. 考虑继承 `BaseScriptExecutor` 以获得内置功能

### Q: 执行选项的类型变更会影响我吗？

A: 不会。`CodeService.execute()` 方法仍然接受 `Partial<ScriptExecutionOptions>`，并在内部合并选项。

### Q: 如何使用沙箱功能？

A: 在执行选项中启用沙箱：

```typescript
const result = await codeService.execute('script', {
  sandbox: true,
  sandboxConfig: {
    type: 'docker',
    image: 'node:18'
  }
});
```

### Q: 性能会有影响吗？

A: 新架构通过模板方法模式和组件复用，性能应该与之前相当或更好。建议进行性能测试以验证。

## 需要帮助？

如果您在迁移过程中遇到问题，请：

1. 查看本文档的常见问题部分
2. 查看 `packages/script-executors/README.md` 获取详细的使用说明
3. 查看测试文件了解使用示例
4. 提交 issue 寻求帮助
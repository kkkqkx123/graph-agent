# @modular-agent/script-executors

脚本执行器包，提供统一的脚本执行接口和多种脚本类型的执行器实现。

## 功能特性

- **统一的执行器接口**: `IScriptExecutor` 接口定义了所有执行器必须实现的契约
- **抽象基类**: `BaseScriptExecutor` 提供通用的执行逻辑（验证、重试、超时、沙箱）
- **内置执行器**: 提供开箱即用的脚本执行器实现
  - `ShellExecutor`: Shell 脚本执行器
  - `PythonExecutor`: Python 脚本执行器
  - `JavaScriptExecutor`: JavaScript 脚本执行器
  - `PowerShellExecutor`: PowerShell 脚本执行器
  - `CmdExecutor`: Windows CMD 批处理执行器
- **通用组件**:
  - `ParameterValidator`: 参数验证器
  - `RetryStrategy`: 重试策略
  - `TimeoutController`: 超时控制器
  - `SandboxManager`: 沙箱管理器

## 命名说明

本包使用 "Script" 而非 "Code" 来命名相关概念，因为：
- **更准确**: 实际执行的是脚本，而不是通用的"代码"
- **一致性**: 与 SDK 中的 `ScriptService`、`ScriptNode` 等命名保持一致
- **清晰性**: 避免使用模糊的 "Code" 词汇

相关命名映射：
- `ScriptService` - 脚本服务（原 `CodeService`）
- `ScriptExecutionError` - 脚本执行错误（原 `CodeExecutionError`）
- `ScriptHandler` - 脚本处理器（原 `CodeHandler`）
- `SCRIPT_NODE` - 脚本节点（原 `CODE_NODE`）
- `ScriptNodeConfig` - 脚本节点配置（原 `CodeNodeConfig`）

## 安装

```bash
pnpm add @modular-agent/script-executors
```

## 使用示例

### 基本使用

```typescript
import { ShellExecutor, PythonExecutor, JavaScriptExecutor } from '@modular-agent/script-executors';
import type { Script } from '@modular-agent/types';

// 创建 Shell 执行器
const shellExecutor = new ShellExecutor();

// 定义脚本
const script: Script = {
  id: 'test-script',
  name: 'test-script',
  type: 'SHELL',
  description: 'Test script',
  content: 'echo "Hello, World!"',
  options: {
    timeout: 5000,
    retries: 3,
    retryDelay: 1000
  }
};

// 执行脚本
const result = await shellExecutor.execute(script);

if (result.success) {
  console.log('Output:', result.stdout);
} else {
  console.error('Error:', result.error);
}
```

### 使用 Python 执行器

```typescript
import { PythonExecutor } from '@modular-agent/script-executors';

const pythonExecutor = new PythonExecutor();

const pythonScript: Script = {
  id: 'python-script',
  name: 'python-script',
  type: 'PYTHON',
  description: 'Python script',
  content: 'print("Hello from Python!")',
  options: {
    timeout: 5000
  }
};

const result = await pythonExecutor.execute(pythonScript);
```

### 使用 JavaScript 执行器

```typescript
import { JavaScriptExecutor } from '@modular-agent/script-executors';

const jsExecutor = new JavaScriptExecutor();

const jsScript: Script = {
  id: 'js-script',
  name: 'js-script',
  type: 'JAVASCRIPT',
  description: 'JavaScript script',
  content: 'console.log("Hello from JavaScript!");',
  options: {
    timeout: 5000
  }
};

const result = await jsExecutor.execute(jsScript);
```

### 自定义执行器配置

```typescript
import { ShellExecutor } from '@modular-agent/script-executors';

const executor = new ShellExecutor({
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
```

### 验证脚本

```typescript
const validationResult = executor.validate(script);

if (!validationResult.valid) {
  console.error('Validation errors:', validationResult.errors);
}
```

### 获取支持的脚本类型

```typescript
const supportedTypes = executor.getSupportedTypes();
console.log('Supported types:', supportedTypes);
```

## 架构设计

### 核心接口

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

### 抽象基类

`BaseScriptExecutor` 提供了以下功能：

- **参数验证**: 使用 `ParameterValidator` 验证脚本配置
- **重试机制**: 使用 `RetryStrategy` 管理重试逻辑
- **超时控制**: 使用 `TimeoutController` 控制执行超时
- **沙箱支持**: 使用 `SandboxManager` 管理沙箱环境
- **结果标准化**: 统一的执行结果格式

### 执行流程

1. 验证脚本配置
2. 准备沙箱环境（如果启用）
3. 执行脚本（带重试和超时）
4. 标准化结果
5. 清理资源

## 与 ScriptService 集成

```typescript
import { ScriptService } from '@modular-agent/sdk';
import { ShellExecutor, PythonExecutor, JavaScriptExecutor } from '@modular-agent/script-executors';

const scriptService = new ScriptService();

// 注册执行器
scriptService.registerExecutor('SHELL', new ShellExecutor());
scriptService.registerExecutor('PYTHON', new PythonExecutor());
scriptService.registerExecutor('JAVASCRIPT', new JavaScriptExecutor());

// 注册脚本
scriptService.registerScript({
  id: 'my-script',
  name: 'my-script',
  type: 'SHELL',
  description: 'My script',
  content: 'echo "Hello!"',
  options: {
    timeout: 5000
  }
});

// 执行脚本
const result = await scriptService.execute('my-script');
```

## 测试

```bash
# 运行测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 监听模式
pnpm test:watch
```

## 开发

```bash
# 类型检查
pnpm typecheck

# 构建
pnpm build
```

## 许可证

MIT
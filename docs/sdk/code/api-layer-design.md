# 脚本模块API层设计

本文档介绍脚本模块的API层设计，说明如何通过API层方便应用层实现相关逻辑并集成到SDK核心模块中。

## API层架构

脚本模块的API层遵循SDK的统一架构模式，提供以下组件：

### 1. 类型定义层 (`sdk/api/types/code-types.ts`)

定义了API层专用的类型和接口：

- `ScriptFilter`: 脚本过滤条件
- `ScriptOptions`: 脚本执行选项
- `ScriptTestResult`: 脚本测试结果
- `ScriptExecutionLog`: 脚本执行日志
- `ScriptStatistics`: 脚本统计信息
- `ScriptRegistrationConfig`: 脚本注册配置
- `ScriptBatchExecutionConfig`: 脚本批量执行配置

### 2. API服务层 (`sdk/api/code/code-service-api.ts`)

提供高级的脚本管理功能：

- `CodeServiceAPI`: 主API类，封装底层脚本服务
- 支持脚本的注册、查询、执行、测试等操作
- 提供执行日志、统计信息等高级功能

### 3. SDK集成 (`sdk/api/core/sdk.ts`)

将脚本API集成到主SDK中：

```typescript
// 在主SDK中提供脚本API访问
const sdk = new SDK();
sdk.scripts.registerScript(script);
const result = await sdk.scripts.executeScript('hello-world');
```

## API设计原则

### 1. 简化接口

API层隐藏了底层实现的复杂性，提供简洁易用的接口：

```typescript
// 底层服务接口（复杂）
const result = await codeService.execute(scriptName, executionOptions, threadContext);

// API层接口（简化）
const result = await codeServiceAPI.executeScript(scriptName, options);
```

### 2. 增强功能

API层在底层服务基础上增加了额外功能：

- **执行日志**: 自动记录所有脚本执行历史
- **统计信息**: 提供执行次数、成功率等统计
- **批量操作**: 支持并行批量执行
- **测试功能**: 专门的脚本测试接口

### 3. 错误处理

API层提供统一的错误处理机制：

```typescript
// 底层服务抛出异常
try {
  await codeService.execute('nonexistent-script');
} catch (error) {
  if (error instanceof NotFoundError) {
    // 处理未找到错误
  }
}

// API层返回结构化结果
const result = await codeServiceAPI.executeScript('nonexistent-script');
if (!result.success) {
  // 处理失败结果
}
```

## 应用层集成指南

### 1. 脚本执行器实现

应用层可以直接使用内置的脚本执行器，或基于 `BaseScriptExecutor` 实现自定义执行器：

**使用内置执行器（推荐）**:

```typescript
import { ShellExecutor, PythonExecutor, JavaScriptExecutor } from '@modular-agent/script-executors';
import { codeService } from 'sdk/core/services/code-service';

// 注册内置执行器
codeService.registerExecutor('SHELL', new ShellExecutor());
codeService.registerExecutor('PYTHON', new PythonExecutor());
codeService.registerExecutor('JAVASCRIPT', new JavaScriptExecutor());
```

**自定义执行器（可选）**:

```typescript
import { BaseScriptExecutor } from '@modular-agent/script-executors';
import type { Script } from '@modular-agent/types';
import type { ExecutionContext, ExecutionOutput } from '@modular-agent/script-executors';

class CustomScriptExecutor extends BaseScriptExecutor {
  constructor() {
    super({ type: 'CUSTOM' });
  }

  protected async doExecute(
    script: Script,
    context?: ExecutionContext
  ): Promise<ExecutionOutput> {
    // 实现自定义执行逻辑
    // 基类已处理验证、重试、超时等
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

### 2. 注册执行器

应用层在启动时注册脚本执行器：

```typescript
import { codeService } from 'sdk/core/services/code-service';
import { ShellExecutor, PythonExecutor, PowerShellExecutor, JavaScriptExecutor, CmdExecutor } from '@modular-agent/script-executors';

// 注册内置执行器
codeService.registerExecutor('SHELL', new ShellExecutor());
codeService.registerExecutor('PYTHON', new PythonExecutor());
codeService.registerExecutor('POWERSHELL', new PowerShellExecutor());
codeService.registerExecutor('JAVASCRIPT', new JavaScriptExecutor());
codeService.registerExecutor('CMD', new CmdExecutor());

// 或注册自定义执行器
codeService.registerExecutor('CUSTOM', new CustomScriptExecutor());
```

### 3. 配置脚本

应用层通过配置文件或代码注册脚本：

```typescript
// 从配置文件加载
const scriptConfigs = loadScriptConfigs('configs/scripts/');
for (const config of scriptConfigs) {
  await sdk.scripts.registerScript(config);
}

// 或通过代码创建
const script: Script = {
  id: generateId(),
  name: 'custom-processor',
  type: ScriptType.PYTHON,
  description: 'Custom data processor',
  content: pythonCode,
  options: {
    timeout: 60000,
    retries: 3,
    sandbox: true
  }
};
await sdk.scripts.registerScript(script);
```

### 4. 使用脚本

在应用代码中使用脚本：

```typescript
// 执行单个脚本
const result = await sdk.scripts.executeScript('data-processor', {
  environment: { INPUT_DATA: JSON.stringify(data) }
});

if (result.success) {
  console.log('脚本执行成功:', result.stdout);
} else {
  console.error('脚本执行失败:', result.stderr);
}

// 批量执行脚本
const batchResults = await sdk.scripts.executeScriptsBatch([
  { scriptName: 'script1', options: { timeout: 30000 } },
  { scriptName: 'script2', options: { timeout: 60000 } }
], {
  parallel: true,
  maxConcurrency: 3
});

// 测试脚本
const testResult = await sdk.scripts.testScript('data-processor');
if (testResult.passed) {
  console.log('脚本测试通过');
} else {
  console.error('脚本测试失败:', testResult.error);
}
```

## 高级功能

### 1. 执行监控

API层提供执行监控功能：

```typescript
// 获取执行日志
const logs = await sdk.scripts.getExecutionLog('data-processor', 10);
logs.forEach(log => {
  console.log(`${log.timestamp}: ${log.scriptName} - ${log.result.success ? '成功' : '失败'}`);
});

// 获取统计信息
const stats = await sdk.scripts.getStatistics();
console.log(`总执行次数: ${stats.executionCount}`);
console.log(`成功率: ${(stats.successCount / stats.executionCount * 100).toFixed(2)}%`);
```

### 2. 动态配置

支持动态更新脚本配置：

```typescript
// 更新脚本配置
await sdk.scripts.updateScript('data-processor', {
  options: {
    timeout: 120000, // 延长超时时间
    retries: 5       // 增加重试次数
  }
});

// 重新验证脚本
const validation = await sdk.scripts.validateScript('data-processor');
if (validation.valid) {
  console.log('脚本配置更新成功');
}
```

### 3. 错误恢复

提供错误恢复机制：

```typescript
// 批量执行时继续执行失败的任务
const results = await sdk.scripts.executeScriptsBatch(scripts, {
  continueOnFailure: true,
  parallel: true
});

const failedScripts = results.filter(r => !r.success);
if (failedScripts.length > 0) {
  console.warn(`${failedScripts.length} 个脚本执行失败`);
  // 可以重试失败的脚本或记录错误
}
```

## 最佳实践

### 1. 执行器设计

- **单一职责**: 每个执行器只负责一种脚本类型
- **错误处理**: 提供详细的错误信息和恢复机制
- **资源管理**: 合理管理执行过程中的资源（进程、文件等）
- **性能优化**: 支持并发执行和资源复用

### 2. 脚本配置

- **安全配置**: 根据风险等级配置适当的沙箱设置
- **资源限制**: 设置合理的超时时间和资源限制
- **环境隔离**: 使用环境变量和沙箱实现环境隔离
- **版本管理**: 为脚本配置版本号和变更历史

### 3. 监控和日志

- **执行日志**: 记录详细的执行历史和结果
- **性能监控**: 监控执行时间和资源使用情况
- **错误追踪**: 提供完整的错误链和上下文信息
- **统计报告**: 定期生成执行统计报告

## 总结

脚本模块的API层设计提供了：

1. **简化接口**: 隐藏底层复杂性，提供易用的高级接口
2. **增强功能**: 在基础服务上增加日志、统计、批量操作等高级功能
3. **灵活扩展**: 支持应用层实现各种脚本执行器
4. **统一管理**: 通过主SDK提供统一的脚本管理接口
5. **监控运维**: 提供完整的执行监控和错误追踪能力

通过这种设计，应用层可以方便地实现各种脚本执行逻辑，并通过标准化的API集成到SDK核心模块中。
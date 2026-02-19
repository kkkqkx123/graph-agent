/**
 * 脚本执行器包统一导出
 */

// 核心接口和类型
export { IScriptExecutor } from './core/interfaces/IScriptExecutor.js';
export type { ExecutorType, ExecutorConfig, ExecutionContext, ExecutionOutput, ValidationResult, ExecutorMetadata } from './core/types.js';

// 基类和组件
export { BaseScriptExecutor } from './core/base/BaseScriptExecutor.js';
export { CommandLineExecutor } from './core/base/CommandLineExecutor.js';
export { RetryStrategy } from './core/base/RetryStrategy.js';
export { TimeoutController } from './core/base/TimeoutController.js';
export type { CommandLineConfig } from './core/base/CommandLineExecutor.js';

// 具体执行器
export { ShellExecutor } from './shell/ShellExecutor.js';
export { PythonExecutor } from './python/PythonExecutor.js';
export { JavaScriptExecutor } from './javascript/JavaScriptExecutor.js';
export { PowerShellExecutor } from './powershell/PowerShellExecutor.js';
export { CmdExecutor } from './cmd/CmdExecutor.js';
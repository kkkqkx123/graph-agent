/**
 * 脚本执行器包统一导出
 */

import { createPackageLogger } from '@modular-agent/common-utils';

/**
 * 包级别日志器
 * 用于记录脚本执行器包的日志信息
 */
export const logger = createPackageLogger('script-executors', {
  level: (process.env['SCRIPT_EXECUTORS_LOG_LEVEL'] as any) || 'info',
  json: process.env['NODE_ENV'] === 'production'
});

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
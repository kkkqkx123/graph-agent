/**
 * JavaScript 执行器
 * 使用 Node.js vm 模块执行 JavaScript 脚本
 */

import { Script, createContext, runInContext } from 'vm';
import { BaseScriptExecutor } from '../core/base/BaseScriptExecutor.js';
import type { Script as ScriptDefinition } from '@modular-agent/types';
import type { ExecutionContext, ExecutionOutput, ExecutorConfig } from '../core/types.js';
import type { ScriptType } from '@modular-agent/types';

/**
 * JavaScript 执行器
 */
export class JavaScriptExecutor extends BaseScriptExecutor {
  private memoryLimit: number;
  private executionTimeLimit: number;

  constructor(config?: ExecutorConfig) {
    super({
      ...config,
      type: 'JAVASCRIPT'
    });
    this.memoryLimit = config?.resourceLimits?.memory ?? 128; // MB
    this.executionTimeLimit = config?.timeout ?? 30000; // ms
  }

  /**
   * 执行脚本的具体实现
   * @param script 脚本定义
   * @param context 执行上下文
   * @returns 执行输出
   */
  protected async doExecute(
    script: ScriptDefinition,
    context?: ExecutionContext
  ): Promise<ExecutionOutput> {
    return new Promise((resolve, reject) => {
      // 获取脚本内容
      const scriptContent = script.content || '';
      if (!scriptContent) {
        reject(new Error('Script content is empty'));
        return;
      }

      // 准备环境变量
      const env = {
        ...process.env,
        ...script.options.environment,
        ...context?.environment
      };

      // 创建隔离的上下文
      const vmContext = createContext({
        console: {
          log: (...args: any[]) => {
            // 捕获 console.log 输出
            process.stdout.write(args.map(arg => String(arg)).join(' ') + '\n');
          },
          error: (...args: any[]) => {
            // 捕获 console.error 输出
            process.stderr.write(args.map(arg => String(arg)).join(' ') + '\n');
          }
        },
        process: {
          env,
          cwd: () => context?.workingDirectory || script.options.workingDirectory || process.cwd()
        },
        require: (module: string) => {
          // 限制模块导入，只允许特定模块
          const allowedModules = ['path', 'fs', 'util', 'crypto'];
          if (!allowedModules.includes(module)) {
            throw new Error(`Module '${module}' is not allowed`);
          }
          return require(module);
        }
      });

      let stdout = '';
      let stderr = '';
      let exitCode = 0;

      // 捕获标准输出
      const originalStdoutWrite = process.stdout.write;
      process.stdout.write = ((chunk: string) => {
        stdout += chunk;
        return true;
      }) as any;

      // 捕获标准错误
      const originalStderrWrite = process.stderr.write;
      process.stderr.write = ((chunk: string) => {
        stderr += chunk;
        return true;
      }) as any;

      // 设置超时
      const timeoutId = setTimeout(() => {
        exitCode = 1;
        stderr += 'Execution timeout';
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;
        resolve({
          stdout,
          stderr,
          exitCode
        });
      }, this.executionTimeLimit);

      try {
        // 执行脚本
        const vmScript = new Script(scriptContent);
        vmScript.runInContext(vmContext, {
          timeout: this.executionTimeLimit,
          displayErrors: true
        });

        // 清除超时
        clearTimeout(timeoutId);

        // 恢复原始输出
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;

        resolve({
          stdout,
          stderr,
          exitCode
        });
      } catch (error) {
        // 清除超时
        clearTimeout(timeoutId);

        // 恢复原始输出
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;

        stderr += error instanceof Error ? error.message : String(error);
        exitCode = 1;

        resolve({
          stdout,
          stderr,
          exitCode
        });
      }

      // 处理中止信号
      if (context?.signal) {
        const abortHandler = () => {
          clearTimeout(timeoutId);
          process.stdout.write = originalStdoutWrite;
          process.stderr.write = originalStderrWrite;
          stderr += 'Execution aborted';
          exitCode = 1;
          resolve({
            stdout,
            stderr,
            exitCode
          });
        };
        context.signal.addEventListener('abort', abortHandler, { once: true });
      }
    });
  }

  /**
   * 获取支持的脚本类型
   * @returns 支持的脚本类型数组
   */
  getSupportedTypes(): ScriptType[] {
    return ['JAVASCRIPT'];
  }

  /**
   * 获取执行器类型
   * @returns 执行器类型字符串
   */
  getExecutorType(): string {
    return 'JAVASCRIPT';
  }
}
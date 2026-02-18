/**
 * CMD 执行器
 * 使用 Windows cmd.exe 执行批处理脚本
 */

import { spawn } from 'child_process';
import { BaseScriptExecutor } from '../core/base/BaseScriptExecutor.js';
import type { Script } from '@modular-agent/types';
import type { ExecutionContext, ExecutionOutput, ExecutorConfig } from '../core/types.js';
import type { ScriptType } from '@modular-agent/types';

/**
 * CMD 执行器
 */
export class CmdExecutor extends BaseScriptExecutor {
  constructor(config?: ExecutorConfig) {
    super({
      ...config,
      type: 'CMD'
    });
  }

  /**
   * 执行脚本的具体实现
   * @param script 脚本定义
   * @param context 执行上下文
   * @returns 执行输出
   */
  protected async doExecute(
    script: Script,
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

      // 准备工作目录
      const cwd = context?.workingDirectory || script.options.workingDirectory || process.cwd();

      // 执行 CMD 脚本
      const child = spawn('cmd.exe', ['/c', scriptContent], {
        env,
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        windowsHide: true
      });

      let stdout = '';
      let stderr = '';

      // 收集标准输出
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      // 收集标准错误
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // 处理进程退出
      child.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 1
        });
      });

      // 处理错误
      child.on('error', (error) => {
        reject(error);
      });

      // 处理中止信号
      if (context?.signal) {
        const abortHandler = () => {
          child.kill('SIGTERM');
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
    return ['CMD'];
  }

  /**
   * 获取执行器类型
   * @returns 执行器类型字符串
   */
  getExecutorType(): string {
    return 'CMD';
  }
}
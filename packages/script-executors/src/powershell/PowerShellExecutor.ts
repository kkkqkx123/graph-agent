/**
 * PowerShell 执行器
 * 调用 PowerShell 进程执行 PowerShell 脚本
 */

import { CommandLineExecutor } from '../core/base/CommandLineExecutor.js';
import type { Script } from '@modular-agent/types';
import type { ExecutorConfig } from '../core/types.js';

/**
 * PowerShell 执行器
 */
export class PowerShellExecutor extends CommandLineExecutor<'POWERSHELL'> {
  private powerShellCommand: string;

  constructor(config?: Omit<ExecutorConfig, 'type'> & { type: 'POWERSHELL' }) {
    super({
      ...config,
      type: 'POWERSHELL'
    });
    // 默认使用 pwsh (PowerShell Core)，如果不存在则使用 powershell (Windows PowerShell)
    this.powerShellCommand = 'pwsh';
  }

  /**
   * 设置 PowerShell 命令
   * @param command PowerShell 命令（如 'pwsh', 'powershell', '/usr/bin/pwsh'）
   */
  setPowerShellCommand(command: string): void {
    this.powerShellCommand = command;
  }

  /**
   * 获取命令行配置
   * @param script 脚本定义
   * @returns 命令行配置
   */
  protected getCommandLineConfig(script: Script) {
    return {
      command: this.powerShellCommand,
      args: ['-Command', script.content || ''],
      shell: true
    };
  }
}
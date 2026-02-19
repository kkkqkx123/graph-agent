/**
 * Python 执行器
 * 调用系统 Python 解释器执行 Python 脚本
 */

import { CommandLineExecutor } from '../core/base/CommandLineExecutor.js';
import type { Script } from '@modular-agent/types';
import type { ExecutorConfig } from '../core/types.js';

/**
 * Python 执行器
 */
export class PythonExecutor extends CommandLineExecutor<'PYTHON'> {
  private pythonCommand: string;

  constructor(config?: Omit<ExecutorConfig, 'type'> & { type: 'PYTHON' }) {
    super({
      ...config,
      type: 'PYTHON'
    });
    // 默认使用 python3，如果不存在则使用 python
    this.pythonCommand = 'python3';
  }

  /**
   * 设置 Python 命令
   * @param command Python 命令（如 'python3', 'python', '/usr/bin/python3'）
   */
  setPythonCommand(command: string): void {
    this.pythonCommand = command;
  }

  /**
   * 获取命令行配置
   * @param script 脚本定义
   * @returns 命令行配置
   */
  protected getCommandLineConfig(script: Script) {
    return {
      command: this.pythonCommand,
      args: ['-c', script.content || ''],
      shell: false
    };
  }
}
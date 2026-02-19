/**
 * Shell 执行器
 * 使用 Node.js child_process 执行 shell 脚本
 */

import { CommandLineExecutor } from '../core/base/CommandLineExecutor.js';
import type { Script } from '@modular-agent/types';
import type { ExecutorConfig } from '../core/types.js';

/**
 * Shell 执行器
 */
export class ShellExecutor extends CommandLineExecutor<'SHELL'> {
  constructor(config?: ExecutorConfig) {
    super({
      ...config,
      type: 'SHELL'
    });
  }

  /**
   * 获取命令行配置
   * @param script 脚本定义
   * @returns 命令行配置
   */
  protected getCommandLineConfig(script: Script) {
    return {
      command: 'sh',
      args: ['-c', script.content || ''],
      shell: false
    };
  }

}
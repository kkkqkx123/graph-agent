/**
 * CMD 执行器
 * 使用 Windows cmd.exe 执行批处理脚本
 */

import { CommandLineExecutor } from '../core/base/CommandLineExecutor.js';
import type { Script } from '@modular-agent/types';
import type { ExecutorConfig } from '../core/types.js';
import type { ScriptType } from '@modular-agent/types';

/**
 * CMD 执行器
 */
export class CmdExecutor extends CommandLineExecutor<'CMD'> {
  constructor(config?: ExecutorConfig) {
    super({
      ...config,
      type: 'CMD'
    });
  }

  /**
   * 获取命令行配置
   * @param script 脚本定义
   * @returns 命令行配置
   */
  protected getCommandLineConfig(script: Script) {
    return {
      command: 'cmd.exe',
      args: ['/c', script.content || ''],
      shell: true,
      windowsHide: true
    };
  }

}
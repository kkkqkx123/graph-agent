/**
 * JavaScript 执行器
 * 使用 Node.js 执行 JavaScript 脚本
 */

import { CommandLineExecutor } from '../core/base/CommandLineExecutor.js';
import type { Script } from '@modular-agent/types';
import type { ExecutorConfig } from '../core/types.js';
import { createPackageLogger } from '@modular-agent/common-utils';

const logger = createPackageLogger('script-executors').child('javascript-executor');

/**
 * JavaScript 执行器
 */
export class JavaScriptExecutor extends CommandLineExecutor<'JAVASCRIPT'> {
  private nodeCommand: string;

  constructor(config?: Omit<ExecutorConfig, 'type'> & { type: 'JAVASCRIPT' }) {
    super({
      ...config,
      type: 'JAVASCRIPT'
    });
    // 默认使用 node
    this.nodeCommand = 'node';
    logger.debug('JavaScript executor initialized', { nodeCommand: this.nodeCommand });
  }

  /**
   * 设置 Node.js 命令
   * @param command Node.js 命令（如 'node', 'nodejs', '/usr/bin/node'）
   */
  setNodeCommand(command: string): void {
    this.nodeCommand = command;
    logger.debug('Node command updated', { nodeCommand: command });
  }

  /**
   * 获取命令行配置
   * @param script 脚本定义
   * @returns 命令行配置
   */
  protected getCommandLineConfig(script: Script) {
    return {
      command: this.nodeCommand,
      args: ['-e', script.content || ''],
      shell: false
    };
  }
}
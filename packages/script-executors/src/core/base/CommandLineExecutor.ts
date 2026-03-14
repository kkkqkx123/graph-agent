/**
 * 命令行执行器抽象基类
 * 提供通用的命令行执行逻辑，封装 spawn 调用、环境变量、工作目录、输出收集等
 * 适用于所有通过子进程执行命令的脚本类型（Shell、CMD、PowerShell、Python等）
 */

import { spawn } from 'child_process';
import { BaseScriptExecutor } from './BaseScriptExecutor.js';
import type { Script, ScriptType } from '@modular-agent/types';
import type { ExecutionContext, ExecutionOutput, ExecutorConfig, ExecutorType } from '../types.js';
import { createPackageLogger } from '@modular-agent/common-utils';

const logger = createPackageLogger('script-executors').child('cmd-executor');

/**
 * 命令行执行配置
 */
export interface CommandLineConfig {
  /** 命令名称（如 'sh', 'cmd.exe', 'pwsh', 'python3'） */
  command: string;
  /** 命令参数（如 ['-c', scriptContent]） */
  args: string[];
  /** 是否使用 shell 模式 */
  shell?: boolean;
  /** Windows 特定选项 */
  windowsHide?: boolean;
}

/**
 * 命令行执行器抽象基类
 * 所有通过子进程执行命令的执行器都应该继承此类
 * 
 * @template T - 执行器类型，必须是 ExecutorType 之一
 */
export abstract class CommandLineExecutor<T extends ExecutorType> extends BaseScriptExecutor {
  constructor(config?: Omit<ExecutorConfig, 'type'> & { type: T }) {
    super(config);
  }

  /**
   * 获取命令行配置（由子类实现）
   * @param script 脚本定义
   * @returns 命令行配置
   */
  protected abstract getCommandLineConfig(script: Script): CommandLineConfig;

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
        logger.error('Script content is empty', { scriptName: script.name });
        reject(new Error('Script content is empty'));
        return;
      }

      // 获取命令行配置
      const config = this.getCommandLineConfig(script);

      // 准备环境变量
      const env = {
        ...process.env,
        ...script.options.environment,
        ...context?.environment
      };

      // 准备工作目录
      const cwd = context?.workingDirectory || script.options.workingDirectory || process.cwd();

      logger.debug('Spawning command process', {
        scriptName: script.name,
        command: config.command,
        args: config.args,
        cwd
      });

      // 执行命令
      const child = spawn(config.command, config.args, {
        env,
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: config.shell ?? false,
        windowsHide: config.windowsHide ?? false
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
        logger.debug('Command process closed', {
          scriptName: script.name,
          exitCode: code,
          stdoutLength: stdout.length,
          stderrLength: stderr.length
        });

        resolve({
          stdout,
          stderr,
          exitCode: code ?? 1
        });
      });

      // 处理错误
      child.on('error', (error) => {
        logger.error('Command process error', {
          scriptName: script.name,
          command: config.command,
          error: error.message
        });
        reject(error);
      });

      // 处理中止信号
      if (context?.signal) {
        const abortHandler = () => {
          logger.info('Command process aborted', {
            scriptName: script.name,
            command: config.command
          });
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
    // 默认返回执行器类型对应的脚本类型
    return [this.config.type as ScriptType];
  }

  /**
   * 获取执行器类型
   * @returns 执行器类型字符串
   */
  getExecutorType(): T {
    return this.config.type as T;
  }
}
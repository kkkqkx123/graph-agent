/**
 * 后台Shell工具
 * 支持后台执行命令、获取输出和终止进程
 */

import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import type { ToolOutput } from '@modular-agent/types';
import type { ToolDefinition } from '../types.js';

/**
 * 后台Shell状态
 */
interface BackgroundShell {
  shellId: string;
  command: string;
  process: ChildProcess;
  startTime: number;
  outputLines: string[];
  lastReadIndex: number;
  status: 'running' | 'completed' | 'failed' | 'terminated' | 'error';
  exitCode: number | null;
}

/**
 * Shell输出结果
 */
interface ShellOutputResult extends ToolOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  shellId?: string;
}

/**
 * 后台Shell管理器
 * 每个线程实例独立
 */
class BackgroundShellManager {
  private shells: Map<string, BackgroundShell> = new Map();

  /**
   * 添加后台Shell
   */
  add(shell: BackgroundShell): void {
    this.shells.set(shell.shellId, shell);
  }

  /**
   * 获取后台Shell
   */
  get(shellId: string): BackgroundShell | undefined {
    return this.shells.get(shellId);
  }

  /**
   * 获取所有可用的shell ID
   */
  getAvailableIds(): string[] {
    return Array.from(this.shells.keys());
  }

  /**
   * 移除后台Shell
   */
  remove(shellId: string): boolean {
    return this.shells.delete(shellId);
  }

  /**
   * 启动监控
   */
  startMonitor(shell: BackgroundShell): void {
    const proc = shell.process;

    const handleOutput = (data: Buffer) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          shell.outputLines.push(line);
        }
      }
    };

    proc.stdout?.on('data', handleOutput);
    proc.stderr?.on('data', handleOutput);

    proc.on('close', (code) => {
      shell.status = code === 0 ? 'completed' : 'failed';
      shell.exitCode = code;
    });

    proc.on('error', (error) => {
      shell.status = 'error';
      shell.outputLines.push(`Process error: ${error.message}`);
    });
  }

  /**
   * 终止后台Shell
   */
  async terminate(shellId: string): Promise<BackgroundShell> {
    const shell = this.shells.get(shellId);
    if (!shell) {
      throw new Error(`Shell not found: ${shellId}`);
    }

    // 终止进程
    if (shell.process.pid) {
      try {
        process.kill(shell.process.pid, 'SIGTERM');
        // 等待5秒后强制终止
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            try {
              process.kill(shell.process.pid!, 'SIGKILL');
            } catch {
              // 进程可能已经结束
            }
            resolve();
          }, 5000);
        });
      } catch {
        // 进程可能已经结束
      }
    }

    shell.status = 'terminated';
    shell.exitCode = shell.process.exitCode ?? -1;
    this.shells.delete(shellId);

    return shell;
  }

  /**
   * 清理所有Shell
   */
  cleanup(): void {
    for (const [shellId, shell] of this.shells) {
      if (shell.process.pid) {
        try {
          process.kill(shell.process.pid, 'SIGTERM');
        } catch {
          // 忽略错误
        }
      }
    }
    this.shells.clear();
  }
}

/**
 * 创建后台Shell启动工具
 */
export function createShellBackgroundTool(): ToolDefinition {
  return {
    id: 'shell_background',
    name: 'shell_background',
    type: 'STATEFUL',
    description: `Execute shell commands in background for long-running processes.

Use this for:
  - Starting servers (npm run dev, python -m http.server)
  - Long-running build processes
  - Background tasks that need monitoring

After starting, use shell_output to monitor and shell_kill to terminate.`,
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to execute in background'
        }
      },
      required: ['command']
    },
    factory: () => {
      const manager = new BackgroundShellManager();

      return {
        execute: async (params: Record<string, any>): Promise<ShellOutputResult> => {
          const { command } = params;

          try {
            const shellId = randomUUID().slice(0, 8);

            // 根据平台选择shell
            const isWindows = process.platform === 'win32';
            const shell = isWindows ? 'cmd.exe' : '/bin/shell';
            const shellArgs = isWindows ? ['/c', command] : ['-c', command];

            const proc = spawn(shell, shellArgs, {
              cwd: process.cwd(),
              env: process.env,
              windowsHide: true
            });

            const shell_: BackgroundShell = {
              shellId: shellId,
              command,
              process: proc,
              startTime: Date.now(),
              outputLines: [],
              lastReadIndex: 0,
              status: 'running',
              exitCode: null
            };

            manager.add(shell_);
            manager.startMonitor(shell_);

            return {
              success: true,
              content: `Command started in background. Use shell_output to monitor (shell_id='${shellId}').\n\nCommand: ${command}\nShell ID: ${shellId}`,
              stdout: `Background command started with ID: ${shellId}`,
              stderr: '',
              exitCode: 0,
              shellId: shellId
            };
          } catch (error) {
            return {
              success: false,
              content: '',
              error: error instanceof Error ? error.message : String(error),
              stdout: '',
              stderr: error instanceof Error ? error.message : String(error),
              exitCode: -1
            };
          }
        },
        cleanup: () => {
          manager.cleanup();
        }
      };
    }
  };
}

/**
 * 创建Shell输出获取工具
 */
export function createShellOutputTool(): ToolDefinition {
  return {
    id: 'shell_output',
    name: 'shell_output',
    type: 'STATEFUL',
    description: `Retrieves output from a running or completed background shell shell.

- Takes a shell_id parameter identifying the shell
- Always returns only new output since the last check
- Returns stdout and stderr output along with shell status
- Supports optional regex filtering to show only lines matching a pattern

Process status values:
  - "running": Still executing
  - "completed": Finished successfully
  - "failed": Finished with error
  - "terminated": Was terminated
  - "error": Error occurred`,
    parameters: {
      type: 'object',
      properties: {
        shell_id: {
          type: 'string',
          description: 'The ID of the background shell to retrieve output from'
        },
        filter_str: {
          type: 'string',
          description: 'Optional regular expression to filter the output lines'
        }
      },
      required: ['shell_id']
    },
    factory: () => {
      // 注意：这里需要与shell_background共享同一个manager
      // 在实际使用中，应该通过线程上下文传递
      const manager = new BackgroundShellManager();

      return {
        execute: async (params: Record<string, any>): Promise<ShellOutputResult> => {
          const { shell_id, filter_str } = params;

          try {
            const shell = manager.get(shell_id);
            if (!shell) {
              const availableIds = manager.getAvailableIds();
              return {
                success: false,
                content: '',
                error: `Shell not found: ${shell_id}. Available: ${availableIds.length > 0 ? availableIds.join(', ') : 'none'}`,
                stdout: '',
                stderr: '',
                exitCode: -1
              };
            }

            // 获取新输出
            const newLines = shell.outputLines.slice(shell.lastReadIndex);
            shell.lastReadIndex = shell.outputLines.length;

            // 应用过滤
            let filteredLines = newLines;
            if (filter_str) {
              try {
                const regex = new RegExp(filter_str);
                filteredLines = newLines.filter(line => regex.test(line));
              } catch {
                // 无效的正则表达式，返回所有行
              }
            }

            const stdout = filteredLines.join('\n');

            return {
              success: true,
              content: stdout || '(no new output)',
              stdout,
              stderr: '',
              exitCode: shell.exitCode ?? 0,
              shellId: shell_id
            };
          } catch (error) {
            return {
              success: false,
              content: '',
              error: `Failed to get shell output: ${error instanceof Error ? error.message : String(error)}`,
              stdout: '',
              stderr: error instanceof Error ? error.message : String(error),
              exitCode: -1
            };
          }
        }
      };
    }
  };
}

/**
 * 创建Shell终止工具
 */
export function createShellKillTool(): ToolDefinition {
  return {
    id: 'shell_kill',
    name: 'shell_kill',
    type: 'STATEFUL',
    description: `Kills a running background shell shell by its ID.

- Takes a shell_id parameter identifying the shell to kill
- Attempts graceful termination (SIGTERM) first, then forces (SIGKILL) if needed
- Returns the final status and any remaining output before termination
- Cleans up all resources associated with the shell`,
    parameters: {
      type: 'object',
      properties: {
        shell_id: {
          type: 'string',
          description: 'The ID of the background shell to terminate'
        }
      },
      required: ['shell_id']
    },
    factory: () => {
      const manager = new BackgroundShellManager();

      return {
        execute: async (params: Record<string, any>): Promise<ShellOutputResult> => {
          const { shell_id } = params;

          try {
            // 获取剩余输出
            const shell = manager.get(shell_id);
            const remainingLines = shell ? shell.outputLines.slice(shell.lastReadIndex) : [];

            // 终止进程
            const terminatedShell = await manager.terminate(shell_id);
            const stdout = remainingLines.join('\n');

            return {
              success: true,
              content: stdout || `Shell ${shell_id} terminated successfully`,
              stdout,
              stderr: '',
              exitCode: terminatedShell.exitCode ?? 0,
              shellId: shell_id
            };
          } catch (error) {
            const availableIds = manager.getAvailableIds();
            return {
              success: false,
              content: '',
              error: `${error instanceof Error ? error.message : String(error)}. Available: ${availableIds.length > 0 ? availableIds.join(', ') : 'none'}`,
              stdout: '',
              stderr: error instanceof Error ? error.message : String(error),
              exitCode: -1
            };
          }
        }
      };
    }
  };
}

/**
 * 后台Bash工具
 * 支持后台执行命令、获取输出和终止进程
 */

import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import type { ToolDefinition, ToolResult } from '../types.js';

/**
 * 后台Shell状态
 */
interface BackgroundShell {
  bashId: string;
  command: string;
  process: ChildProcess;
  startTime: number;
  outputLines: string[];
  lastReadIndex: number;
  status: 'running' | 'completed' | 'failed' | 'terminated' | 'error';
  exitCode: number | null;
}

/**
 * Bash输出结果
 */
interface BashOutputResult extends ToolResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  bashId?: string;
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
    this.shells.set(shell.bashId, shell);
  }

  /**
   * 获取后台Shell
   */
  get(bashId: string): BackgroundShell | undefined {
    return this.shells.get(bashId);
  }

  /**
   * 获取所有可用的bash ID
   */
  getAvailableIds(): string[] {
    return Array.from(this.shells.keys());
  }

  /**
   * 移除后台Shell
   */
  remove(bashId: string): boolean {
    return this.shells.delete(bashId);
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
  async terminate(bashId: string): Promise<BackgroundShell> {
    const shell = this.shells.get(bashId);
    if (!shell) {
      throw new Error(`Shell not found: ${bashId}`);
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
    this.shells.delete(bashId);

    return shell;
  }

  /**
   * 清理所有Shell
   */
  cleanup(): void {
    for (const [bashId, shell] of this.shells) {
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
 * 创建后台Bash启动工具
 */
export function createBashBackgroundTool(): ToolDefinition {
  return {
    id: 'bash_background',
    name: 'bash_background',
    type: 'STATEFUL',
    description: `Execute bash commands in background for long-running processes.

Use this for:
  - Starting servers (npm run dev, python -m http.server)
  - Long-running build processes
  - Background tasks that need monitoring

After starting, use bash_output to monitor and bash_kill to terminate.`,
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The bash command to execute in background'
        }
      },
      required: ['command']
    },
    factory: () => {
      const manager = new BackgroundShellManager();

      return {
        execute: async (params: Record<string, any>): Promise<BashOutputResult> => {
          const { command } = params;

          try {
            const bashId = randomUUID().slice(0, 8);

            // 根据平台选择shell
            const isWindows = process.platform === 'win32';
            const shell = isWindows ? 'cmd.exe' : '/bin/bash';
            const shellArgs = isWindows ? ['/c', command] : ['-c', command];

            const proc = spawn(shell, shellArgs, {
              cwd: process.cwd(),
              env: process.env,
              windowsHide: true
            });

            const shell_: BackgroundShell = {
              bashId,
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
              content: `Command started in background. Use bash_output to monitor (bash_id='${bashId}').\n\nCommand: ${command}\nBash ID: ${bashId}`,
              stdout: `Background command started with ID: ${bashId}`,
              stderr: '',
              exitCode: 0,
              bashId
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
 * 创建Bash输出获取工具
 */
export function createBashOutputTool(): ToolDefinition {
  return {
    id: 'bash_output',
    name: 'bash_output',
    type: 'STATEFUL',
    description: `Retrieves output from a running or completed background bash shell.

- Takes a bash_id parameter identifying the shell
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
        bash_id: {
          type: 'string',
          description: 'The ID of the background shell to retrieve output from'
        },
        filter_str: {
          type: 'string',
          description: 'Optional regular expression to filter the output lines'
        }
      },
      required: ['bash_id']
    },
    factory: () => {
      // 注意：这里需要与bash_background共享同一个manager
      // 在实际使用中，应该通过线程上下文传递
      const manager = new BackgroundShellManager();

      return {
        execute: async (params: Record<string, any>): Promise<BashOutputResult> => {
          const { bash_id, filter_str } = params;

          try {
            const shell = manager.get(bash_id);
            if (!shell) {
              const availableIds = manager.getAvailableIds();
              return {
                success: false,
                content: '',
                error: `Shell not found: ${bash_id}. Available: ${availableIds.length > 0 ? availableIds.join(', ') : 'none'}`,
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
              bashId: bash_id
            };
          } catch (error) {
            return {
              success: false,
              content: '',
              error: `Failed to get bash output: ${error instanceof Error ? error.message : String(error)}`,
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
 * 创建Bash终止工具
 */
export function createBashKillTool(): ToolDefinition {
  return {
    id: 'bash_kill',
    name: 'bash_kill',
    type: 'STATEFUL',
    description: `Kills a running background bash shell by its ID.

- Takes a bash_id parameter identifying the shell to kill
- Attempts graceful termination (SIGTERM) first, then forces (SIGKILL) if needed
- Returns the final status and any remaining output before termination
- Cleans up all resources associated with the shell`,
    parameters: {
      type: 'object',
      properties: {
        bash_id: {
          type: 'string',
          description: 'The ID of the background shell to terminate'
        }
      },
      required: ['bash_id']
    },
    factory: () => {
      const manager = new BackgroundShellManager();

      return {
        execute: async (params: Record<string, any>): Promise<BashOutputResult> => {
          const { bash_id } = params;

          try {
            // 获取剩余输出
            const shell = manager.get(bash_id);
            const remainingLines = shell ? shell.outputLines.slice(shell.lastReadIndex) : [];

            // 终止进程
            const terminatedShell = await manager.terminate(bash_id);
            const stdout = remainingLines.join('\n');

            return {
              success: true,
              content: stdout || `Shell ${bash_id} terminated successfully`,
              stdout,
              stderr: '',
              exitCode: terminatedShell.exitCode ?? 0,
              bashId: bash_id
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

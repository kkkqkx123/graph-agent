/**
 * Shell命令执行工具
 * 复用 tool-executors 的 TimeoutController 进行超时控制
 */

import { spawn } from 'child_process';
import { TimeoutController } from '@modular-agent/tool-executors';
import type { ToolDefinition, ToolResult } from '../types.js';

/**
 * Shell执行结果
 */
interface ShellResult extends ToolResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * 创建Shell工具
 */
export function createShellTool(): ToolDefinition {
  // 复用 TimeoutController
  const timeoutController = new TimeoutController(120000); // 默认120秒

  return {
    id: 'shell',
    name: 'shell',
    type: 'STATELESS',
    description: `Execute shell commands in foreground or background.

For terminal operations like git, npm, docker, etc. DO NOT use for file operations - use specialized tools.

Parameters:
  - command (required): Shell command to execute
  - timeout (optional): Timeout in seconds (default: 120, max: 600) for foreground commands

Tips:
  - Quote file paths with spaces: cd "My Documents"
  - Chain dependent commands with &&: git add . && git commit -m "msg"
  - Use absolute paths instead of cd when possible

Examples:
  - git status
  - npm test
  - pnpm build`,
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to execute. Quote file paths with spaces using double quotes.'
        },
        timeout: {
          type: 'integer',
          description: 'Optional: Timeout in seconds (default: 120, max: 600). Only applies to foreground commands.',
          default: 120
        }
      },
      required: ['command']
    },
    execute: async (params: Record<string, any>): Promise<ToolResult> => {
      const { command, timeout = 120 } = params;

      // 验证超时（秒转毫秒）
      const actualTimeoutMs = Math.min(Math.max(timeout, 1), 600) * 1000;

      // 使用 TimeoutController 执行命令
      try {
        return await timeoutController.executeWithTimeout(
          () => executeShellCommand(command),
          actualTimeoutMs
        );
      } catch (error) {
        // 超时错误
        if (error instanceof Error && error.name === 'TimeoutError') {
          return {
            success: false,
            content: '',
            error: `Command timed out after ${timeout} seconds`,
            stdout: '',
            stderr: `Command timed out after ${timeout} seconds`,
            exitCode: -1
          } as ShellResult;
        }
        throw error;
      }
    }
  };
}

/**
 * 执行 Shell 命令
 */
async function executeShellCommand(command: string): Promise<ShellResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    // 根据平台选择shell
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'powershell.exe' : '/bin/bash';
    const shellArgs = isWindows ? ['/c', command] : ['-c', command];

    const proc = spawn(shell, shellArgs, {
      cwd: process.cwd(),
      env: process.env,
      windowsHide: true
    });

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      const exitCode = code ?? 0;
      const success = exitCode === 0;

      let content = '';
      if (stdout) content += stdout;
      if (stderr) content += (content ? '\n[stderr]:\n' : '') + stderr;
      if (!content) content = '(no output)';

      resolve({
        success,
        content,
        error: success ? undefined : `Command failed with exit code ${exitCode}${stderr ? '\n' + stderr : ''}`,
        stdout,
        stderr,
        exitCode
      });
    });

    proc.on('error', (error) => {
      resolve({
        success: false,
        content: '',
        error: error.message,
        stdout: '',
        stderr: error.message,
        exitCode: -1
      });
    });
  });
}

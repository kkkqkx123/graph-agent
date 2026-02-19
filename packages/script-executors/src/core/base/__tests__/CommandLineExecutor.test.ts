/**
 * CommandLineExecutor 测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandLineExecutor } from '../CommandLineExecutor.js';
import type { Script, ScriptType } from '@modular-agent/types';
import type { ExecutionContext, ExecutionOutput, ExecutorConfig, ExecutorType } from '../../types.js';
import { EventEmitter } from 'events';

// 模拟 child_process 的 spawn
vi.mock('child_process', () => ({
  spawn: vi.fn()
}));

import { spawn } from 'child_process';

// 创建一个测试用的具体命令行执行器
class TestCommandLineExecutor extends CommandLineExecutor<'SHELL'> {
  constructor(config?: Omit<ExecutorConfig, 'type'> & { type: 'SHELL' }) {
    super(config);
  }

  protected getCommandLineConfig(script: Script) {
    return {
      command: 'sh',
      args: ['-c', script.content || ''],
      shell: false,
      windowsHide: false
    };
  }
}

// 创建模拟的子进程
function createMockChildProcess(exitCode: number = 0, stdout: string = '', stderr: string = '') {
  const mockChild = new EventEmitter() as any;
  mockChild.stdout = new EventEmitter();
  mockChild.stderr = new EventEmitter();
  mockChild.kill = vi.fn();

  // 模拟数据输出
  if (stdout) {
    setTimeout(() => {
      mockChild.stdout.emit('data', Buffer.from(stdout));
    }, 10);
  }

  if (stderr) {
    setTimeout(() => {
      mockChild.stderr.emit('data', Buffer.from(stderr));
    }, 10);
  }

  // 模拟进程退出
  setTimeout(() => {
    mockChild.emit('close', exitCode);
  }, 20);

  return mockChild;
}

describe('CommandLineExecutor', () => {
  let executor: TestCommandLineExecutor;
  let mockScript: Script;

  beforeEach(() => {
    vi.clearAllMocks();
    executor = new TestCommandLineExecutor();
    mockScript = {
      id: 'test-1',
      name: 'test-script',
      type: 'SHELL',
      description: 'Test script',
      content: 'echo "Hello, World!"',
      options: {}
    };
  });

  describe('构造函数', () => {
    it('应该使用默认配置创建实例', () => {
      const testExecutor = new TestCommandLineExecutor();
      expect(testExecutor).toBeInstanceOf(CommandLineExecutor);
      expect(testExecutor.getExecutorType()).toBe('SHELL');
    });

    it('应该使用自定义配置创建实例', () => {
      const config: Omit<ExecutorConfig, 'type'> & { type: 'SHELL' } = {
        type: 'SHELL',
        timeout: 60000,
        maxRetries: 5,
        retryDelay: 2000
      };
      const testExecutor = new TestCommandLineExecutor(config);
      expect(testExecutor).toBeInstanceOf(CommandLineExecutor);
    });
  });

  describe('doExecute', () => {
    it('应该成功执行命令', async () => {
      const mockChild = createMockChildProcess(0, 'Hello, World!', '');
      vi.mocked(spawn).mockReturnValue(mockChild);

      const result = await executor.execute(mockScript);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Hello, World!');
      expect(result.exitCode).toBe(0);
      expect(spawn).toHaveBeenCalledWith(
        'sh',
        ['-c', 'echo "Hello, World!"'],
        expect.objectContaining({
          env: expect.any(Object),
          cwd: expect.any(String),
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false,
          windowsHide: false
        })
      );
    });

    it('应该处理执行失败的情况', async () => {
      const mockChild = createMockChildProcess(1, '', 'Error occurred');
      vi.mocked(spawn).mockReturnValue(mockChild);

      const result = await executor.execute(mockScript);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error occurred');
    });

    it('应该处理空脚本内容', async () => {
      const emptyScript: Script = {
        ...mockScript,
        content: ''
      };

      const result = await executor.execute(emptyScript);

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    }, 10000);

    it('应该支持环境变量', async () => {
      const scriptWithEnv: Script = {
        ...mockScript,
        options: {
          environment: {
            TEST_VAR: 'test-value'
          }
        }
      };

      const mockChild = createMockChildProcess(0, 'test-value', '');
      vi.mocked(spawn).mockReturnValue(mockChild);

      await executor.execute(scriptWithEnv);

      expect(spawn).toHaveBeenCalledWith(
        'sh',
        ['-c', 'echo "Hello, World!"'],
        expect.objectContaining({
          env: expect.objectContaining({
            TEST_VAR: 'test-value'
          })
        })
      );
    });

    it('应该支持执行上下文中的环境变量', async () => {
      const context: ExecutionContext = {
        environment: {
          CONTEXT_VAR: 'context-value'
        }
      };

      const mockChild = createMockChildProcess(0, '', '');
      vi.mocked(spawn).mockReturnValue(mockChild);

      await executor.execute(mockScript, {}, context);

      expect(spawn).toHaveBeenCalledWith(
        'sh',
        ['-c', 'echo "Hello, World!"'],
        expect.objectContaining({
          env: expect.objectContaining({
            CONTEXT_VAR: 'context-value'
          })
        })
      );
    });

    it('应该支持工作目录', async () => {
      const scriptWithCwd: Script = {
        ...mockScript,
        options: {
          workingDirectory: '/tmp'
        }
      };

      const mockChild = createMockChildProcess(0, '', '');
      vi.mocked(spawn).mockReturnValue(mockChild);

      await executor.execute(scriptWithCwd);

      expect(spawn).toHaveBeenCalledWith(
        'sh',
        ['-c', 'echo "Hello, World!"'],
        expect.objectContaining({
          cwd: '/tmp'
        })
      );
    });

    it('应该支持执行上下文中的工作目录', async () => {
      const context: ExecutionContext = {
        workingDirectory: '/custom/path'
      };

      const mockChild = createMockChildProcess(0, '', '');
      vi.mocked(spawn).mockReturnValue(mockChild);

      await executor.execute(mockScript, {}, context);

      expect(spawn).toHaveBeenCalledWith(
        'sh',
        ['-c', 'echo "Hello, World!"'],
        expect.objectContaining({
          cwd: '/custom/path'
        })
      );
    });

    it('应该处理 AbortSignal 中止', async () => {
      const mockChild = createMockChildProcess(0, '', '');
      vi.mocked(spawn).mockReturnValue(mockChild);

      const abortController = new AbortController();
      setTimeout(() => abortController.abort(), 5);

      const context: ExecutionContext = {
        signal: abortController.signal
      };

      await executor.execute(mockScript, {}, context);

      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('应该收集标准输出', async () => {
      const mockChild = createMockChildProcess(0, 'Line 1\nLine 2\nLine 3', '');
      vi.mocked(spawn).mockReturnValue(mockChild);

      const result = await executor.execute(mockScript);

      expect(result.stdout).toBe('Line 1\nLine 2\nLine 3');
    });

    it('应该收集标准错误', async () => {
      const mockChild = createMockChildProcess(1, '', 'Error line 1\nError line 2');
      vi.mocked(spawn).mockReturnValue(mockChild);

      const result = await executor.execute(mockScript);

      expect(result.stderr).toBe('Error line 1\nError line 2');
    });

    it('应该处理退出码为 null 的情况', async () => {
      const mockChild = new EventEmitter() as any;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();
      mockChild.kill = vi.fn();

      vi.mocked(spawn).mockReturnValue(mockChild);

      setTimeout(() => {
        mockChild.emit('close', null);
      }, 20);

      const result = await executor.execute(mockScript);

      expect(result.exitCode).toBe(1);
      expect(result.success).toBe(false);
    });

    it('应该合并多个数据事件', async () => {
      const mockChild = new EventEmitter() as any;
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();
      mockChild.kill = vi.fn();

      vi.mocked(spawn).mockReturnValue(mockChild);

      // 模拟多个数据事件
      setTimeout(() => mockChild.stdout.emit('data', Buffer.from('Part 1')), 5);
      setTimeout(() => mockChild.stdout.emit('data', Buffer.from('Part 2')), 10);
      setTimeout(() => mockChild.stdout.emit('data', Buffer.from('Part 3')), 15);
      setTimeout(() => mockChild.emit('close', 0), 20);

      const result = await executor.execute(mockScript);

      expect(result.stdout).toBe('Part 1Part 2Part 3');
    });
  });

  describe('getSupportedTypes', () => {
    it('应该返回支持的脚本类型', () => {
      const types = executor.getSupportedTypes();
      expect(types).toEqual(['SHELL']);
    });
  });

  describe('getExecutorType', () => {
    it('应该返回执行器类型', () => {
      const type = executor.getExecutorType();
      expect(type).toBe('SHELL');
    });
  });

  describe('环境变量优先级', () => {
    it('应该正确合并环境变量（上下文优先级最高）', async () => {
      const script: Script = {
        ...mockScript,
        options: {
          environment: {
            VAR1: 'script-value',
            VAR2: 'script-value'
          }
        }
      };

      const context: ExecutionContext = {
        environment: {
          VAR2: 'context-value',
          VAR3: 'context-value'
        }
      };

      const mockChild = createMockChildProcess(0, '', '');
      vi.mocked(spawn).mockReturnValue(mockChild);

      await executor.execute(script, {}, context);

      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const env = spawnCall[2].env as Record<string, string>;

      expect(env.VAR1).toBe('script-value');
      expect(env.VAR2).toBe('context-value'); // 上下文覆盖脚本
      expect(env.VAR3).toBe('context-value');
    });
  });

  describe('工作目录优先级', () => {
    it('应该使用上下文中的工作目录（优先级最高）', async () => {
      const script: Script = {
        ...mockScript,
        options: {
          workingDirectory: '/script/path'
        }
      };

      const context: ExecutionContext = {
        workingDirectory: '/context/path'
      };

      const mockChild = createMockChildProcess(0, '', '');
      vi.mocked(spawn).mockReturnValue(mockChild);

      await executor.execute(script, {}, context);

      const spawnCall = vi.mocked(spawn).mock.calls[0];
      expect(spawnCall[2].cwd).toBe('/context/path');
    });

    it('应该使用脚本中的工作目录', async () => {
      const script: Script = {
        ...mockScript,
        options: {
          workingDirectory: '/script/path'
        }
      };

      const mockChild = createMockChildProcess(0, '', '');
      vi.mocked(spawn).mockReturnValue(mockChild);

      await executor.execute(script);

      const spawnCall = vi.mocked(spawn).mock.calls[0];
      expect(spawnCall[2].cwd).toBe('/script/path');
    });

    it('应该使用当前工作目录作为默认值', async () => {
      const mockChild = createMockChildProcess(0, '', '');
      vi.mocked(spawn).mockReturnValue(mockChild);

      await executor.execute(mockScript);

      const spawnCall = vi.mocked(spawn).mock.calls[0];
      expect(spawnCall[2].cwd).toBe(process.cwd());
    });
  });
});
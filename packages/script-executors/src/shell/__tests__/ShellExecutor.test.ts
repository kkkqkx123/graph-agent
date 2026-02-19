/**
 * ShellExecutor 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ShellExecutor } from '../ShellExecutor.js';
import type { Script } from '@modular-agent/types';

describe('ShellExecutor', () => {
  let executor: ShellExecutor;

  beforeEach(() => {
    executor = new ShellExecutor();
  });

  it('应该成功执行简单的 shell 脚本', async () => {
    const script: Script = {
      id: 'test-1',
      name: 'test-script',
      type: 'SHELL',
      description: 'Test script',
      content: 'echo "Hello, World!"',
      options: {
        timeout: 5000
      }
    };

    const result = await executor.execute(script);

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Hello, World!');
    expect(result.exitCode).toBe(0);
  });

  it('应该支持环境变量', async () => {
    const script: Script = {
      id: 'test-2',
      name: 'test-env-script',
      type: 'SHELL',
      description: 'Test environment variables',
      content: 'echo $TEST_VAR',
      options: {
        timeout: 5000,
        environment: {
          TEST_VAR: 'test-value'
        }
      }
    };

    const result = await executor.execute(script);

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('test-value');
  });

  it('应该处理执行错误', async () => {
    const script: Script = {
      id: 'test-3',
      name: 'test-error-script',
      type: 'SHELL',
      description: 'Test error handling',
      content: 'exit 1',
      options: {
        timeout: 5000
      }
    };

    const result = await executor.execute(script);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it('应该返回支持的脚本类型', () => {
    const types = executor.getSupportedTypes();
    expect(types).toEqual(['SHELL']);
  });

  it('应该返回执行器类型', () => {
    const type = executor.getExecutorType();
    expect(type).toBe('SHELL');
  });
});
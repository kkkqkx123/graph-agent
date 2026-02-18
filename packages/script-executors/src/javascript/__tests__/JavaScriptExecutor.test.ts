/**
 * JavaScriptExecutor 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JavaScriptExecutor } from '../JavaScriptExecutor.js';
import type { Script } from '@modular-agent/types';

describe('JavaScriptExecutor', () => {
  let executor: JavaScriptExecutor;

  beforeEach(() => {
    executor = new JavaScriptExecutor();
  });

  it('应该成功执行简单的 JavaScript 脚本', async () => {
    const script: Script = {
      id: 'test-1',
      name: 'test-script',
      type: 'JAVASCRIPT',
      description: 'Test script',
      content: 'console.log("Hello, World!");',
      options: {
        timeout: 5000
      }
    };

    const result = await executor.execute(script);

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Hello, World!');
    expect(result.exitCode).toBe(0);
  });

  it('应该支持环境变量访问', async () => {
    const script: Script = {
      id: 'test-2',
      name: 'test-env-script',
      type: 'JAVASCRIPT',
      description: 'Test environment variables',
      content: 'console.log(process.env.TEST_VAR);',
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
      type: 'JAVASCRIPT',
      description: 'Test error handling',
      content: 'throw new Error("Test error");',
      options: {
        timeout: 5000
      }
    };

    const result = await executor.execute(script);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Test error');
  });

  it('应该验证脚本配置', () => {
    const validScript: Script = {
      id: 'test-4',
      name: 'valid-script',
      type: 'JAVASCRIPT',
      description: 'Valid script',
      content: 'console.log("test");',
      options: {
        timeout: 5000
      }
    };

    const result = executor.validate(validScript);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('应该拒绝无效的脚本配置', () => {
    const invalidScript: Script = {
      id: 'test-5',
      name: '',
      type: 'JAVASCRIPT',
      description: '',
      content: '',
      options: {
        timeout: 5000
      }
    };

    const result = executor.validate(invalidScript);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('应该返回支持的脚本类型', () => {
    const types = executor.getSupportedTypes();
    expect(types).toEqual(['JAVASCRIPT']);
  });

  it('应该返回执行器类型', () => {
    const type = executor.getExecutorType();
    expect(type).toBe('JAVASCRIPT');
  });
});
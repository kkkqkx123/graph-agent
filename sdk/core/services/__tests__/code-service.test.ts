/**
 * CodeService 单元测试
 */

import { CodeService } from '../code-service';
import { ScriptType } from '@modular-agent/types/code';
import { NotFoundError, CodeExecutionError } from '@modular-agent/types/errors';

describe('CodeService', () => {
  let codeService: CodeService;

  beforeEach(() => {
    // 创建新的 CodeService 实例以避免测试间干扰
    codeService = new CodeService();
  });

  afterEach(() => {
    // 清理所有脚本和执行器
    codeService.clearScripts();
    codeService.clearExecutors();
  });

  describe('registerScript - 注册脚本', () => {
    it('应该成功注册单个脚本', () => {
      const script = {
        id: 'script-1',
        name: 'test-script',
        type: ScriptType.SHELL,
        description: '测试脚本',
        content: 'echo "Hello World"',
        options: {},
        enabled: true
      };

      codeService.registerScript(script);

      expect(codeService.hasScript('test-script')).toBe(true);
      expect(codeService.getScript('test-script')).toEqual(script);
    });

    it('应该成功批量注册脚本', () => {
      const scripts = [
        {
          id: 'script-1',
          name: 'script-1',
          type: ScriptType.SHELL,
          description: '脚本1',
          content: 'echo "1"',
          options: {},
          enabled: true
        },
        {
          id: 'script-2',
          name: 'script-2',
          type: ScriptType.POWERSHELL,
          description: '脚本2',
          content: 'Write-Host "2"',
          options: {},
          enabled: true
        }
      ];

      codeService.registerScripts(scripts);

      expect(codeService.hasScript('script-1')).toBe(true);
      expect(codeService.hasScript('script-2')).toBe(true);
      expect(codeService.listScripts()).toHaveLength(2);
    });

    it('应该抛出错误当注册同名脚本', () => {
      const script1 = {
        id: 'script-1',
        name: 'test-script',
        type: ScriptType.SHELL,
        description: '原始脚本',
        content: 'echo "original"',
        options: {},
        enabled: true
      };

      const script2 = {
        id: 'script-2',
        name: 'test-script',
        type: ScriptType.POWERSHELL,
        description: '更新脚本',
        content: 'Write-Host "updated"',
        options: {},
        enabled: true
      };

      codeService.registerScript(script1);
      expect(() => {
        codeService.registerScript(script2);
      }).toThrow();
    });
  });

  describe('unregisterScript - 注销脚本', () => {
    it('应该成功注销脚本', () => {
      const script = {
        id: 'script-1',
        name: 'test-script',
        type: ScriptType.SHELL,
        description: '测试脚本',
        content: 'echo "Hello"',
        options: {},
        enabled: true
      };

      codeService.registerScript(script);
      expect(codeService.hasScript('test-script')).toBe(true);

      codeService.unregisterScript('test-script');
      expect(codeService.hasScript('test-script')).toBe(false);
    });

    it('应该抛出错误当注销不存在的脚本', () => {
      expect(() => {
        codeService.unregisterScript('non-existent');
      }).toThrow();
    });
  });

  describe('getScript - 获取脚本', () => {
    it('应该成功获取已注册的脚本', () => {
      const script = {
        id: 'script-1',
        name: 'test-script',
        type: ScriptType.SHELL,
        description: '测试脚本',
        content: 'echo "Hello"',
        options: {},
        enabled: true
      };

      codeService.registerScript(script);
      const result = codeService.getScript('test-script');

      expect(result).toEqual(script);
    });

    it('应该抛出 NotFoundError 当脚本不存在', () => {
      expect(() => {
        codeService.getScript('non-existent');
      }).toThrow(NotFoundError);
    });
  });

  describe('listScripts - 列出脚本', () => {
    it('应该返回所有脚本', () => {
      const scripts = [
        {
          id: 'script-1',
          name: 'script-1',
          type: ScriptType.SHELL,
          description: '脚本1',
          content: 'echo "1"',
          options: {},
          enabled: true
        },
        {
          id: 'script-2',
          name: 'script-2',
          type: ScriptType.POWERSHELL,
          description: '脚本2',
          content: 'Write-Host "2"',
          options: {},
          enabled: true
        }
      ];

      codeService.registerScripts(scripts);
      const result = codeService.listScripts();

      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining(scripts));
    });

    it('应该返回空数组当没有脚本时', () => {
      expect(codeService.listScripts()).toEqual([]);
    });
  });

  describe('listScriptsByType - 按类型列出脚本', () => {
    it('应该返回指定类型的脚本', () => {
      const scripts = [
        {
          id: 'script-1',
          name: 'script-1',
          type: ScriptType.SHELL,
          description: 'Shell脚本',
          content: 'echo "shell"',
          options: {},
          enabled: true
        },
        {
          id: 'script-2',
          name: 'script-2',
          type: ScriptType.POWERSHELL,
          description: 'PowerShell脚本',
          content: 'Write-Host "ps"',
          options: {},
          enabled: true
        },
        {
          id: 'script-3',
          name: 'script-3',
          type: ScriptType.SHELL,
          description: '另一个Shell脚本',
          content: 'echo "another"',
          options: {},
          enabled: true
        }
      ];

      codeService.registerScripts(scripts);
      const shellScripts = codeService.listScriptsByType(ScriptType.SHELL);

      expect(shellScripts).toHaveLength(2);
      expect(shellScripts.every(s => s.type === ScriptType.SHELL)).toBe(true);
    });

    it('应该返回空数组当没有匹配类型的脚本时', () => {
      expect(codeService.listScriptsByType(ScriptType.PYTHON)).toEqual([]);
    });
  });

  describe('listScriptsByCategory - 按分类列出脚本', () => {
    it('应该返回指定分类的脚本', () => {
      const scripts = [
        {
          id: 'script-1',
          name: 'script-1',
          type: ScriptType.SHELL,
          description: '脚本1',
          content: 'echo "1"',
          options: {},
          metadata: { category: 'utils' },
          enabled: true
        },
        {
          id: 'script-2',
          name: 'script-2',
          type: ScriptType.POWERSHELL,
          description: '脚本2',
          content: 'Write-Host "2"',
          options: {},
          metadata: { category: 'deploy' },
          enabled: true
        },
        {
          id: 'script-3',
          name: 'script-3',
          type: ScriptType.SHELL,
          description: '脚本3',
          content: 'echo "3"',
          options: {},
          metadata: { category: 'utils' },
          enabled: true
        }
      ];

      codeService.registerScripts(scripts);
      const utilsScripts = codeService.listScriptsByCategory('utils');

      expect(utilsScripts).toHaveLength(2);
      expect(utilsScripts.every(s => s.metadata?.category === 'utils')).toBe(true);
    });

    it('应该返回空数组当没有匹配分类的脚本时', () => {
      expect(codeService.listScriptsByCategory('non-existent')).toEqual([]);
    });
  });

  describe('searchScripts - 搜索脚本', () => {
    it('应该返回匹配搜索关键词的脚本', () => {
      const scripts = [
        {
          id: 'script-1',
          name: 'hello-world',
          type: ScriptType.SHELL,
          description: '打印Hello World',
          content: 'echo "Hello World"',
          options: {},
          enabled: true
        },
        {
          id: 'script-2',
          name: 'goodbye-world',
          type: ScriptType.POWERSHELL,
          description: '打印Goodbye World',
          content: 'Write-Host "Goodbye World"',
          options: {},
          enabled: true
        },
        {
          id: 'script-3',
          name: 'test-script',
          type: ScriptType.SHELL,
          description: '测试脚本',
          content: 'echo "test"',
          options: {},
          enabled: true
        }
      ];

      codeService.registerScripts(scripts);
      const worldScripts = codeService.searchScripts('world');

      expect(worldScripts).toHaveLength(2);
      expect(worldScripts.some(s => s.name === 'hello-world')).toBe(true);
      expect(worldScripts.some(s => s.name === 'goodbye-world')).toBe(true);
    });

    it('应该返回空数组当没有匹配的脚本时', () => {
      expect(codeService.searchScripts('non-existent')).toEqual([]);
    });
  });

  describe('hasScript - 检查脚本是否存在', () => {
    it('应该返回 true 当脚本存在时', () => {
      const script = {
        id: 'script-1',
        name: 'test-script',
        type: ScriptType.SHELL,
        description: '测试脚本',
        content: 'echo "Hello"',
        options: {},
        enabled: true
      };

      codeService.registerScript(script);
      expect(codeService.hasScript('test-script')).toBe(true);
    });

    it('应该返回 false 当脚本不存在时', () => {
      expect(codeService.hasScript('non-existent')).toBe(false);
    });
  });

  describe('registerExecutor - 注册执行器', () => {
    it('应该成功注册执行器', () => {
      const executor = {
        execute: jest.fn(),
        validate: jest.fn().mockReturnValue({ valid: true, errors: [] }),
        getSupportedTypes: jest.fn().mockReturnValue([ScriptType.SHELL])
      };

      codeService.registerExecutor(ScriptType.SHELL, executor);

      // 无法直接访问内部执行器注册表，通过执行来验证
      const script = {
        id: 'script-1',
        name: 'test-script',
        type: ScriptType.SHELL,
        description: '测试脚本',
        content: 'echo "Hello"',
        options: {},
        enabled: true
      };

      codeService.registerScript(script);
      expect(() => codeService.validateScript('test-script')).not.toThrow();
    });
  });

  describe('execute - 执行脚本', () => {
    it('应该成功执行脚本', async () => {
      const mockExecutor = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          scriptName: 'test-script',
          scriptType: ScriptType.SHELL,
          stdout: 'Hello World',
          stderr: '',
          exitCode: 0,
          executionTime: 100
        }),
        validate: jest.fn().mockReturnValue({ valid: true, errors: [] }),
        getSupportedTypes: jest.fn().mockReturnValue([ScriptType.SHELL])
      };

      const script = {
        id: 'script-1',
        name: 'test-script',
        type: ScriptType.SHELL,
        description: '测试脚本',
        content: 'echo "Hello World"',
        options: { timeout: 5000 },
        enabled: true
      };

      codeService.registerExecutor(ScriptType.SHELL, mockExecutor);
      codeService.registerScript(script);

      const result = await codeService.execute('test-script', { timeout: 3000 });

      expect(mockExecutor.execute).toHaveBeenCalledWith(script, {
        timeout: 3000 // 选项被覆盖
      });
      expect(result.success).toBe(true);
      expect(result.stdout).toBe('Hello World');
    });

    it('应该抛出 NotFoundError 当脚本不存在', async () => {
      await expect(codeService.execute('non-existent')).rejects.toThrow(NotFoundError);
    });

    it('应该抛出 CodeExecutionError 当没有对应的执行器', async () => {
      const script = {
        id: 'script-1',
        name: 'test-script',
        type: ScriptType.SHELL,
        description: '测试脚本',
        content: 'echo "Hello"',
        options: {},
        enabled: true
      };

      codeService.registerScript(script);

      await expect(codeService.execute('test-script')).rejects.toThrow(CodeExecutionError);
    });

    it('应该抛出 CodeExecutionError 当执行器执行失败', async () => {
      const mockExecutor = {
        execute: jest.fn().mockRejectedValue(new Error('Execution failed')),
        validate: jest.fn().mockReturnValue({ valid: true, errors: [] }),
        getSupportedTypes: jest.fn().mockReturnValue([ScriptType.SHELL])
      };

      const script = {
        id: 'script-1',
        name: 'test-script',
        type: ScriptType.SHELL,
        description: '测试脚本',
        content: 'echo "Hello"',
        options: {},
        enabled: true
      };

      codeService.registerExecutor(ScriptType.SHELL, mockExecutor);
      codeService.registerScript(script);

      await expect(codeService.execute('test-script')).rejects.toThrow(CodeExecutionError);
    });
  });

  describe('executeBatch - 批量执行脚本', () => {
    it('应该成功批量执行脚本', async () => {
      const mockExecutor = {
        execute: jest.fn()
          .mockResolvedValueOnce({
            success: true,
            scriptName: 'script-1',
            scriptType: ScriptType.SHELL,
            stdout: 'Result 1',
            executionTime: 100
          })
          .mockResolvedValueOnce({
            success: true,
            scriptName: 'script-2',
            scriptType: ScriptType.SHELL,
            stdout: 'Result 2',
            executionTime: 200
          }),
        validate: jest.fn().mockReturnValue({ valid: true, errors: [] }),
        getSupportedTypes: jest.fn().mockReturnValue([ScriptType.SHELL])
      };

      const scripts = [
        {
          id: 'script-1',
          name: 'script-1',
          type: ScriptType.SHELL,
          description: '脚本1',
          content: 'echo "1"',
          options: {},
          enabled: true
        },
        {
          id: 'script-2',
          name: 'script-2',
          type: ScriptType.SHELL,
          description: '脚本2',
          content: 'echo "2"',
          options: {},
          enabled: true
        }
      ];

      codeService.registerExecutor(ScriptType.SHELL, mockExecutor);
      codeService.registerScripts(scripts);

      const executions = [
        { scriptName: 'script-1', options: { timeout: 1000 } },
        { scriptName: 'script-2', options: { timeout: 2000 } }
      ];

      const results = await codeService.executeBatch(executions);

      expect(results).toHaveLength(2);
      expect(results[0]!.stdout).toBe('Result 1');
      expect(results[1]!.stdout).toBe('Result 2');
      expect(mockExecutor.execute).toHaveBeenCalledTimes(2);
    });

    it('应该处理批量执行中的部分失败', async () => {
      const mockExecutor = {
        execute: jest.fn()
          .mockResolvedValueOnce({
            success: true,
            scriptName: 'script-1',
            scriptType: ScriptType.SHELL,
            stdout: 'Success',
            executionTime: 100
          })
          .mockRejectedValueOnce(new Error('Execution failed')),
        validate: jest.fn().mockReturnValue({ valid: true, errors: [] }),
        getSupportedTypes: jest.fn().mockReturnValue([ScriptType.SHELL])
      };

      const scripts = [
        {
          id: 'script-1',
          name: 'script-1',
          type: ScriptType.SHELL,
          description: '脚本1',
          content: 'echo "1"',
          options: {},
          enabled: true
        },
        {
          id: 'script-2',
          name: 'script-2',
          type: ScriptType.SHELL,
          description: '脚本2',
          content: 'echo "2"',
          options: {},
          enabled: true
        }
      ];

      codeService.registerExecutor(ScriptType.SHELL, mockExecutor);
      codeService.registerScripts(scripts);

      const executions = [
        { scriptName: 'script-1' },
        { scriptName: 'script-2' }
      ];

      await expect(codeService.executeBatch(executions)).rejects.toThrow(CodeExecutionError);
    });
  });

  describe('validateScript - 验证脚本', () => {
    it('应该返回有效的验证结果', () => {
      const mockExecutor = {
        execute: jest.fn(),
        validate: jest.fn().mockReturnValue({ valid: true, errors: [] }),
        getSupportedTypes: jest.fn().mockReturnValue([ScriptType.SHELL])
      };

      const script = {
        id: 'script-1',
        name: 'test-script',
        type: ScriptType.SHELL,
        description: '测试脚本',
        content: 'echo "Hello"',
        options: {},
        enabled: true
      };

      codeService.registerExecutor(ScriptType.SHELL, mockExecutor);
      codeService.registerScript(script);

      const result = codeService.validateScript('test-script');

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(mockExecutor.validate).toHaveBeenCalledWith(script);
    });

    it('应该返回无效的验证结果当执行器不存在', () => {
      const script = {
        id: 'script-1',
        name: 'test-script',
        type: ScriptType.SHELL,
        description: '测试脚本',
        content: 'echo "Hello"',
        options: {},
        enabled: true
      };

      codeService.registerScript(script);

      const result = codeService.validateScript('test-script');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(`No executor found for script type '${ScriptType.SHELL}'`);
    });

    it('应该返回无效的验证结果当脚本不存在', () => {
      const result = codeService.validateScript('non-existent');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('clearScripts - 清空脚本', () => {
    it('应该清空所有脚本', () => {
      const scripts = [
        {
          id: 'script-1',
          name: 'script-1',
          type: ScriptType.SHELL,
          description: '脚本1',
          content: 'echo "1"',
          options: {},
          enabled: true
        },
        {
          id: 'script-2',
          name: 'script-2',
          type: ScriptType.POWERSHELL,
          description: '脚本2',
          content: 'Write-Host "2"',
          options: {},
          enabled: true
        }
      ];

      codeService.registerScripts(scripts);
      expect(codeService.listScripts()).toHaveLength(2);

      codeService.clearScripts();
      expect(codeService.listScripts()).toHaveLength(0);
    });
  });

  describe('clearExecutors - 清空执行器', () => {
    it('应该清空所有执行器', () => {
      const executor = {
        execute: jest.fn(),
        validate: jest.fn().mockReturnValue({ valid: true, errors: [] }),
        getSupportedTypes: jest.fn().mockReturnValue([ScriptType.SHELL])
      };

      codeService.registerExecutor(ScriptType.SHELL, executor);

      // 通过验证来间接测试执行器是否被清空
      const script = {
        id: 'script-1',
        name: 'test-script',
        type: ScriptType.SHELL,
        description: '测试脚本',
        content: 'echo "Hello"',
        options: {},
        enabled: true
      };

      codeService.registerScript(script);

      codeService.clearExecutors();
      const result = codeService.validateScript('test-script');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(`No executor found for script type '${ScriptType.SHELL}'`);
    });
  });

  describe('updateScript - 更新脚本', () => {
    it('应该成功更新脚本', () => {
      const originalScript = {
        id: 'script-1',
        name: 'test-script',
        type: ScriptType.SHELL,
        description: '原始描述',
        content: 'echo "original"',
        options: { timeout: 1000 },
        enabled: true
      };

      codeService.registerScript(originalScript);

      const updates = {
        description: '更新描述',
        content: 'echo "updated"',
        options: { timeout: 2000 }
      };

      codeService.updateScript('test-script', updates);

      const updatedScript = codeService.getScript('test-script');
      expect(updatedScript.description).toBe('更新描述');
      expect(updatedScript.content).toBe('echo "updated"');
      expect(updatedScript.options.timeout).toBe(2000);
      // 确保其他字段保持不变
      expect(updatedScript.id).toBe('script-1');
      expect(updatedScript.name).toBe('test-script');
      expect(updatedScript.type).toBe(ScriptType.SHELL);
    });

    it('应该抛出 NotFoundError 当更新不存在的脚本', () => {
      expect(() => {
        codeService.updateScript('non-existent', { description: 'new' });
      }).toThrow(NotFoundError);
    });
  });
});
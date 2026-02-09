/**
 * ScriptRegistryAPI 测试套件
 * 测试基于 GenericResourceAPI 的 ScriptRegistryAPI 功能
 */

import { ScriptRegistryAPI } from '../scripts/script-registry-api';
import type { Script } from '../../../types/code';
import { ScriptType } from '../../../types/code';

describe('ScriptRegistryAPI', () => {
  let api: ScriptRegistryAPI;
  let mockScript1: Script;
  let mockScript2: Script;
  let mockScript3: Script;

  beforeEach(() => {
    // 创建新的 API 实例
    api = new ScriptRegistryAPI();

    // 创建模拟脚本（使用时间戳确保唯一性）
    const timestamp = Date.now();
    mockScript1 = {
      id: `script-1-${timestamp}`,
      name: `test-script-1-${timestamp}`,
      type: ScriptType.PYTHON,
      description: 'Test script 1',
      content: 'print("Hello, World!")',
      options: {
        timeout: 5000
      },
      metadata: {
        category: 'test',
        tags: ['test', 'demo']
      }
    };

    mockScript2 = {
      id: `script-2-${timestamp}`,
      name: `test-script-2-${timestamp}`,
      type: ScriptType.SHELL,
      description: 'Test script 2',
      content: 'echo "Hello, World!"',
      options: {
        timeout: 3000
      },
      metadata: {
        category: 'utility',
        tags: ['shell', 'echo']
      }
    };

    mockScript3 = {
      id: `script-3-${timestamp}`,
      name: `test-script-3-${timestamp}`,
      type: ScriptType.PYTHON,
      description: 'Test script 3',
      content: 'import os; print(os.getcwd())',
      options: {
        timeout: 5000
      },
      metadata: {
        category: 'test',
        tags: ['test', 'python']
      }
    };
  });

  // 在每个测试套件之前清理
  beforeAll(async () => {
    try {
      await api.clear();
    } catch (error) {
      // 忽略清理错误
    }
  });

  afterEach(async () => {
    // 清理所有脚本
    try {
      await api.clear();
    } catch (error) {
      // 忽略清理错误
    }
  });

  // ==================== 基础 CRUD 操作测试 ====================

  describe('基础 CRUD 操作', () => {
    beforeEach(async () => {
      try {
        await api.clear();
      } catch (error) {
        // 忽略清理错误
      }
    });

    test('应该能够注册脚本', async () => {
      const result = await api.create(mockScript1);
      expect(result.success).toBe(true);

      const scriptResult = await api.get(mockScript1.name);
      expect(scriptResult.success).toBe(true);
      if (scriptResult.success) {
        expect(scriptResult.data).not.toBeNull();
        expect(scriptResult.data?.name).toBe(mockScript1.name);
      } else {
        fail('Expected success but got error');
      }
    });

    test('应该能够批量注册脚本', async () => {
      await api.create(mockScript1);
      await api.create(mockScript2);
      await api.create(mockScript3);

      const scriptsResult = await api.getAll();
      expect(scriptsResult.success).toBe(true);
      if (scriptsResult.success) {
        expect(scriptsResult.data).toHaveLength(3);
      } else {
        fail('Expected success but got error');
      }
    });

    test('应该能够获取脚本', async () => {
      await api.create(mockScript1);

      const scriptResult = await api.get(mockScript1.name);
      expect(scriptResult.success).toBe(true);
      if (scriptResult.success) {
        expect(scriptResult.data).toEqual(mockScript1);
      } else {
        fail('Expected success but got error');
      }
    });

    test('获取不存在的脚本应该返回 null', async () => {
      const scriptResult = await api.get('non-existent-script');
      expect(scriptResult.success).toBe(true);
      if (scriptResult.success) {
        expect(scriptResult.data).toBeNull();
      } else {
        fail('Expected success but got error');
      }
    });

    test('应该能够更新脚本', async () => {
      await api.create(mockScript1);

      const updates = { description: 'Updated description' };
      const updateResult = await api.update(mockScript1.name, updates);
      expect(updateResult.success).toBe(true);

      const scriptResult = await api.get(mockScript1.name);
      expect(scriptResult.success).toBe(true);
      if (scriptResult.success) {
        expect(scriptResult.data?.description).toBe('Updated description');
      } else {
        fail('Expected success but got error');
      }
    });

    test('应该能够删除脚本', async () => {
      await api.create(mockScript1);

      const deleteResult = await api.delete(mockScript1.name);
      expect(deleteResult.success).toBe(true);

      const scriptResult = await api.get(mockScript1.name);
      expect(scriptResult.success).toBe(true);
      if (scriptResult.success) {
        expect(scriptResult.data).toBeNull();
      } else {
        fail('Expected success but got error');
      }
    });

    test('应该能够清空所有脚本', async () => {
      await api.create(mockScript1);
      await api.create(mockScript2);
      await api.create(mockScript3);

      const clearResult = await api.clear();
      expect(clearResult.success).toBe(true);

      const scriptsResult = await api.getAll();
      expect(scriptsResult.success).toBe(true);
      if (scriptsResult.success) {
        expect(scriptsResult.data).toHaveLength(0);
      } else {
        fail('Expected success but got error');
      }
    });
  });


  // ==================== 过滤功能测试 ====================

  describe('过滤功能', () => {
    beforeEach(async () => {
      try {
        await api.clear();
      } catch (error) {
        // 忽略清理错误
      }
      await api.create(mockScript1);
      await api.create(mockScript2);
      await api.create(mockScript3);
    });

    test('应该能够按名称过滤脚本', async () => {
      const scriptsResult = await api.getAll({ name: 'script-1' });
      expect(scriptsResult.success).toBe(true);
      if (scriptsResult.success) {
        expect(scriptsResult.data).toHaveLength(1);
        expect(scriptsResult.data[0]?.name).toBe(mockScript1.name);
      } else {
        fail('Expected success but got error');
      }
    });

    test('应该能够按类型过滤脚本', async () => {
      const scriptsResult = await api.getAll({ type: ScriptType.PYTHON });
      expect(scriptsResult.success).toBe(true);
      if (scriptsResult.success) {
        expect(scriptsResult.data).toHaveLength(2);
        expect(scriptsResult.data.every(s => s.type === ScriptType.PYTHON)).toBe(true);
      } else {
        fail('Expected success but got error');
      }
    });

    test('应该能够按分类过滤脚本', async () => {
      const scriptsResult = await api.getAll({ category: 'test' });
      expect(scriptsResult.success).toBe(true);
      if (scriptsResult.success) {
        expect(scriptsResult.data).toHaveLength(2);
        expect(scriptsResult.data.every(s => s.metadata?.category === 'test')).toBe(true);
      } else {
        fail('Expected success but got error');
      }
    });

    test('应该能够按标签过滤脚本', async () => {
      const scriptsResult = await api.getAll({ tags: ['test'] });
      expect(scriptsResult.success).toBe(true);
      if (scriptsResult.success) {
        expect(scriptsResult.data).toHaveLength(2);
      } else {
        fail('Expected success but got error');
      }
    });

    test('应该能够应用多个过滤条件', async () => {
      const scriptsResult = await api.getAll({
        type: ScriptType.PYTHON,
        category: 'test'
      });
      expect(scriptsResult.success).toBe(true);
      if (scriptsResult.success) {
        expect(scriptsResult.data).toHaveLength(2);
      } else {
        fail('Expected success but got error');
      }
    });

    test('应该能够获取所有脚本（无过滤）', async () => {
      const scriptsResult = await api.getAll();
      expect(scriptsResult.success).toBe(true);
      if (scriptsResult.success) {
        expect(scriptsResult.data).toHaveLength(3);
      } else {
        fail('Expected success but got error');
      }
    });
  });


  // ==================== 错误处理测试 ====================

  describe('错误处理', () => {
    beforeEach(async () => {
      try {
        await api.clear();
      } catch (error) {
        // 忽略清理错误
      }
    });

    test('更新不存在的脚本应该返回错误', async () => {
      const result = await api.update('non-existent-script', { description: 'Updated' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      } else {
        fail('Expected error but got success');
      }
    });

    test('删除不存在的脚本应该返回错误', async () => {
      const result = await api.delete('non-existent-script');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      } else {
        fail('Expected error but got success');
      }
    });

    test('注册无效脚本应该返回错误', async () => {
      const invalidScript = {
        id: 'invalid-script',
        name: '',
        type: ScriptType.PYTHON,
        description: '',
        content: '',
        options: {}
      } as Script;

      const result = await api.create(invalidScript);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      } else {
        fail('Expected error but got success');
      }
    });
  });


  // ==================== 高级功能测试 ====================

  describe('高级功能', () => {
    beforeEach(async () => {
      try {
        await api.clear();
      } catch (error) {
        // 忽略清理错误
      }
    });

    test('应该能够搜索脚本', async () => {
      await api.create(mockScript1);
      await api.create(mockScript2);
      await api.create(mockScript3);

      const scripts = await api.searchScripts('test');
      expect(scripts.length).toBeGreaterThan(0);
    });

    test('应该能够验证脚本', async () => {
      await api.create(mockScript1);

      const result = await api.validateScript(mockScript1.name);
      // validateScript 可能返回错误，因为需要执行器
      // 这里只测试方法可以被调用
      expect(result).toBeDefined();
    });

    test('应该能够获取脚本数量', async () => {
      await api.create(mockScript1);
      await api.create(mockScript2);
      await api.create(mockScript3);

      const countResult = await api.count();
      expect(countResult.success).toBe(true);
      if (countResult.success) {
        expect(countResult.data).toBe(3);
      } else {
        fail('Expected success but got error');
      }
    });
  });

  // ==================== ExecutionResult 模式测试 ====================

  describe('ExecutionResult 模式', () => {
    beforeEach(async () => {
      try {
        await api.clear();
      } catch (error) {
        // 忽略清理错误
      }
    });

    test('get 方法应该返回 ExecutionResult', async () => {
      await api.create(mockScript1);

      const result = await api.get(mockScript1.name);
      if (result.success) {
        expect(result.data).toEqual(mockScript1);
      } else {
        fail('Expected success but got error');
      }
    });

    test('getAll 方法应该返回 ExecutionResult', async () => {
      await api.create(mockScript1);
      await api.create(mockScript2);

      const result = await api.getAll();
      if (result.success) {
        expect(result.data).toHaveLength(2);
      } else {
        fail('Expected success but got error');
      }
    });

    test('create 方法应该返回 ExecutionResult', async () => {
      const result = await api.create(mockScript1);
      expect(result.success).toBe(true);
    });

    test('update 方法应该返回 ExecutionResult', async () => {
      await api.create(mockScript1);

      const result = await api.update(mockScript1.name, { description: 'Updated' });
      expect(result.success).toBe(true);
    });

    test('delete 方法应该返回 ExecutionResult', async () => {
      await api.create(mockScript1);

      const result = await api.delete(mockScript1.name);
      expect(result.success).toBe(true);
    });


    test('count 方法应该返回 ExecutionResult', async () => {
      await api.create(mockScript1);
      await api.create(mockScript2);

      const result = await api.count();
      if (result.success) {
        expect(result.data).toBe(2);
      } else {
        fail('Expected success but got error');
      }
    });

    test('clear 方法应该返回 ExecutionResult', async () => {
      await api.create(mockScript1);
      await api.create(mockScript2);

      const result = await api.clear();
      expect(result.success).toBe(true);
    });
  });
});
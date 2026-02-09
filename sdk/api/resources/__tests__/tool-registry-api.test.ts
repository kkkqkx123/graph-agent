/**
 * ToolRegistryAPI V2 测试套件
 * 测试重构后的 ToolRegistryAPI 功能
 */

import { ToolRegistryAPI } from '../tools/tool-registry-api';
import type { Tool } from '../../../types/tool';
import { ToolType } from '../../../types/tool';

describe('ToolRegistryAPI V2', () => {
  let api: ToolRegistryAPI;
  let mockTool1: Tool;
  let mockTool2: Tool;
  let mockTool3: Tool;

  beforeEach(() => {
    // 创建新的 API 实例
    api = new ToolRegistryAPI();

    // 创建模拟工具
    mockTool1 = {
      id: 'tool-1',
      name: 'test-tool-1',
      type: ToolType.STATELESS,
      description: 'Test tool 1',
      parameters: {
        properties: {
          input: { type: 'string' }
        },
        required: []
      },
      metadata: {
        category: 'test',
        tags: ['test', 'demo']
      },
      config: {
        execute: async (params: Record<string, any>) => {
          return { result: `processed: ${params['input']}` };
        }
      }
    };

    mockTool2 = {
      id: 'tool-2',
      name: 'test-tool-2',
      type: ToolType.REST,
      description: 'Test tool 2',
      parameters: {
        properties: {
          url: { type: 'string' }
        },
        required: []
      },
      metadata: {
        category: 'api',
        tags: ['rest', 'http']
      }
    };

    mockTool3 = {
      id: 'tool-3',
      name: 'test-tool-3',
      type: ToolType.STATELESS,
      description: 'Test tool 3',
      parameters: {
        properties: {
          data: { type: 'object' }
        },
        required: []
      },
      metadata: {
        category: 'test',
        tags: ['test', 'native']
      },
      config: {
        execute: async (params: Record<string, any>) => {
          return { result: `data processed` };
        }
      }
    };
  });

  afterEach(async () => {
    // 清理所有工具
    await api.clear();
  });

  // ==================== 基础 CRUD 操作测试 ====================

  describe('基础 CRUD 操作', () => {
    test('应该能够注册工具', async () => {
      await api.create(mockTool1);

      const result = await api.get(mockTool1.name);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toBeNull();
        expect(result.data?.name).toBe(mockTool1.name);
      }
    });

    test('应该能够批量注册工具', async () => {
      await api.create(mockTool1);
      await api.create(mockTool2);
      await api.create(mockTool3);

      const result = await api.getAll();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
      }
    });

    test('应该能够获取工具', async () => {
      await api.create(mockTool1);

      const result = await api.get(mockTool1.name);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockTool1);
      }
    });

    test('获取不存在的工具应该返回错误', async () => {
      const result = await api.get('non-existent-tool');
      expect(result.success).toBe(false);
    });

    test('应该能够更新工具', async () => {
      await api.create(mockTool1);

      const updates = { description: 'Updated description' };
      const result = await api.update(mockTool1.name, updates);
      expect(result.success).toBe(true);

      const getResult = await api.get(mockTool1.name);
      if (getResult.success) {
        expect(getResult.data?.description).toBe('Updated description');
      }
    });

    test('应该能够删除工具', async () => {
      await api.create(mockTool1);

      const result = await api.delete(mockTool1.name);
      expect(result.success).toBe(true);

      const getResult = await api.get(mockTool1.name);
      expect(getResult.success).toBe(false);
    });

    test('应该能够清空所有工具', async () => {
      await api.create(mockTool1);
      await api.create(mockTool2);
      await api.create(mockTool3);

      const result = await api.clear();
      expect(result.success).toBe(true);

      const getAllResult = await api.getAll();
      if (getAllResult.success) {
        expect(getAllResult.data).toHaveLength(0);
      }
    });
  });


  // ==================== 过滤功能测试 ====================

  describe('过滤功能', () => {
    beforeEach(async () => {
      await api.create(mockTool1);
      await api.create(mockTool2);
      await api.create(mockTool3);
    });

    test('应该能够按名称过滤工具', async () => {
      const result = await api.getAll({ name: 'tool-1' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]?.name).toBe(mockTool1.name);
      }
    });

    test('应该能够按类型过滤工具', async () => {
      const result = await api.getAll({ type: ToolType.STATELESS });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data.every((t: Tool) => t.type === ToolType.STATELESS)).toBe(true);
      }
    });

    test('应该能够按分类过滤工具', async () => {
      const result = await api.getAll({ category: 'test' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data.every((t: Tool) => t.metadata?.category === 'test')).toBe(true);
      }
    });

    test('应该能够按标签过滤工具', async () => {
      const result = await api.getAll({ tags: ['test'] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });

    test('应该能够应用多个过滤条件', async () => {
      const result = await api.getAll({
        type: ToolType.STATELESS,
        category: 'test'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });

    test('应该能够获取所有工具（无过滤）', async () => {
      const result = await api.getAll();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
      }
    });
  });

  // ==================== 向后兼容性测试 ====================

  describe('向后兼容性', () => {
    test('create 方法应该正常工作', async () => {
      const result = await api.create(mockTool1);
      expect(result.success).toBe(true);
      if (result.success) {
        const getResult = await api.get(mockTool1.name);
        expect(getResult.success).toBe(true);
      }
    });

    test('批量创建方法应该正常工作', async () => {
      await api.create(mockTool1);
      await api.create(mockTool2);

      const result = await api.getAll();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });

    test('delete 方法应该正常工作', async () => {
      await api.create(mockTool1);
      const result = await api.delete(mockTool1.name);
      expect(result.success).toBe(true);

      const getResult = await api.get(mockTool1.name);
      expect(getResult.success).toBe(false);
    });

    test('get 方法应该正常工作', async () => {
      await api.create(mockTool1);
      const result = await api.get(mockTool1.name);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockTool1);
      }
    });

    test('getAll 方法应该正常工作', async () => {
      await api.create(mockTool1);
      await api.create(mockTool2);

      const result = await api.getAll();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });

    test('按类型过滤应该正常工作', async () => {
      await api.create(mockTool1);
      await api.create(mockTool2);
      await api.create(mockTool3);

      const result = await api.getAll({ type: ToolType.STATELESS });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });

    test('按分类过滤应该正常工作', async () => {
      await api.create(mockTool1);
      await api.create(mockTool2);
      await api.create(mockTool3);

      const result = await api.getAll({ category: 'test' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });

    test('has 方法应该正常工作', async () => {
      await api.create(mockTool1);
      const result = await api.has(mockTool1.name);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    test('update 方法应该正常工作', async () => {
      await api.create(mockTool1);
      const result = await api.update(mockTool1.name, { description: 'Updated' });
      expect(result.success).toBe(true);

      const getResult = await api.get(mockTool1.name);
      if (getResult.success) {
        expect(getResult.data?.description).toBe('Updated');
      }
    });

    test('count 方法应该正常工作', async () => {
      await api.create(mockTool1);
      await api.create(mockTool2);
      await api.create(mockTool3);

      const result = await api.count();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(3);
      }
    });

    test('clear 方法应该正常工作', async () => {
      await api.create(mockTool1);
      await api.create(mockTool2);

      const result = await api.clear();
      expect(result.success).toBe(true);

      const getAllResult = await api.getAll();
      if (getAllResult.success) {
        expect(getAllResult.data).toHaveLength(0);
      }
    });

    test('getService 方法应该返回 ToolService 实例', () => {
      const service = api.getService();
      expect(service).toBeDefined();
    });
  });

  // ==================== 错误处理测试 ====================

  describe('错误处理', () => {
    test('更新不存在的工具应该返回错误', async () => {
      const result = await api.update('non-existent-tool', { description: 'Updated' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    test('删除不存在的工具应该返回错误', async () => {
      const result = await api.delete('non-existent-tool');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    test('注册无效工具应该返回错误', async () => {
      const invalidTool = {
        id: 'invalid-tool',
        name: '',
        type: ToolType.STATELESS,
        description: '',
        parameters: {
          properties: {},
          required: []
        }
      } as Tool;

      const result = await api.create(invalidTool);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  // ==================== 配置选项测试 ====================


  // ==================== 高级功能测试 ====================

  describe('高级功能', () => {
    test('应该能够搜索工具', async () => {
      await api.create(mockTool1);
      await api.create(mockTool2);
      await api.create(mockTool3);

      const tools = await api.searchTools('test');
      expect(tools.length).toBeGreaterThan(0);
    });

    test('应该能够验证工具参数', async () => {
      await api.create(mockTool1);

      const result = await api.validateToolParameters(mockTool1.name, { input: 'test' });
      expect(result.valid).toBe(true);
    });

    test('应该能够检查工具是否存在', async () => {
      await api.create(mockTool1);

      const result = await api.get(mockTool1.name);
      expect(result.success).toBe(true);

      const notExistResult = await api.get('non-existent-tool');
      expect(notExistResult.success).toBe(false);
    });

    test('应该能够获取工具数量', async () => {
      await api.create(mockTool1);
      await api.create(mockTool2);
      await api.create(mockTool3);

      const result = await api.count();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(3);
      }
    });
  });

  // ==================== ExecutionResult 模式测试 ====================

  describe('ExecutionResult 模式', () => {
    test('get 方法应该返回 ExecutionResult', async () => {
      await api.create(mockTool1);

      const result = await api.get(mockTool1.name);
      if (result.success) {
        expect(result.data).toEqual(mockTool1);
      } else {
        fail('Expected success but got error');
      }
    });

    test('getAll 方法应该返回 ExecutionResult', async () => {
      await api.create(mockTool1);
      await api.create(mockTool2);

      const result = await api.getAll();
      if (result.success) {
        expect(result.data).toHaveLength(2);
      } else {
        fail('Expected success but got error');
      }
    });

    test('create 方法应该返回 ExecutionResult', async () => {
      const result = await api.create(mockTool1);
      expect(result.success).toBe(true);
    });

    test('update 方法应该返回 ExecutionResult', async () => {
      await api.create(mockTool1);

      const result = await api.update(mockTool1.name, { description: 'Updated' });
      expect(result.success).toBe(true);
    });

    test('delete 方法应该返回 ExecutionResult', async () => {
      await api.create(mockTool1);

      const result = await api.delete(mockTool1.name);
      expect(result.success).toBe(true);
    });

    test('count 方法应该返回 ExecutionResult', async () => {
      await api.create(mockTool1);
      await api.create(mockTool2);

      const result = await api.count();
      if (result.success) {
        expect(result.data).toBe(2);
      } else {
        fail('Expected success but got error');
      }
    });

    test('clear 方法应该返回 ExecutionResult', async () => {
      await api.create(mockTool1);
      await api.create(mockTool2);

      const result = await api.clear();
      expect(result.success).toBe(true);
    });
  });
});
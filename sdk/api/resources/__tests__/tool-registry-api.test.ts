/**
 * ToolRegistryAPI V2 测试套件
 * 测试重构后的 ToolRegistryAPI 功能
 */

import { ToolRegistryAPI } from '../tools/tool-registry-api';
import type { Tool } from '../../../types/tool';
import { ToolType } from '../../../types/tool';
import type { ToolFilter } from '../../types/tools-types';
import { NotFoundError } from '../../../types/errors';

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
    await api.clearTools();
  });

  // ==================== 基础 CRUD 操作测试 ====================

  describe('基础 CRUD 操作', () => {
    test('应该能够注册工具', async () => {
      await api.registerTool(mockTool1);
      
      const tool = await api.getTool(mockTool1.name);
      expect(tool).not.toBeNull();
      expect(tool?.name).toBe(mockTool1.name);
    });

    test('应该能够批量注册工具', async () => {
      await api.registerTools([mockTool1, mockTool2, mockTool3]);
      
      const tools = await api.getTools();
      expect(tools).toHaveLength(3);
    });

    test('应该能够获取工具', async () => {
      await api.registerTool(mockTool1);
      
      const tool = await api.getTool(mockTool1.name);
      expect(tool).toEqual(mockTool1);
    });

    test('获取不存在的工具应该返回 null', async () => {
      const tool = await api.getTool('non-existent-tool');
      expect(tool).toBeNull();
    });

    test('应该能够更新工具', async () => {
      await api.registerTool(mockTool1);
      
      const updates = { description: 'Updated description' };
      await api.updateTool(mockTool1.name, updates);
      
      const tool = await api.getTool(mockTool1.name);
      expect(tool?.description).toBe('Updated description');
    });

    test('应该能够删除工具', async () => {
      await api.registerTool(mockTool1);
      
      await api.unregisterTool(mockTool1.name);
      
      const tool = await api.getTool(mockTool1.name);
      expect(tool).toBeNull();
    });

    test('应该能够清空所有工具', async () => {
      await api.registerTools([mockTool1, mockTool2, mockTool3]);
      
      await api.clearTools();
      
      const tools = await api.getTools();
      expect(tools).toHaveLength(0);
    });
  });


  // ==================== 过滤功能测试 ====================

  describe('过滤功能', () => {
    beforeEach(async () => {
      await api.registerTools([mockTool1, mockTool2, mockTool3]);
    });

    test('应该能够按名称过滤工具', async () => {
      const tools = await api.getTools({ name: 'tool-1' });
      expect(tools).toHaveLength(1);
      expect(tools[0]?.name).toBe(mockTool1.name);
    });

    test('应该能够按类型过滤工具', async () => {
      const tools = await api.getTools({ type: ToolType.STATELESS });
      expect(tools).toHaveLength(2);
      expect(tools.every(t => t.type === ToolType.STATELESS)).toBe(true);
    });

    test('应该能够按分类过滤工具', async () => {
      const tools = await api.getTools({ category: 'test' });
      expect(tools).toHaveLength(2);
      expect(tools.every(t => t.metadata?.category === 'test')).toBe(true);
    });

    test('应该能够按标签过滤工具', async () => {
      const tools = await api.getTools({ tags: ['test'] });
      expect(tools).toHaveLength(2);
    });

    test('应该能够应用多个过滤条件', async () => {
      const tools = await api.getTools({
        type: ToolType.STATELESS,
        category: 'test'
      });
      expect(tools).toHaveLength(2);
    });

    test('应该能够获取所有工具（无过滤）', async () => {
      const tools = await api.getTools();
      expect(tools).toHaveLength(3);
    });
  });

  // ==================== 向后兼容性测试 ====================

  describe('向后兼容性', () => {
    test('registerTool 方法应该正常工作', async () => {
      await api.registerTool(mockTool1);
      const tool = await api.getTool(mockTool1.name);
      expect(tool).not.toBeNull();
    });

    test('registerTools 方法应该正常工作', async () => {
      await api.registerTools([mockTool1, mockTool2]);
      const tools = await api.getTools();
      expect(tools).toHaveLength(2);
    });

    test('unregisterTool 方法应该正常工作', async () => {
      await api.registerTool(mockTool1);
      await api.unregisterTool(mockTool1.name);
      const tool = await api.getTool(mockTool1.name);
      expect(tool).toBeNull();
    });

    test('getTool 方法应该正常工作', async () => {
      await api.registerTool(mockTool1);
      const tool = await api.getTool(mockTool1.name);
      expect(tool).toEqual(mockTool1);
    });

    test('getTools 方法应该正常工作', async () => {
      await api.registerTools([mockTool1, mockTool2]);
      const tools = await api.getTools();
      expect(tools).toHaveLength(2);
    });

    test('getToolsByType 方法应该正常工作', async () => {
      await api.registerTools([mockTool1, mockTool2, mockTool3]);
      const tools = await api.getToolsByType(ToolType.STATELESS);
      expect(tools).toHaveLength(2);
    });

    test('getToolsByCategory 方法应该正常工作', async () => {
      await api.registerTools([mockTool1, mockTool2, mockTool3]);
      const tools = await api.getToolsByCategory('test');
      expect(tools).toHaveLength(2);
    });

    test('hasTool 方法应该正常工作', async () => {
      await api.registerTool(mockTool1);
      const has = await api.hasTool(mockTool1.name);
      expect(has).toBe(true);
    });

    test('updateTool 方法应该正常工作', async () => {
      await api.registerTool(mockTool1);
      await api.updateTool(mockTool1.name, { description: 'Updated' });
      const tool = await api.getTool(mockTool1.name);
      expect(tool?.description).toBe('Updated');
    });

    test('getToolCount 方法应该正常工作', async () => {
      await api.registerTools([mockTool1, mockTool2, mockTool3]);
      const count = await api.getToolCount();
      expect(count).toBe(3);
    });

    test('clearTools 方法应该正常工作', async () => {
      await api.registerTools([mockTool1, mockTool2]);
      await api.clearTools();
      const tools = await api.getTools();
      expect(tools).toHaveLength(0);
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
      if (!result.success) {
        expect(result.error).toBeDefined();
      } else {
        fail('Expected error but got success');
      }
    });

    test('删除不存在的工具应该返回错误', async () => {
      const result = await api.delete('non-existent-tool');
      if (!result.success) {
        expect(result.error).toBeDefined();
      } else {
        fail('Expected error but got success');
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
      if (!result.success) {
        expect(result.error).toBeDefined();
      } else {
        fail('Expected error but got success');
      }
    });

    test('向后兼容方法应该抛出错误', async () => {
      await expect(api.updateTool('non-existent-tool', { description: 'Updated' }))
        .rejects.toThrow();
    });
  });

  // ==================== 配置选项测试 ====================


  // ==================== 高级功能测试 ====================

  describe('高级功能', () => {
    test('应该能够搜索工具', async () => {
      await api.registerTools([mockTool1, mockTool2, mockTool3]);
      
      const tools = await api.searchTools('test');
      expect(tools.length).toBeGreaterThan(0);
    });

    test('应该能够验证工具参数', async () => {
      await api.registerTool(mockTool1);
      
      const result = await api.validateToolParameters(mockTool1.name, { input: 'test' });
      expect(result.valid).toBe(true);
    });

    test('应该能够检查工具是否存在', async () => {
      await api.registerTool(mockTool1);
      
      const has = await api.hasTool(mockTool1.name);
      expect(has).toBe(true);
      
      const notHas = await api.hasTool('non-existent-tool');
      expect(notHas).toBe(false);
    });

    test('应该能够获取工具数量', async () => {
      await api.registerTools([mockTool1, mockTool2, mockTool3]);
      
      const count = await api.getToolCount();
      expect(count).toBe(3);
    });
  });

  // ==================== ExecutionResult 模式测试 ====================

  describe('ExecutionResult 模式', () => {
    test('get 方法应该返回 ExecutionResult', async () => {
      await api.registerTool(mockTool1);
      
      const result = await api.get(mockTool1.name);
      if (result.success) {
        expect(result.data).toEqual(mockTool1);
      } else {
        fail('Expected success but got error');
      }
    });

    test('getAll 方法应该返回 ExecutionResult', async () => {
      await api.registerTools([mockTool1, mockTool2]);
      
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
      await api.registerTool(mockTool1);
      
      const result = await api.update(mockTool1.name, { description: 'Updated' });
      if (!result.success) {
        console.log('Update failed:', result.error);
      }
      expect(result.success).toBe(true);
    });

    test('delete 方法应该返回 ExecutionResult', async () => {
      await api.registerTool(mockTool1);
      
      const result = await api.delete(mockTool1.name);
      expect(result.success).toBe(true);
    });

    test('has 方法应该返回 ExecutionResult', async () => {
      await api.registerTool(mockTool1);
      
      const result = await api.has(mockTool1.name);
      if (result.success) {
        expect(result.data).toBe(true);
      } else {
        fail('Expected success but got error');
      }
    });

    test('count 方法应该返回 ExecutionResult', async () => {
      await api.registerTools([mockTool1, mockTool2]);
      
      const result = await api.count();
      if (result.success) {
        expect(result.data).toBe(2);
      } else {
        fail('Expected success but got error');
      }
    });

    test('clear 方法应该返回 ExecutionResult', async () => {
      await api.registerTools([mockTool1, mockTool2]);
      
      const result = await api.clear();
      expect(result.success).toBe(true);
    });
  });
});
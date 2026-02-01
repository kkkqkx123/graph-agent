/**
 * WorkflowRegistry 单元测试
 */

import { WorkflowRegistry } from '../workflow-registry';
import { NodeType } from '../../../types/node';
import { EdgeType } from '../../../types/edge';
import { ValidationError, NotFoundError } from '../../../types/errors';

describe('WorkflowRegistry', () => {
  let registry: WorkflowRegistry;

  beforeEach(() => {
    // 创建新的 WorkflowRegistry 实例以避免测试间干扰
    // 禁用预处理以简化测试
    registry = new WorkflowRegistry({
      enableVersioning: true,
      enablePreprocessing: false,
      maxVersions: 10,
      maxRecursionDepth: 10
    });
  });

  const createValidWorkflow = (id: string, name: string) => ({
    id,
    name,
    version: '1.0.0',
    description: 'Test workflow',
    nodes: [
      {
        id: 'start-node',
        type: NodeType.START,
        name: 'Start',
        config: {},
        outgoingEdgeIds: ['edge-1'],
        incomingEdgeIds: []
      },
      {
        id: 'end-node',
        type: NodeType.END,
        name: 'End',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: ['edge-1']
      }
    ],
    edges: [
      {
        id: 'edge-1',
        sourceNodeId: 'start-node',
        targetNodeId: 'end-node',
        type: EdgeType.DEFAULT,
        condition: undefined
      }
    ],
    variables: [],
    triggers: [],
    config: {
      timeout: 60000,
      maxSteps: 1000
    },
    metadata: {
      author: 'test-author',
      tags: ['test', 'workflow'],
      category: 'test'
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  describe('register - 注册工作流定义', () => {
    it('应该成功注册有效的工作流定义', () => {
      const workflow = createValidWorkflow('workflow-1', 'Test Workflow');

      expect(() => registry.register(workflow)).not.toThrow();
      expect(registry.has('workflow-1')).toBe(true);
    });

    it('应该抛出 ValidationError 当工作流 ID 已存在', () => {
      const workflow = createValidWorkflow('workflow-1', 'Test Workflow');

      registry.register(workflow);

      expect(() => {
        registry.register(workflow);
      }).toThrow(ValidationError);
      expect(() => {
        registry.register(workflow);
      }).toThrow('already exists');
    });

    it('应该抛出 ValidationError 当工作流验证失败', () => {
      const invalidWorkflow = {
        id: 'workflow-1',
        name: 'Invalid Workflow',
        nodes: [],
        edges: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      } as any;

      expect(() => {
        registry.register(invalidWorkflow);
      }).toThrow(ValidationError);
    });

    it('应该抛出 ValidationError 当工作流 ID 为空', () => {
      const workflow = createValidWorkflow('', 'Test Workflow');

      expect(() => {
        registry.register(workflow);
      }).toThrow(ValidationError);
    });

    it('应该抛出 ValidationError 当工作流名称为空', () => {
      const workflow = createValidWorkflow('workflow-1', '');

      expect(() => {
        registry.register(workflow);
      }).toThrow(ValidationError);
    });
  });

  describe('registerBatch - 批量注册工作流定义', () => {
    it('应该成功批量注册多个工作流定义', () => {
      const workflows = [
        createValidWorkflow('workflow-1', 'Workflow 1'),
        createValidWorkflow('workflow-2', 'Workflow 2'),
        createValidWorkflow('workflow-3', 'Workflow 3')
      ];

      registry.registerBatch(workflows);

      expect(registry.size()).toBe(3);
      expect(registry.has('workflow-1')).toBe(true);
      expect(registry.has('workflow-2')).toBe(true);
      expect(registry.has('workflow-3')).toBe(true);
    });

    it('应该在第一个无效工作流时停止注册', () => {
      const workflows = [
        createValidWorkflow('workflow-1', 'Workflow 1'),
        {
          id: 'workflow-2',
          name: 'Invalid Workflow',
          nodes: [],
          edges: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        } as any,
        createValidWorkflow('workflow-3', 'Workflow 3')
      ];

      expect(() => {
        registry.registerBatch(workflows);
      }).toThrow(ValidationError);

      // 只有第一个工作流应该被注册
      expect(registry.size()).toBe(1);
      expect(registry.has('workflow-1')).toBe(true);
      expect(registry.has('workflow-2')).toBe(false);
      expect(registry.has('workflow-3')).toBe(false);
    });
  });

  describe('get - 获取工作流定义', () => {
    it('应该返回已注册的工作流定义', () => {
      const workflow = createValidWorkflow('workflow-1', 'Test Workflow');

      registry.register(workflow);

      const result = registry.get('workflow-1');

      expect(result).toEqual(workflow);
    });

    it('应该返回 undefined 当工作流不存在', () => {
      const result = registry.get('non-existent-workflow');

      expect(result).toBeUndefined();
    });
  });

  describe('getVersion - 获取特定版本的工作流定义', () => {
    it('应该返回指定版本的工作流定义', () => {
      const workflow = createValidWorkflow('workflow-1', 'Test Workflow');
      workflow.version = '1.0.0';

      registry.register(workflow);

      const result = registry.getVersion('workflow-1', '1.0.0');

      expect(result).toBeDefined();
      expect(result?.version).toBe('1.0.0');
    });

    it('应该返回 undefined 当版本不存在', () => {
      const workflow = createValidWorkflow('workflow-1', 'Test Workflow');
      workflow.version = '1.0.0';

      registry.register(workflow);

      const result = registry.getVersion('workflow-1', '2.0.0');

      expect(result).toBeUndefined();
    });

    it('应该返回 undefined 当工作流不存在', () => {
      const result = registry.getVersion('non-existent-workflow', '1.0.0');

      expect(result).toBeUndefined();
    });
  });

  describe('getByName - 按名称获取工作流定义', () => {
    it('应该返回指定名称的工作流定义', () => {
      const workflow = createValidWorkflow('workflow-1', 'Test Workflow');

      registry.register(workflow);

      const result = registry.getByName('Test Workflow');

      expect(result).toEqual(workflow);
    });

    it('应该返回 undefined 当名称不存在', () => {
      const result = registry.getByName('Non-existent Workflow');

      expect(result).toBeUndefined();
    });
  });

  describe('getByTags - 按标签获取工作流定义列表', () => {
    it('应该返回包含所有指定标签的工作流定义', () => {
      const workflows = [
        createValidWorkflow('workflow-1', 'Workflow 1'),
        createValidWorkflow('workflow-2', 'Workflow 2'),
        createValidWorkflow('workflow-3', 'Workflow 3')
      ];

      if (workflows[0]) workflows[0].metadata = { author: 'test-author', tags: ['test', 'workflow', 'ai'], category: 'test' };
      if (workflows[1]) workflows[1].metadata = { author: 'test-author', tags: ['test', 'workflow'], category: 'test' };
      if (workflows[2]) workflows[2].metadata = { author: 'test-author', tags: ['test'], category: 'test' };

      registry.registerBatch(workflows);

      const result = registry.getByTags(['test', 'workflow']);

      expect(result).toHaveLength(2);
      expect(result.map(w => w.id)).toContain('workflow-1');
      expect(result.map(w => w.id)).toContain('workflow-2');
    });

    it('应该返回空数组当没有匹配的工作流', () => {
      const result = registry.getByTags(['non-existent-tag']);

      expect(result).toEqual([]);
    });
  });

  describe('getByCategory - 按分类获取工作流定义列表', () => {
    it('应该返回指定分类的工作流定义', () => {
      const workflows = [
        createValidWorkflow('workflow-1', 'Workflow 1'),
        createValidWorkflow('workflow-2', 'Workflow 2'),
        createValidWorkflow('workflow-3', 'Workflow 3')
      ];

      if (workflows[0]) workflows[0].metadata = { category: 'ai', author: '', tags: [] };
      if (workflows[1]) workflows[1].metadata = { category: 'ai', author: '', tags: [] };
      if (workflows[2]) workflows[2].metadata = { category: 'utility', author: '', tags: [] };

      registry.registerBatch(workflows);

      const result = registry.getByCategory('ai');

      expect(result).toHaveLength(2);
      expect(result.map(w => w.id)).toContain('workflow-1');
      expect(result.map(w => w.id)).toContain('workflow-2');
    });

    it('应该返回空数组当没有匹配的工作流', () => {
      const result = registry.getByCategory('non-existent-category');

      expect(result).toEqual([]);
    });
  });

  describe('getByAuthor - 按作者获取工作流定义列表', () => {
    it('应该返回指定作者的工作流定义', () => {
      const workflows = [
        createValidWorkflow('workflow-1', 'Workflow 1'),
        createValidWorkflow('workflow-2', 'Workflow 2'),
        createValidWorkflow('workflow-3', 'Workflow 3')
      ];

      if (workflows[0]) workflows[0].metadata = { author: 'author-1', tags: [], category: '' };
      if (workflows[1]) workflows[1].metadata = { author: 'author-1', tags: [], category: '' };
      if (workflows[2]) workflows[2].metadata = { author: 'author-2', tags: [], category: '' };

      registry.registerBatch(workflows);

      const result = registry.getByAuthor('author-1');

      expect(result).toHaveLength(2);
      expect(result.map(w => w.id)).toContain('workflow-1');
      expect(result.map(w => w.id)).toContain('workflow-2');
    });

    it('应该返回空数组当没有匹配的工作流', () => {
      const result = registry.getByAuthor('non-existent-author');

      expect(result).toEqual([]);
    });
  });

  describe('list - 列出所有工作流摘要', () => {
    it('应该返回所有已注册的工作流摘要', () => {
      const workflows = [
        createValidWorkflow('workflow-1', 'Workflow 1'),
        createValidWorkflow('workflow-2', 'Workflow 2')
      ];

      registry.registerBatch(workflows);

      const result = registry.list();

      expect(result).toHaveLength(2);
      expect(result.map(w => w.id)).toContain('workflow-1');
      expect(result.map(w => w.id)).toContain('workflow-2');
    });

    it('应该返回空数组当没有工作流', () => {
      const result = registry.list();

      expect(result).toEqual([]);
    });
  });

  describe('search - 搜索工作流', () => {
    it('应该根据关键词搜索工作流', () => {
      const workflows = [
        createValidWorkflow('workflow-1', 'AI Workflow'),
        createValidWorkflow('workflow-2', 'Data Processing Workflow'),
        createValidWorkflow('workflow-3', 'Test Workflow')
      ];

      registry.registerBatch(workflows);

      const result = registry.search('ai');

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('AI Workflow');
    });

    it('应该不区分大小写', () => {
      const workflow = createValidWorkflow('workflow-1', 'AI Workflow');

      registry.register(workflow);

      const result = registry.search('ai');

      expect(result).toHaveLength(1);
    });

    it('应该搜索名称、描述和 ID', () => {
      const workflow = createValidWorkflow('ai-workflow-1', 'Test Workflow');
      workflow.description = 'AI powered workflow';

      registry.register(workflow);

      expect(registry.search('ai')).toHaveLength(1);
    });

    it('应该返回空数组当没有匹配的工作流', () => {
      const result = registry.search('non-existent');

      expect(result).toEqual([]);
    });
  });

  describe('update - 更新工作流定义', () => {
    it('应该成功更新工作流定义', () => {
      const workflow = createValidWorkflow('workflow-1', 'Test Workflow');

      registry.register(workflow);

      const updatedWorkflow = {
        ...workflow,
        description: 'Updated description',
        version: '2.0.0'
      };

      registry.update(updatedWorkflow);

      const result = registry.get('workflow-1');
      expect(result?.description).toBe('Updated description');
      expect(result?.version).toBe('2.0.0');
    });

    it('应该抛出 ValidationError 当工作流不存在', () => {
      const workflow = createValidWorkflow('non-existent-workflow', 'Test Workflow');

      expect(() => {
        registry.update(workflow);
      }).toThrow(ValidationError);
    });

    it('应该抛出 ValidationError 当更新后的工作流无效', () => {
      const workflow = createValidWorkflow('workflow-1', 'Test Workflow');

      registry.register(workflow);

      const invalidWorkflow = {
        ...workflow,
        nodes: []
      };

      expect(() => {
        registry.update(invalidWorkflow);
      }).toThrow(ValidationError);
    });
  });

  describe('updateMetadata - 更新工作流元数据', () => {
    it('应该成功更新工作流元数据', () => {
      const workflow = createValidWorkflow('workflow-1', 'Test Workflow');

      registry.register(workflow);

      registry.updateMetadata('workflow-1', {
        author: 'new-author',
        tags: ['new-tag']
      });

      const result = registry.get('workflow-1');
      expect(result?.metadata?.author).toBe('new-author');
      expect(result?.metadata?.tags).toEqual(['new-tag']);
    });

    it('应该抛出 ValidationError 当工作流不存在', () => {
      expect(() => {
        registry.updateMetadata('non-existent-workflow', { author: 'new-author' });
      }).toThrow(ValidationError);
    });
  });

  describe('updateConfig - 更新工作流配置', () => {
    it('应该成功更新工作流配置', () => {
      const workflow = createValidWorkflow('workflow-1', 'Test Workflow');

      registry.register(workflow);

      const newConfig = {
        timeout: 120000,
        maxSteps: 2000,
        enableCheckpoints: true
      };

      registry.updateConfig('workflow-1', newConfig);

      const result = registry.get('workflow-1');
      expect(result?.config).toEqual(newConfig);
    });

    it('应该抛出 ValidationError 当工作流不存在', () => {
      expect(() => {
        registry.updateConfig('non-existent-workflow', { timeout: 120000 });
      }).toThrow(ValidationError);
    });
  });

  describe('unregister - 删除工作流定义', () => {
    it('应该成功删除工作流定义', () => {
      const workflow = createValidWorkflow('workflow-1', 'Test Workflow');

      registry.register(workflow);
      registry.unregister('workflow-1');

      expect(registry.has('workflow-1')).toBe(false);
      expect(registry.get('workflow-1')).toBeUndefined();
    });

    it('应该不抛出错误当删除不存在的工作流', () => {
      expect(() => {
        registry.unregister('non-existent-workflow');
      }).not.toThrow();
    });
  });

  describe('unregisterBatch - 批量删除工作流定义', () => {
    it('应该成功批量删除多个工作流定义', () => {
      const workflows = [
        createValidWorkflow('workflow-1', 'Workflow 1'),
        createValidWorkflow('workflow-2', 'Workflow 2'),
        createValidWorkflow('workflow-3', 'Workflow 3')
      ];

      registry.registerBatch(workflows);

      registry.unregisterBatch(['workflow-1', 'workflow-3']);

      expect(registry.size()).toBe(1);
      expect(registry.has('workflow-1')).toBe(false);
      expect(registry.has('workflow-2')).toBe(true);
      expect(registry.has('workflow-3')).toBe(false);
    });
  });

  describe('clear - 清空所有工作流定义', () => {
    it('应该清空所有工作流定义', () => {
      const workflows = [
        createValidWorkflow('workflow-1', 'Workflow 1'),
        createValidWorkflow('workflow-2', 'Workflow 2')
      ];

      registry.registerBatch(workflows);

      registry.clear();

      expect(registry.size()).toBe(0);
      expect(registry.list()).toEqual([]);
    });
  });

  describe('getVersions - 获取工作流的所有版本', () => {
    it('应该返回工作流的所有版本', () => {
      const workflow = createValidWorkflow('workflow-1', 'Test Workflow');
      workflow.version = '1.0.0';

      registry.register(workflow);

      workflow.version = '2.0.0';
      registry.update(workflow);

      const versions = registry.getVersions('workflow-1');

      expect(versions.length).toBeGreaterThanOrEqual(1);
    });

    it('应该返回空数组当工作流不存在', () => {
      const versions = registry.getVersions('non-existent-workflow');

      expect(versions).toEqual([]);
    });
  });

  describe('rollback - 回滚到指定版本', () => {
    it('应该成功回滚到指定版本', () => {
      const workflow = createValidWorkflow('workflow-1', 'Test Workflow');
      workflow.version = '1.0.0';

      registry.register(workflow);

      workflow.version = '2.0.0';
      workflow.description = 'Updated';
      registry.update(workflow);

      registry.rollback('workflow-1', '1.0.0');

      const result = registry.get('workflow-1');
      expect(result?.version).toBe('1.0.0');
    });

    it('应该抛出 ValidationError 当版本不存在', () => {
      const workflow = createValidWorkflow('workflow-1', 'Test Workflow');
      workflow.version = '1.0.0';

      registry.register(workflow);

      expect(() => {
        registry.rollback('workflow-1', '2.0.0');
      }).toThrow(ValidationError);
    });

    it('应该抛出 ValidationError 当工作流不存在', () => {
      expect(() => {
        registry.rollback('non-existent-workflow', '1.0.0');
      }).toThrow(ValidationError);
    });
  });

  describe('validate - 验证工作流定义', () => {
    it('应该返回 valid: true 当工作流有效', () => {
      const workflow = createValidWorkflow('workflow-1', 'Test Workflow');

      const result = registry.validate(workflow);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('应该返回 valid: false 当工作流无效', () => {
      const invalidWorkflow = {
        id: 'workflow-1',
        name: 'Invalid Workflow',
        nodes: [],
        edges: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      } as any;

      const result = registry.validate(invalidWorkflow);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该返回错误当工作流 ID 为空', () => {
      const workflow = createValidWorkflow('', 'Test Workflow');

      const result = registry.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow ID is required');
    });

    it('应该返回错误当工作流名称为空', () => {
      const workflow = createValidWorkflow('workflow-1', '');

      const result = registry.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow name is required');
    });

    it('应该返回错误当工作流没有节点', () => {
      const workflow = {
        id: 'workflow-1',
        name: 'Test Workflow',
        nodes: [],
        edges: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      } as any;

      const result = registry.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow must have at least one node');
    });
  });

  describe('validateBatch - 批量验证工作流定义', () => {
    it('应该返回所有工作流的验证结果', () => {
      const workflows = [
        createValidWorkflow('workflow-1', 'Workflow 1'),
        createValidWorkflow('workflow-2', 'Workflow 2')
      ];

      const results = registry.validateBatch(workflows);

      expect(results).toHaveLength(2);
      expect(results[0]?.valid).toBe(true);
      expect(results[1]?.valid).toBe(true);
    });
  });

  describe('has - 检查工作流是否存在', () => {
    it('应该返回 true 当工作流存在', () => {
      const workflow = createValidWorkflow('workflow-1', 'Test Workflow');

      registry.register(workflow);

      expect(registry.has('workflow-1')).toBe(true);
    });

    it('应该返回 false 当工作流不存在', () => {
      expect(registry.has('non-existent-workflow')).toBe(false);
    });
  });

  describe('size - 获取工作流数量', () => {
    it('应该返回已注册的工作流数量', () => {
      const workflows = [
        createValidWorkflow('workflow-1', 'Workflow 1'),
        createValidWorkflow('workflow-2', 'Workflow 2')
      ];

      registry.registerBatch(workflows);

      expect(registry.size()).toBe(2);
    });

    it('应该返回 0 当没有工作流', () => {
      expect(registry.size()).toBe(0);
    });
  });

  describe('export - 导出工作流定义为 JSON 字符串', () => {
    it('应该成功导出工作流定义为 JSON 字符串', () => {
      const workflow = createValidWorkflow('workflow-1', 'Test Workflow');

      registry.register(workflow);

      const json = registry.export('workflow-1');

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe('workflow-1');
    });

    it('应该抛出 ValidationError 当工作流不存在', () => {
      expect(() => {
        registry.export('non-existent-workflow');
      }).toThrow(ValidationError);
    });
  });

  describe('import - 从 JSON 字符串导入工作流定义', () => {
    it('应该成功从 JSON 字符串导入工作流定义', () => {
      const workflow = createValidWorkflow('workflow-1', 'Test Workflow');

      const json = JSON.stringify(workflow);

      const workflowId = registry.import(json);

      expect(workflowId).toBe('workflow-1');
      expect(registry.has('workflow-1')).toBe(true);
    });

    it('应该抛出 ValidationError 当 JSON 无效', () => {
      expect(() => {
        registry.import('invalid json');
      }).toThrow(ValidationError);
    });

    it('应该抛出 ValidationError 当工作流定义无效', () => {
      const invalidWorkflow = {
        id: 'workflow-1',
        name: 'Invalid Workflow',
        nodes: [],
        edges: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const json = JSON.stringify(invalidWorkflow);

      expect(() => {
        registry.import(json);
      }).toThrow(ValidationError);
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的工作流生命周期', () => {
      // 1. 注册工作流
      const workflow = createValidWorkflow('workflow-1', 'Test Workflow');

      registry.register(workflow);
      expect(registry.has('workflow-1')).toBe(true);

      // 2. 获取工作流
      const retrieved = registry.get('workflow-1');
      expect(retrieved).toEqual(workflow);

      // 3. 更新工作流
      const updatedWorkflow = {
        ...workflow,
        description: 'Updated description',
        version: '2.0.0'
      };
      registry.update(updatedWorkflow);

      const updated = registry.get('workflow-1');
      expect(updated?.description).toBe('Updated description');

      // 4. 搜索工作流
      const searchResults = registry.search('updated');
      expect(searchResults).toHaveLength(1);

      // 5. 导出工作流
      const json = registry.export('workflow-1');
      expect(typeof json).toBe('string');

      // 6. 删除工作流
      registry.unregister('workflow-1');
      expect(registry.has('workflow-1')).toBe(false);
    });

    it('应该支持批量操作', () => {
      const workflows = [
        createValidWorkflow('workflow-1', 'Workflow 1'),
        createValidWorkflow('workflow-2', 'Workflow 2'),
        createValidWorkflow('workflow-3', 'Workflow 3')
      ];

      // 批量注册
      registry.registerBatch(workflows);
      expect(registry.size()).toBe(3);

      // 批量删除
      registry.unregisterBatch(['workflow-1', 'workflow-2']);
      expect(registry.size()).toBe(1);
      expect(registry.has('workflow-3')).toBe(true);
    });

    it('应该支持版本管理', () => {
      const workflow = createValidWorkflow('workflow-1', 'Test Workflow');
      workflow.version = '1.0.0';

      registry.register(workflow);

      // 更新到新版本
      workflow.version = '2.0.0';
      workflow.description = 'Updated';
      registry.update(workflow);

      // 获取所有版本
      const versions = registry.getVersions('workflow-1');
      expect(versions.length).toBeGreaterThanOrEqual(1);

      // 回滚到旧版本
      registry.rollback('workflow-1', '1.0.0');

      const rolledBack = registry.get('workflow-1');
      expect(rolledBack?.version).toBe('1.0.0');
    });
  });
});
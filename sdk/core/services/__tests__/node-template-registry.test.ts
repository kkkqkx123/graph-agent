/**
 * NodeTemplateRegistry 单元测试
 */

import { NodeTemplateRegistry } from '../node-template-registry';
import { NodeType } from '../../../types/node';
import { ValidationError, NotFoundError } from '../../../types/errors';

describe('NodeTemplateRegistry', () => {
  let registry: NodeTemplateRegistry;

  beforeEach(() => {
    // 创建新的 NodeTemplateRegistry 实例以避免测试间干扰
    registry = new NodeTemplateRegistry();
  });

  describe('register - 注册节点模板', () => {
    it('应该成功注册有效的节点模板', () => {
      const template = {
        name: 'test-template',
        type: NodeType.LLM,
        config: {
          profileId: 'profile-1',
          prompt: 'Test prompt'
        },
        description: 'Test template',
        metadata: {
          category: 'test',
          tags: ['test', 'llm']
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      expect(() => registry.register(template)).not.toThrow();
      expect(registry.has('test-template')).toBe(true);
    });

    it('应该抛出 ValidationError 当节点模板名称已存在', () => {
      const template = {
        name: 'test-template',
        type: NodeType.LLM,
        config: {
          profileId: 'profile-1',
          prompt: 'Test prompt'
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      expect(() => {
        registry.register(template);
      }).toThrow(ValidationError);
      expect(() => {
        registry.register(template);
      }).toThrow('already exists');
    });

    it('应该抛出 ValidationError 当节点模板名称为空', () => {
      const template = {
        name: '',
        type: NodeType.LLM,
        config: {
          profileId: 'profile-1'
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      expect(() => {
        registry.register(template);
      }).toThrow(ValidationError);
    });

    it('应该抛出 ValidationError 当节点类型无效', () => {
      const template = {
        name: 'test-template',
        type: 'INVALID_TYPE' as NodeType,
        config: {},
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      expect(() => {
        registry.register(template);
      }).toThrow(ValidationError);
      expect(() => {
        registry.register(template);
      }).toThrow('Invalid node type');
    });

    it('应该抛出 ValidationError 当节点配置为空', () => {
      const template = {
        name: 'test-template',
        type: NodeType.LLM,
        config: null as any,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      expect(() => {
        registry.register(template);
      }).toThrow(ValidationError);
    });
  });

  describe('registerBatch - 批量注册节点模板', () => {
    it('应该成功批量注册多个节点模板', () => {
      const templates = [
        {
          name: 'template-1',
          type: NodeType.LLM,
          config: { profileId: 'profile-1' },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          type: NodeType.CODE,
          config: {
            scriptName: 'test-script',
            scriptType: 'javascript',
            risk: 'none'
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-3',
          type: NodeType.TOOL,
          config: {
            toolName: 'test-tool',
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);

      expect(registry.size()).toBe(3);
      expect(registry.has('template-1')).toBe(true);
      expect(registry.has('template-2')).toBe(true);
      expect(registry.has('template-3')).toBe(true);
    });

    it('应该在第一个无效模板时停止注册', () => {
      const templates = [
        {
          name: 'template-1',
          type: NodeType.LLM,
          config: { profileId: 'profile-1' },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          type: NodeType.LLM,
          config: null as any,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-3',
          type: NodeType.TOOL,
          config: {
            toolName: 'test-tool',
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      expect(() => {
        registry.registerBatch(templates);
      }).toThrow(ValidationError);

      // 只有第一个模板应该被注册
      expect(registry.size()).toBe(1);
      expect(registry.has('template-1')).toBe(true);
      expect(registry.has('template-2')).toBe(false);
      expect(registry.has('template-3')).toBe(false);
    });
  });

  describe('get - 获取节点模板', () => {
    it('应该返回已注册的节点模板', () => {
      const template = {
        name: 'test-template',
        type: NodeType.LLM,
        config: { profileId: 'profile-1' },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      const result = registry.get('test-template');

      expect(result).toEqual(template);
    });

    it('应该返回 undefined 当节点模板不存在', () => {
      const result = registry.get('non-existent-template');

      expect(result).toBeUndefined();
    });
  });

  describe('has - 检查节点模板是否存在', () => {
    it('应该返回 true 当节点模板存在', () => {
      const template = {
        name: 'test-template',
        type: NodeType.LLM,
        config: { profileId: 'profile-1' },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      expect(registry.has('test-template')).toBe(true);
    });

    it('应该返回 false 当节点模板不存在', () => {
      expect(registry.has('non-existent-template')).toBe(false);
    });
  });

  describe('update - 更新节点模板', () => {
    it('应该成功更新节点模板', () => {
      const template = {
        name: 'test-template',
        type: NodeType.LLM,
        config: { profileId: 'profile-1' },
        description: 'Original description',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      const updates = {
        description: 'Updated description',
        metadata: {
          category: 'updated',
          tags: ['updated']
        }
      };

      registry.update('test-template', updates);

      const updated = registry.get('test-template');
      expect(updated?.description).toBe('Updated description');
      expect(updated?.metadata).toEqual(updates.metadata);
      expect(updated?.name).toBe('test-template'); // 名称不可更改
    });

    it('应该抛出 NotFoundError 当节点模板不存在', () => {
      expect(() => {
        registry.update('non-existent-template', { description: 'Updated' });
      }).toThrow(NotFoundError);
    });

    it('应该抛出 ValidationError 当更新后的配置无效', () => {
      const template = {
        name: 'test-template',
        type: NodeType.LLM,
        config: { profileId: 'profile-1' },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      expect(() => {
        registry.update('test-template', { config: null as any });
      }).toThrow(ValidationError);
    });

    it('应该更新 updatedAt 时间戳', () => {
      const template = {
        name: 'test-template',
        type: NodeType.LLM,
        config: { profileId: 'profile-1' },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      const originalUpdatedAt = template.updatedAt;

      // 等待一小段时间确保时间戳不同
      setTimeout(() => {
        registry.update('test-template', { description: 'Updated' });

        const updated = registry.get('test-template');
        expect(updated?.updatedAt).toBeGreaterThan(originalUpdatedAt);
      }, 10);
    });
  });

  describe('unregister - 删除节点模板', () => {
    it('应该成功删除节点模板', () => {
      const template = {
        name: 'test-template',
        type: NodeType.LLM,
        config: { profileId: 'profile-1' },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      registry.unregister('test-template');

      expect(registry.has('test-template')).toBe(false);
      expect(registry.get('test-template')).toBeUndefined();
    });

    it('应该抛出 NotFoundError 当节点模板不存在', () => {
      expect(() => {
        registry.unregister('non-existent-template');
      }).toThrow(NotFoundError);
    });
  });

  describe('unregisterBatch - 批量删除节点模板', () => {
    it('应该成功批量删除多个节点模板', () => {
      const templates = [
        {
          name: 'template-1',
          type: NodeType.LLM,
          config: { profileId: 'profile-1' },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          type: NodeType.CODE,
          config: {
            scriptName: 'test-script',
            scriptType: 'javascript',
            risk: 'none'
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-3',
          type: NodeType.TOOL,
          config: {
            toolName: 'test-tool',
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);

      registry.unregisterBatch(['template-1', 'template-3']);

      expect(registry.size()).toBe(1);
      expect(registry.has('template-1')).toBe(false);
      expect(registry.has('template-2')).toBe(true);
      expect(registry.has('template-3')).toBe(false);
    });

    it('应该在第一个不存在的模板时停止删除', () => {
      const templates = [
        {
          name: 'template-1',
          type: NodeType.LLM,
          config: { profileId: 'profile-1' },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          type: NodeType.CODE,
          config: {
            scriptName: 'test-script',
            scriptType: 'javascript',
            risk: 'none'
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);

      expect(() => {
        registry.unregisterBatch(['template-1', 'non-existent', 'template-2']);
      }).toThrow(NotFoundError);

      // 只有第一个模板应该被删除
      expect(registry.size()).toBe(1);
      expect(registry.has('template-1')).toBe(false);
      expect(registry.has('template-2')).toBe(true);
    });
  });

  describe('list - 列出所有节点模板', () => {
    it('应该返回所有已注册的节点模板', () => {
      const templates = [
        {
          name: 'template-1',
          type: NodeType.LLM,
          config: { profileId: 'profile-1' },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          type: NodeType.CODE,
          config: {
            scriptName: 'test-script',
            scriptType: 'javascript',
            risk: 'none'
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);

      const result = registry.list();

      expect(result).toHaveLength(2);
      expect(result.map(t => t.name)).toContain('template-1');
      expect(result.map(t => t.name)).toContain('template-2');
    });

    it('应该返回空数组当没有节点模板', () => {
      const result = registry.list();

      expect(result).toEqual([]);
    });
  });

  describe('listSummaries - 列出所有节点模板摘要', () => {
    it('应该返回所有节点模板的摘要信息', () => {
      const template = {
        name: 'test-template',
        type: NodeType.LLM,
        config: { profileId: 'profile-1' },
        description: 'Test description',
        metadata: {
          category: 'test',
          tags: ['test', 'llm']
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      const summaries = registry.listSummaries();

      expect(summaries).toHaveLength(1);
      expect(summaries[0]).toEqual({
        name: 'test-template',
        type: NodeType.LLM,
        description: 'Test description',
        category: 'test',
        tags: ['test', 'llm'],
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      });
    });

    it('应该不包含 config 字段', () => {
      const template = {
        name: 'test-template',
        type: NodeType.LLM,
        config: { profileId: 'profile-1' },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      const summaries = registry.listSummaries();

      expect(summaries[0]).not.toHaveProperty('config');
    });
  });

  describe('listByType - 按类型列出节点模板', () => {
    it('应该返回指定类型的所有节点模板', () => {
      const templates = [
        {
          name: 'llm-template-1',
          type: NodeType.LLM,
          config: { profileId: 'profile-1' },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'llm-template-2',
          type: NodeType.LLM,
          config: { profileId: 'profile-2' },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'code-template',
          type: NodeType.CODE,
          config: {
            scriptName: 'test-script',
            scriptType: 'javascript',
            risk: 'none'
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);

      const llmTemplates = registry.listByType(NodeType.LLM);
      const codeTemplates = registry.listByType(NodeType.CODE);

      expect(llmTemplates).toHaveLength(2);
      expect(llmTemplates.map(t => t.name)).toContain('llm-template-1');
      expect(llmTemplates.map(t => t.name)).toContain('llm-template-2');

      expect(codeTemplates).toHaveLength(1);
      expect(codeTemplates[0]?.name).toBe('code-template');
    });

    it('应该返回空数组当没有指定类型的节点模板', () => {
      const result = registry.listByType(NodeType.LLM);

      expect(result).toEqual([]);
    });
  });

  describe('listByCategory - 按分类列出节点模板', () => {
    it('应该返回指定分类的所有节点模板', () => {
      const templates = [
        {
          name: 'template-1',
          type: NodeType.LLM,
          config: { profileId: 'profile-1' },
          metadata: { category: 'ai' },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          type: NodeType.CODE,
          config: {
            scriptName: 'test-script',
            scriptType: 'javascript',
            risk: 'none'
          },
          metadata: { category: 'ai' },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-3',
          type: NodeType.TOOL,
          config: {
            toolName: 'test-tool',
            parameters: {}
          },
          metadata: { category: 'utility' },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);

      const aiTemplates = registry.listByCategory('ai');
      const utilityTemplates = registry.listByCategory('utility');

      expect(aiTemplates).toHaveLength(2);
      expect(utilityTemplates).toHaveLength(1);
    });

    it('应该返回空数组当没有指定分类的节点模板', () => {
      const result = registry.listByCategory('non-existent');

      expect(result).toEqual([]);
    });
  });

  describe('listByTags - 按标签列出节点模板', () => {
    it('应该返回包含所有指定标签的节点模板', () => {
      const templates = [
        {
          name: 'template-1',
          type: NodeType.LLM,
          config: { profileId: 'profile-1' },
          metadata: { tags: ['ai', 'llm', 'test'] },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          type: NodeType.CODE,
          config: {
            scriptName: 'test-script',
            scriptType: 'javascript',
            risk: 'none'
          },
          metadata: { tags: ['code', 'test'] },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-3',
          type: NodeType.TOOL,
          config: {
            toolName: 'test-tool',
            parameters: {}
          },
          metadata: { tags: ['tool'] },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);

      const testTemplates = registry.listByTags(['test']);
      const aiLlmTemplates = registry.listByTags(['ai', 'llm']);

      expect(testTemplates).toHaveLength(2);
      expect(aiLlmTemplates).toHaveLength(1);
    });

    it('应该返回空数组当没有包含所有指定标签的节点模板', () => {
      const result = registry.listByTags(['non-existent-tag']);

      expect(result).toEqual([]);
    });
  });

  describe('clear - 清空所有节点模板', () => {
    it('应该清空所有节点模板', () => {
      const templates = [
        {
          name: 'template-1',
          type: NodeType.LLM,
          config: { profileId: 'profile-1' },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          type: NodeType.CODE,
          config: {
            scriptName: 'test-script',
            scriptType: 'javascript',
            risk: 'none'
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);

      registry.clear();

      expect(registry.size()).toBe(0);
      expect(registry.list()).toEqual([]);
    });
  });

  describe('size - 获取节点模板数量', () => {
    it('应该返回已注册的节点模板数量', () => {
      const templates = [
        {
          name: 'template-1',
          type: NodeType.LLM,
          config: { profileId: 'profile-1' },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          type: NodeType.CODE,
          config: {
            scriptName: 'test-script',
            scriptType: 'javascript',
            risk: 'none'
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);

      expect(registry.size()).toBe(2);
    });

    it('应该返回 0 当没有节点模板', () => {
      expect(registry.size()).toBe(0);
    });
  });

  describe('search - 搜索节点模板', () => {
    it('应该根据关键词搜索节点模板', () => {
      const templates = [
        {
          name: 'llm-template',
          type: NodeType.LLM,
          config: { profileId: 'profile-1' },
          description: 'LLM template for testing',
          metadata: { tags: ['llm', 'ai'] },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'code-template',
          type: NodeType.CODE,
          config: {
            scriptName: 'test-script',
            scriptType: 'javascript',
            risk: 'none'
          },
          description: 'Code template',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      registry.registerBatch(templates);

      const results = registry.search('llm');

      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('llm-template');
    });

    it('应该不区分大小写', () => {
      const template = {
        name: 'LLM-Template',
        type: NodeType.LLM,
        config: { profileId: 'profile-1' },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      const results = registry.search('llm');

      expect(results).toHaveLength(1);
    });

    it('应该搜索名称、描述、标签和分类', () => {
      const template = {
        name: 'test-template',
        type: NodeType.LLM,
        config: { profileId: 'profile-1' },
        description: 'AI template',
        metadata: {
          category: 'ai',
          tags: ['machine-learning']
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      expect(registry.search('ai')).toHaveLength(1);
      expect(registry.search('machine-learning')).toHaveLength(1);
    });

    it('应该返回空数组当没有匹配的节点模板', () => {
      const result = registry.search('non-existent');

      expect(result).toEqual([]);
    });
  });

  describe('export - 导出节点模板', () => {
    it('应该成功导出节点模板为 JSON 字符串', () => {
      const template = {
        name: 'test-template',
        type: NodeType.LLM,
        config: { profileId: 'profile-1' },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);

      const json = registry.export('test-template');

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(template);
    });

    it('应该抛出 NotFoundError 当节点模板不存在', () => {
      expect(() => {
        registry.export('non-existent-template');
      }).toThrow(NotFoundError);
    });
  });

  describe('import - 导入节点模板', () => {
    it('应该成功从 JSON 字符串导入节点模板', () => {
      const template = {
        name: 'test-template',
        type: NodeType.LLM,
        config: { profileId: 'profile-1' },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const json = JSON.stringify(template);

      const name = registry.import(json);

      expect(name).toBe('test-template');
      expect(registry.has('test-template')).toBe(true);
    });

    it('应该抛出 ValidationError 当 JSON 无效', () => {
      expect(() => {
        registry.import('invalid json');
      }).toThrow(ValidationError);
    });

    it('应该抛出 ValidationError 当节点配置无效', () => {
      const invalidTemplate = {
        name: 'test-template',
        type: NodeType.LLM,
        config: null as any,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const json = JSON.stringify(invalidTemplate);

      expect(() => {
        registry.import(json);
      }).toThrow(ValidationError);
    });
  });

  describe('集成测试', () => {
    it('应该支持完整的节点模板生命周期', () => {
      // 1. 注册节点模板
      const template = {
        name: 'test-template',
        type: NodeType.LLM,
        config: { profileId: 'profile-1' },
        description: 'Test template',
        metadata: {
          category: 'test',
          tags: ['test', 'llm']
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      registry.register(template);
      expect(registry.has('test-template')).toBe(true);

      // 2. 获取节点模板
      const retrieved = registry.get('test-template');
      expect(retrieved).toEqual(template);

      // 3. 更新节点模板
      registry.update('test-template', { description: 'Updated description' });
      const updated = registry.get('test-template');
      expect(updated?.description).toBe('Updated description');

      // 4. 搜索节点模板
      const searchResults = registry.search('updated');
      expect(searchResults).toHaveLength(1);

      // 5. 导出节点模板
      const json = registry.export('test-template');
      expect(typeof json).toBe('string');

      // 6. 删除节点模板
      registry.unregister('test-template');
      expect(registry.has('test-template')).toBe(false);
    });

    it('应该支持批量操作', () => {
      const templates = [
        {
          name: 'template-1',
          type: NodeType.LLM,
          config: { profileId: 'profile-1' },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-2',
          type: NodeType.CODE,
          config: {
            scriptName: 'test-script',
            scriptType: 'javascript',
            risk: 'none'
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          name: 'template-3',
          type: NodeType.TOOL,
          config: {
            toolName: 'test-tool',
            parameters: {}
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      // 批量注册
      registry.registerBatch(templates);
      expect(registry.size()).toBe(3);

      // 批量删除
      registry.unregisterBatch(['template-1', 'template-2']);
      expect(registry.size()).toBe(1);
      expect(registry.has('template-3')).toBe(true);
    });
  });
});
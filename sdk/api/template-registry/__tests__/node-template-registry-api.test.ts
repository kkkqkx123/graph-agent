/**
 * NodeTemplateRegistryAPI 单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NodeRegistryAPI } from '../node-template-registry-api';
import type { NodeTemplate } from '../../../types/node-template';
import type { NodeTemplateFilter } from '../../types/registry-types';
import { ValidationError } from '../../../types/errors';
import { NodeType } from '../../../types/node';

// Mock NodeTemplateRegistry
jest.mock('../../../core/services/node-template-registry', () => {
  const mockRegistry = {
    _templates: new Map<string, NodeTemplate>(),
    
    register(template: NodeTemplate): void {
      if (!template.name || template.name.trim() === '') {
        throw new Error('Template name cannot be empty');
      }
      if (this._templates.has(template.name)) {
        throw new Error(`Template ${template.name} already exists`);
      }
      this._templates.set(template.name, template);
    },
    
    get(name: string): NodeTemplate | undefined {
      return this._templates.get(name);
    },
    
    update(name: string, updates: Partial<NodeTemplate>): void {
      const template = this._templates.get(name);
      if (!template) {
        throw new Error(`Template ${name} not found`);
      }
      this._templates.set(name, { ...template, ...updates });
    },
    
    unregister(name: string): void {
      if (!this._templates.has(name)) {
        throw new Error(`Template ${name} not found`);
      }
      this._templates.delete(name);
    },
    
    list(): NodeTemplate[] {
      return Array.from(this._templates.values());
    },
    
    listSummaries(): any[] {
      return Array.from(this._templates.values()).map(t => ({
        name: t.name,
        type: t.type,
        description: t.description,
        category: t.metadata?.['category'],
        tags: t.metadata?.['tags'],
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      }));
    },
    
    listByType(type: string): NodeTemplate[] {
      return this.list().filter(t => t.type === type);
    },
    
    listByTags(tags: string[]): NodeTemplate[] {
      return this.list().filter(t => {
        const templateTags = t.metadata?.['tags'] || [];
        return tags.every(tag => templateTags.includes(tag));
      });
    },
    
    listByCategory(category: string): NodeTemplate[] {
      return this.list().filter(t => t.metadata?.['category'] === category);
    },
    
    has(name: string): boolean {
      return this._templates.has(name);
    },
    
    size(): number {
      return this._templates.size;
    },
    
    clear(): void {
      this._templates.clear();
    },
    
    search(keyword: string): NodeTemplate[] {
      return this.list().filter(t => 
        t.name.includes(keyword) || 
        t.description?.includes(keyword) ||
        t.type.includes(keyword)
      );
    },
    
    export(name: string): string {
      const template = this._templates.get(name);
      if (!template) {
        throw new Error(`Template ${name} not found`);
      }
      return JSON.stringify(template);
    },
    
    import(json: string): string {
      const template = JSON.parse(json);
      this.register(template);
      return template.name;
    }
  };
  
  return {
    nodeTemplateRegistry: mockRegistry
  };
});

describe('NodeRegistryAPI', () => {
  let api: NodeRegistryAPI;
  let mockRegistry: any;
  
  // 创建测试用的节点模板
  const createMockTemplate = (name: string, type: NodeType = NodeType.LLM): NodeTemplate => ({
    name,
    type,
    config: {},
    description: `Test template ${name}`,
    metadata: {
      category: 'test',
      tags: ['test', 'mock']
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  beforeEach(() => {
    // 重置 mock registry
    const { nodeTemplateRegistry } = require('../../../core/services/node-template-registry');
    mockRegistry = nodeTemplateRegistry;
    mockRegistry._templates.clear();
    
    api = new NodeRegistryAPI();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerTemplate', () => {
    it('应该成功注册节点模板', async () => {
      const template = createMockTemplate('test-template');
      await api.registerTemplate(template);
      
      expect(mockRegistry.has('test-template')).toBe(true);
    });

    it('应该将模板添加到缓存', async () => {
      const template = createMockTemplate('test-template');
      await api.registerTemplate(template);
      
      const cached = await api.getTemplate('test-template');
      expect(cached).toEqual(template);
    });

    it('应该拒绝重复注册相同名称的模板', async () => {
      const template = createMockTemplate('test-template');
      await api.registerTemplate(template);
      
      await expect(api.registerTemplate(template)).rejects.toThrow();
    });
  });

  describe('registerTemplates', () => {
    it('应该批量注册多个节点模板', async () => {
      const templates = [
        createMockTemplate('template-1'),
        createMockTemplate('template-2'),
        createMockTemplate('template-3')
      ];
      
      await api.registerTemplates(templates);
      
      expect(mockRegistry.size()).toBe(3);
    });

    it('应该处理空数组', async () => {
      await api.registerTemplates([]);
      expect(mockRegistry.size()).toBe(0);
    });
  });

  describe('getTemplate', () => {
    it('应该从缓存中获取模板', async () => {
      const template = createMockTemplate('test-template');
      await api.registerTemplate(template);
      
      const result = await api.getTemplate('test-template');
      expect(result).toEqual(template);
    });

    it('应该从注册表中获取模板（缓存未命中）', async () => {
      const template = createMockTemplate('test-template');
      mockRegistry.register(template);
      
      const result = await api.getTemplate('test-template');
      expect(result).toEqual(template);
    });

    it('应该返回null当模板不存在时', async () => {
      const result = await api.getTemplate('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getTemplates', () => {
    beforeEach(async () => {
      await api.registerTemplates([
        createMockTemplate('template-1', NodeType.LLM),
        createMockTemplate('template-2', NodeType.TOOL),
        createMockTemplate('template-3', NodeType.LLM)
      ]);
    });

    it('应该返回所有模板', async () => {
      const templates = await api.getTemplates();
      expect(templates).toHaveLength(3);
    });

    it('应该按名称过滤', async () => {
      const filter: NodeTemplateFilter = { name: 'template-1' };
      const templates = await api.getTemplates(filter);
      expect(templates).toHaveLength(1);
      expect(templates[0]?.name).toBe('template-1');
    });

    it('应该按类型过滤', async () => {
      const filter: NodeTemplateFilter = { type: NodeType.LLM };
      const templates = await api.getTemplates(filter);
      expect(templates).toHaveLength(2);
    });

    it('应该按分类过滤', async () => {
      const filter: NodeTemplateFilter = { category: 'test' };
      const templates = await api.getTemplates(filter);
      expect(templates).toHaveLength(3);
    });

    it('应该按标签过滤', async () => {
      const filter: NodeTemplateFilter = { tags: ['test'] };
      const templates = await api.getTemplates(filter);
      expect(templates).toHaveLength(3);
    });

    it('应该处理无过滤条件的情况', async () => {
      const templates = await api.getTemplates();
      expect(templates).toHaveLength(3);
    });
  });

  describe('getTemplateSummaries', () => {
    beforeEach(async () => {
      await api.registerTemplates([
        createMockTemplate('template-1', NodeType.LLM),
        createMockTemplate('template-2', NodeType.TOOL)
      ]);
    });

    it('应该返回所有模板摘要', async () => {
      const summaries = await api.getTemplateSummaries();
      expect(summaries).toHaveLength(2);
      expect(summaries[0]).toHaveProperty('name');
      expect(summaries[0]).toHaveProperty('type');
      expect(summaries[0]).toHaveProperty('createdAt');
      expect(summaries[0]).toHaveProperty('updatedAt');
    });

    it('应该按名称过滤摘要', async () => {
      const filter: NodeTemplateFilter = { name: 'template-1' };
      const summaries = await api.getTemplateSummaries(filter);
      expect(summaries).toHaveLength(1);
      expect(summaries[0]?.name).toBe('template-1');
    });

    it('应该按类型过滤摘要', async () => {
      const filter: NodeTemplateFilter = { type: NodeType.LLM };
      const summaries = await api.getTemplateSummaries(filter);
      expect(summaries).toHaveLength(1);
      expect(summaries[0]?.type).toBe(NodeType.LLM);
    });

    it('应该按分类过滤摘要', async () => {
      const filter: NodeTemplateFilter = { category: 'test' };
      const summaries = await api.getTemplateSummaries(filter);
      expect(summaries).toHaveLength(2);
    });

    it('应该按标签过滤摘要', async () => {
      const filter: NodeTemplateFilter = { tags: ['test'] };
      const summaries = await api.getTemplateSummaries(filter);
      expect(summaries).toHaveLength(2);
    });
  });

  describe('getTemplateByName', () => {
    it('应该按名称获取模板', async () => {
      const template = createMockTemplate('test-template');
      await api.registerTemplate(template);
      
      const result = await api.getTemplateByName('test-template');
      expect(result).toEqual(template);
    });

    it('应该返回null当模板不存在时', async () => {
      const result = await api.getTemplateByName('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getTemplatesByType', () => {
    beforeEach(async () => {
      await api.registerTemplates([
        createMockTemplate('template-1', NodeType.LLM),
        createMockTemplate('template-2', NodeType.TOOL),
        createMockTemplate('template-3', NodeType.LLM)
      ]);
    });

    it('应该按类型获取模板列表', async () => {
      const templates = await api.getTemplatesByType(NodeType.LLM);
      expect(templates).toHaveLength(2);
      expect(templates.every(t => t.type === NodeType.LLM)).toBe(true);
    });

    it('应该返回空数组当没有匹配的模板时', async () => {
      const templates = await api.getTemplatesByType('non-existent-type' as any);
      expect(templates).toHaveLength(0);
    });
  });

  describe('getTemplatesByTags', () => {
    beforeEach(async () => {
      const template1 = createMockTemplate('template-1', NodeType.LLM);
      template1.metadata = { ...template1.metadata, tags: ['test', 'mock'] };
      
      const template2 = createMockTemplate('template-2', NodeType.TOOL);
      template2.metadata = { ...template2.metadata, tags: ['test'] };
      
      await api.registerTemplates([template1, template2]);
    });

    it('应该按标签获取模板列表', async () => {
      const templates = await api.getTemplatesByTags(['test']);
      expect(templates).toHaveLength(2);
    });

    it('应该按多个标签获取模板列表', async () => {
      const templates = await api.getTemplatesByTags(['test', 'mock']);
      expect(templates).toHaveLength(1);
      expect(templates[0]?.name).toBe('template-1');
    });
  });

  describe('getTemplatesByCategory', () => {
    beforeEach(async () => {
      const template1 = createMockTemplate('template-1', NodeType.LLM);
      template1.metadata = { ...template1.metadata, category: 'category1' };
      
      const template2 = createMockTemplate('template-2', NodeType.TOOL);
      template2.metadata = { ...template2.metadata, category: 'category2' };
      
      await api.registerTemplates([template1, template2]);
    });

    it('应该按分类获取模板列表', async () => {
      const templates = await api.getTemplatesByCategory('category1');
      expect(templates).toHaveLength(1);
      expect(templates[0]?.name).toBe('template-1');
    });
  });

  describe('updateTemplate', () => {
    it('应该更新模板', async () => {
      const template = createMockTemplate('test-template');
      await api.registerTemplate(template);
      
      await api.updateTemplate('test-template', { description: 'Updated description' });
      
      const updated = await api.getTemplate('test-template');
      expect(updated?.description).toBe('Updated description');
    });

    it('应该清除缓存', async () => {
      const template = createMockTemplate('test-template');
      await api.registerTemplate(template);
      
      // 先从缓存获取
      await api.getTemplate('test-template');
      
      // 更新
      await api.updateTemplate('test-template', { description: 'Updated' });
      
      // 再次获取应该从注册表获取最新数据
      const updated = await api.getTemplate('test-template');
      expect(updated?.description).toBe('Updated');
    });
  });

  describe('deleteTemplate', () => {
    it('应该删除模板', async () => {
      const template = createMockTemplate('test-template');
      await api.registerTemplate(template);
      
      await api.deleteTemplate('test-template');
      
      expect(mockRegistry.has('test-template')).toBe(false);
    });

    it('应该清除缓存', async () => {
      const template = createMockTemplate('test-template');
      await api.registerTemplate(template);
      
      // 先从缓存获取
      await api.getTemplate('test-template');
      
      // 删除
      await api.deleteTemplate('test-template');
      
      // 再次获取应该返回null
      const result = await api.getTemplate('test-template');
      expect(result).toBeNull();
    });
  });

  describe('hasTemplate', () => {
    it('应该返回true当模板存在时', async () => {
      const template = createMockTemplate('test-template');
      await api.registerTemplate(template);
      
      const result = await api.hasTemplate('test-template');
      expect(result).toBe(true);
    });

    it('应该返回false当模板不存在时', async () => {
      const result = await api.hasTemplate('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getTemplateCount', () => {
    it('应该返回模板数量', async () => {
      await api.registerTemplates([
        createMockTemplate('template-1'),
        createMockTemplate('template-2'),
        createMockTemplate('template-3')
      ]);
      
      const count = await api.getTemplateCount();
      expect(count).toBe(3);
    });

    it('应该返回0当没有模板时', async () => {
      const count = await api.getTemplateCount();
      expect(count).toBe(0);
    });
  });

  describe('clearTemplates', () => {
    it('应该清空所有模板', async () => {
      await api.registerTemplates([
        createMockTemplate('template-1'),
        createMockTemplate('template-2')
      ]);
      
      await api.clearTemplates();
      
      expect(mockRegistry.size()).toBe(0);
    });

    it('应该清空缓存', async () => {
      const template = createMockTemplate('test-template');
      await api.registerTemplate(template);
      
      await api.clearTemplates();
      
      const result = await api.getTemplate('test-template');
      expect(result).toBeNull();
    });
  });

  describe('searchTemplates', () => {
    beforeEach(async () => {
      await api.registerTemplates([
        createMockTemplate('llm-template', NodeType.LLM),
        createMockTemplate('tool-template', NodeType.TOOL),
        createMockTemplate('test-template', NodeType.START)
      ]);
    });

    it('应该按关键词搜索模板', async () => {
      const results = await api.searchTemplates('llm');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('llm-template');
    });

    it('应该返回空数组当没有匹配结果时', async () => {
      const results = await api.searchTemplates('non-existent');
      expect(results).toHaveLength(0);
    });
  });

  describe('validateTemplate', () => {
    it('应该验证有效的模板', async () => {
      const template = createMockTemplate('test-template');
      const result = await api.validateTemplate(template);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝无效的模板', async () => {
      const invalidTemplate = {
        name: '',
        type: NodeType.LLM,
        config: {},
        createdAt: Date.now(),
        updatedAt: Date.now()
      } as NodeTemplate;
      
      const result = await api.validateTemplate(invalidTemplate);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toBeInstanceOf(ValidationError);
    });
  });

  describe('exportTemplate', () => {
    it('应该导出模板为JSON字符串', async () => {
      const template = createMockTemplate('test-template');
      await api.registerTemplate(template);
      
      const json = await api.exportTemplate('test-template');
      
      expect(typeof json).toBe('string');
      const exported = JSON.parse(json);
      expect(exported.name).toBe('test-template');
    });
  });

  describe('importTemplate', () => {
    it('应该从JSON字符串导入模板', async () => {
      const template = createMockTemplate('test-template');
      const json = JSON.stringify(template);
      
      const name = await api.importTemplate(json);
      
      expect(name).toBe('test-template');
      expect(mockRegistry.has('test-template')).toBe(true);
    });

    it('应该将导入的模板添加到缓存', async () => {
      const template = createMockTemplate('test-template');
      const json = JSON.stringify(template);
      
      await api.importTemplate(json);
      
      const cached = await api.getTemplate('test-template');
      expect(cached).toEqual(template);
    });
  });
});
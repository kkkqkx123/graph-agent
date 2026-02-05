/**
 * TriggerTemplateRegistryAPI 单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TriggerTemplateRegistryAPI, triggerTemplateRegistryAPI } from '../trigger-template-registry-api';
import type { TriggerTemplate, TriggerTemplateFilter } from '../../../types/trigger-template';
import { EventType } from '../../../types/events';
import { TriggerActionType } from '../../../types/trigger';

// Mock TriggerTemplateRegistry
jest.mock('../../../core/services/trigger-template-registry', () => {
  const mockRegistry = {
    _templates: new Map<string, TriggerTemplate>(),
    
    register(template: TriggerTemplate): void {
      if (this._templates.has(template.name)) {
        throw new Error(`Template ${template.name} already exists`);
      }
      this._templates.set(template.name, template);
    },
    
    registerBatch(templates: TriggerTemplate[]): void {
      for (const template of templates) {
        this.register(template);
      }
    },
    
    get(name: string): TriggerTemplate | undefined {
      return this._templates.get(name);
    },
    
    update(name: string, updates: Partial<TriggerTemplate>): void {
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
    
    unregisterBatch(names: string[]): void {
      for (const name of names) {
        this.unregister(name);
      }
    },
    
    list(): TriggerTemplate[] {
      return Array.from(this._templates.values());
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
    
    search(keyword: string): TriggerTemplate[] {
      return this.list().filter(t => 
        t.name.includes(keyword) || 
        t.description?.includes(keyword)
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
    triggerTemplateRegistry: mockRegistry
  };
});

describe('TriggerTemplateRegistryAPI', () => {
  let api: TriggerTemplateRegistryAPI;
  let mockRegistry: any;
  
  // 创建测试用的触发器模板
  const createMockTemplate = (name: string): TriggerTemplate => ({
    name,
    description: `Test trigger template ${name}`,
    condition: {
      eventType: EventType.NODE_COMPLETED
    },
    action: {
      type: TriggerActionType.SEND_NOTIFICATION,
      parameters: {
        message: 'Test message'
      }
    },
    enabled: true,
    maxTriggers: 0,
    metadata: {
      category: 'test',
      tags: ['test', 'mock']
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  beforeEach(() => {
    // 重置 mock registry
    const { triggerTemplateRegistry } = require('../../../core/services/trigger-template-registry');
    mockRegistry = triggerTemplateRegistry;
    mockRegistry._templates.clear();
    
    api = new TriggerTemplateRegistryAPI();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerTemplate', () => {
    it('应该成功注册触发器模板', () => {
      const template = createMockTemplate('test-template');
      api.registerTemplate(template);
      
      expect(mockRegistry.has('test-template')).toBe(true);
    });

    it('应该拒绝重复注册相同名称的模板', () => {
      const template = createMockTemplate('test-template');
      api.registerTemplate(template);
      
      expect(() => api.registerTemplate(template)).toThrow();
    });
  });

  describe('registerTemplates', () => {
    it('应该批量注册多个触发器模板', () => {
      const templates = [
        createMockTemplate('template-1'),
        createMockTemplate('template-2'),
        createMockTemplate('template-3')
      ];
      
      api.registerTemplates(templates);
      
      expect(mockRegistry.size()).toBe(3);
    });

    it('应该处理空数组', () => {
      api.registerTemplates([]);
      expect(mockRegistry.size()).toBe(0);
    });
  });

  describe('getTemplate', () => {
    it('应该获取已注册的模板', () => {
      const template = createMockTemplate('test-template');
      api.registerTemplate(template);
      
      const result = api.getTemplate('test-template');
      expect(result).toEqual(template);
    });

    it('应该返回undefined当模板不存在时', () => {
      const result = api.getTemplate('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('updateTemplate', () => {
    it('应该更新模板', () => {
      const template = createMockTemplate('test-template');
      api.registerTemplate(template);
      
      api.updateTemplate('test-template', { description: 'Updated description' });
      
      const updated = api.getTemplate('test-template');
      expect(updated?.description).toBe('Updated description');
    });

    it('应该抛出错误当模板不存在时', () => {
      expect(() => {
        api.updateTemplate('non-existent', { description: 'Updated' });
      }).toThrow();
    });
  });

  describe('deleteTemplate', () => {
    it('应该删除模板', () => {
      const template = createMockTemplate('test-template');
      api.registerTemplate(template);
      
      api.deleteTemplate('test-template');
      
      expect(mockRegistry.has('test-template')).toBe(false);
    });

    it('应该抛出错误当模板不存在时', () => {
      expect(() => {
        api.deleteTemplate('non-existent');
      }).toThrow();
    });
  });

  describe('deleteTemplates', () => {
    it('应该批量删除模板', () => {
      const templates = [
        createMockTemplate('template-1'),
        createMockTemplate('template-2'),
        createMockTemplate('template-3')
      ];
      api.registerTemplates(templates);
      
      api.deleteTemplates(['template-1', 'template-2']);
      
      expect(mockRegistry.size()).toBe(1);
      expect(mockRegistry.has('template-3')).toBe(true);
    });

    it('应该处理空数组', () => {
      const templates = [createMockTemplate('template-1')];
      api.registerTemplates(templates);
      
      api.deleteTemplates([]);
      
      expect(mockRegistry.size()).toBe(1);
    });
  });

  describe('getTemplates', () => {
    beforeEach(() => {
      api.registerTemplates([
        createMockTemplate('template-1'),
        createMockTemplate('template-2'),
        createMockTemplate('template-3')
      ]);
    });

    it('应该返回所有模板', () => {
      const templates = api.getTemplates();
      expect(templates).toHaveLength(3);
    });

    it('应该按名称过滤', () => {
      const filter: TriggerTemplateFilter = { name: 'template-1' };
      const templates = api.getTemplates(filter);
      expect(templates).toHaveLength(1);
      expect(templates[0]?.name).toBe('template-1');
    });

    it('应该按分类过滤', () => {
      const filter: TriggerTemplateFilter = { category: 'test' };
      const templates = api.getTemplates(filter);
      expect(templates).toHaveLength(3);
    });

    it('应该按标签过滤', () => {
      const filter: TriggerTemplateFilter = { tags: ['test'] };
      const templates = api.getTemplates(filter);
      expect(templates).toHaveLength(3);
    });

    it('应该按关键词搜索', () => {
      const filter: TriggerTemplateFilter = { keyword: 'template-1' };
      const templates = api.getTemplates(filter);
      expect(templates).toHaveLength(1);
      expect(templates[0]?.name).toBe('template-1');
    });

    it('应该组合多个过滤条件', () => {
      const filter: TriggerTemplateFilter = { 
        keyword: 'template',
        category: 'test',
        tags: ['test']
      };
      const templates = api.getTemplates(filter);
      expect(templates).toHaveLength(3);
    });

    it('应该处理无过滤条件的情况', () => {
      const templates = api.getTemplates();
      expect(templates).toHaveLength(3);
    });
  });

  describe('getTemplateSummaries', () => {
    beforeEach(() => {
      api.registerTemplates([
        createMockTemplate('template-1'),
        createMockTemplate('template-2')
      ]);
    });

    it('应该返回所有模板摘要', () => {
      const summaries = api.getTemplateSummaries();
      expect(summaries).toHaveLength(2);
      expect(summaries[0]).toHaveProperty('name');
      expect(summaries[0]).toHaveProperty('description');
      expect(summaries[0]).toHaveProperty('createdAt');
      expect(summaries[0]).toHaveProperty('updatedAt');
    });

    it('应该包含分类信息', () => {
      const summaries = api.getTemplateSummaries();
      expect(summaries[0]?.category).toBe('test');
    });

    it('应该包含标签信息', () => {
      const summaries = api.getTemplateSummaries();
      expect(summaries[0]?.tags).toEqual(['test', 'mock']);
    });

    it('应该按名称过滤摘要', () => {
      const filter: TriggerTemplateFilter = { name: 'template-1' };
      const summaries = api.getTemplateSummaries(filter);
      expect(summaries).toHaveLength(1);
      expect(summaries[0]?.name).toBe('template-1');
    });

    it('应该按分类过滤摘要', () => {
      const filter: TriggerTemplateFilter = { category: 'test' };
      const summaries = api.getTemplateSummaries(filter);
      expect(summaries).toHaveLength(2);
    });

    it('应该按标签过滤摘要', () => {
      const filter: TriggerTemplateFilter = { tags: ['test'] };
      const summaries = api.getTemplateSummaries(filter);
      expect(summaries).toHaveLength(2);
    });

    it('应该按关键词过滤摘要', () => {
      const filter: TriggerTemplateFilter = { keyword: 'template-1' };
      const summaries = api.getTemplateSummaries(filter);
      expect(summaries).toHaveLength(1);
    });
  });

  describe('hasTemplate', () => {
    it('应该返回true当模板存在时', () => {
      const template = createMockTemplate('test-template');
      api.registerTemplate(template);
      
      const result = api.hasTemplate('test-template');
      expect(result).toBe(true);
    });

    it('应该返回false当模板不存在时', () => {
      const result = api.hasTemplate('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getTemplateCount', () => {
    it('应该返回模板数量', () => {
      api.registerTemplates([
        createMockTemplate('template-1'),
        createMockTemplate('template-2'),
        createMockTemplate('template-3')
      ]);
      
      const count = api.getTemplateCount();
      expect(count).toBe(3);
    });

    it('应该返回0当没有模板时', () => {
      const count = api.getTemplateCount();
      expect(count).toBe(0);
    });
  });

  describe('clearTemplates', () => {
    it('应该清空所有模板', () => {
      api.registerTemplates([
        createMockTemplate('template-1'),
        createMockTemplate('template-2')
      ]);
      
      api.clearTemplates();
      
      expect(mockRegistry.size()).toBe(0);
    });
  });

  describe('searchTemplates', () => {
    beforeEach(() => {
      api.registerTemplates([
        createMockTemplate('trigger-1'),
        createMockTemplate('trigger-2'),
        createMockTemplate('test-trigger')
      ]);
    });

    it('应该按关键词搜索模板', () => {
      const results = api.searchTemplates('trigger-1');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('trigger-1');
    });

    it('应该返回空数组当没有匹配结果时', () => {
      const results = api.searchTemplates('non-existent');
      expect(results).toHaveLength(0);
    });

    it('应该搜索描述', () => {
      const template = createMockTemplate('special-template');
      template.description = 'This is a special trigger';
      api.registerTemplate(template);
      
      const results = api.searchTemplates('special');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('special-template');
    });
  });

  describe('exportTemplate', () => {
    it('应该导出模板为JSON字符串', () => {
      const template = createMockTemplate('test-template');
      api.registerTemplate(template);
      
      const json = api.exportTemplate('test-template');
      
      expect(typeof json).toBe('string');
      const exported = JSON.parse(json);
      expect(exported.name).toBe('test-template');
    });

    it('应该抛出错误当模板不存在时', () => {
      expect(() => {
        api.exportTemplate('non-existent');
      }).toThrow();
    });
  });

  describe('importTemplate', () => {
    it('应该从JSON字符串导入模板', () => {
      const template = createMockTemplate('test-template');
      const json = JSON.stringify(template);
      
      const name = api.importTemplate(json);
      
      expect(name).toBe('test-template');
      expect(mockRegistry.has('test-template')).toBe(true);
    });

    it('应该抛出错误当JSON无效时', () => {
      expect(() => {
        api.importTemplate('invalid json');
      }).toThrow();
    });
  });

  describe('importTemplates', () => {
    it('应该批量导入模板', () => {
      const templates = [
        createMockTemplate('template-1'),
        createMockTemplate('template-2'),
        createMockTemplate('template-3')
      ];
      const jsons = templates.map(t => JSON.stringify(t));
      
      const names = api.importTemplates(jsons);
      
      expect(names).toHaveLength(3);
      expect(names).toEqual(['template-1', 'template-2', 'template-3']);
      expect(mockRegistry.size()).toBe(3);
    });

    it('应该处理空数组', () => {
      const names = api.importTemplates([]);
      expect(names).toHaveLength(0);
    });
  });

  describe('exportTemplates', () => {
    it('应该批量导出模板', () => {
      const templates = [
        createMockTemplate('template-1'),
        createMockTemplate('template-2')
      ];
      api.registerTemplates(templates);
      
      const jsons = api.exportTemplates(['template-1', 'template-2']);
      
      expect(jsons).toHaveLength(2);
      expect(typeof jsons[0]).toBe('string');
      expect(typeof jsons[1]).toBe('string');
      
      const exported1 = JSON.parse(jsons[0]!);
      const exported2 = JSON.parse(jsons[1]!);
      expect(exported1.name).toBe('template-1');
      expect(exported2.name).toBe('template-2');
    });

    it('应该处理空数组', () => {
      const jsons = api.exportTemplates([]);
      expect(jsons).toHaveLength(0);
    });
  });

  describe('全局实例', () => {
    it('应该导出全局实例', () => {
      expect(triggerTemplateRegistryAPI).toBeInstanceOf(TriggerTemplateRegistryAPI);
    });
  });

  describe('自定义注册表', () => {
    it('应该接受自定义注册表', () => {
      const customRegistry = {
        _templates: new Map<string, TriggerTemplate>(),
        register: function(template: TriggerTemplate) { this._templates.set(template.name, template); },
        registerBatch: function(templates: TriggerTemplate[]) { templates.forEach(t => this.register(t)); },
        get: function(name: string) { return this._templates.get(name); },
        update: function(name: string, updates: Partial<TriggerTemplate>) { 
          const t = this._templates.get(name);
          if (t) this._templates.set(name, { ...t, ...updates });
        },
        unregister: function(name: string) { this._templates.delete(name); },
        unregisterBatch: function(names: string[]) { names.forEach(n => this.unregister(n)); },
        list: function() { return Array.from(this._templates.values()); },
        has: function(name: string) { return this._templates.has(name); },
        size: function() { return this._templates.size; },
        clear: function() { this._templates.clear(); },
        search: function(keyword: string) { 
          return this.list().filter(t => t.name.includes(keyword) || t.description?.includes(keyword));
        },
        export: function(name: string) { 
          const t = this._templates.get(name);
          if (!t) throw new Error('Not found');
          return JSON.stringify(t);
        },
        import: function(json: string) { 
          const t = JSON.parse(json);
          this.register(t);
          return t.name;
        }
      };
      
      const customApi = new TriggerTemplateRegistryAPI(customRegistry as any);
      const template = createMockTemplate('custom-template');
      
      customApi.registerTemplate(template);
      
      expect(customApi.getTemplate('custom-template')).toEqual(template);
    });
  });
});
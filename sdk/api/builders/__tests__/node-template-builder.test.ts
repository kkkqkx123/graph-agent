/**
 * NodeTemplateBuilder 单元测试
 */

import { NodeTemplateBuilder } from '../node-template-builder';
import { NodeType } from '@modular-agent/types';
import { nodeTemplateRegistry } from '@modular-agent/sdk/core/services/node-template-registry';

// Mock the registry
jest.mock('../../../../core/services/node-template-registry', () => ({
  nodeTemplateRegistry: {
    register: jest.fn(),
    get: jest.fn(),
    unregister: jest.fn()
  }
}));

describe('NodeTemplateBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该创建一个新的构建器实例', () => {
      const builder = NodeTemplateBuilder.create('test-template', NodeType.LLM);
      expect(builder).toBeInstanceOf(NodeTemplateBuilder);
    });
  });

  describe('链式方法', () => {
    it('应该支持链式调用', () => {
      const builder = NodeTemplateBuilder
        .create('test-template', NodeType.LLM)
        .description('测试模板')
        .config({ profileId: 'gpt-4' })
        .category('llm')
        .tags('gpt-4', 'test');

      expect(builder).toBeInstanceOf(NodeTemplateBuilder);
    });

    it('description 应该设置描述', () => {
      const template = NodeTemplateBuilder
        .create('test-template', NodeType.LLM)
        .description('测试描述')
        .build();

      expect(template.description).toBe('测试描述');
    });

    it('config 应该设置配置', () => {
      const config = { profileId: 'gpt-4', prompt: '测试提示词' };
      const template = NodeTemplateBuilder
        .create('test-template', NodeType.LLM)
        .config(config)
        .build();

      expect(template.config).toEqual(config);
    });

    it('metadata 应该设置元数据', () => {
      const metadata = { author: 'test', version: '1.0' };
      const template = NodeTemplateBuilder
        .create('test-template', NodeType.LLM)
        .metadata(metadata)
        .build();

      expect(template.metadata).toEqual(metadata);
    });

    it('category 应该设置分类', () => {
      const template = NodeTemplateBuilder
        .create('test-template', NodeType.LLM)
        .category('llm')
        .build();

      expect(template.metadata?.['category']).toBe('llm');
    });

    it('tags 应该添加标签', () => {
      const template = NodeTemplateBuilder
        .create('test-template', NodeType.LLM)
        .tags('gpt-4', 'test', 'llm')
        .build();

      expect(template.metadata?.['tags']).toEqual(['gpt-4', 'test', 'llm']);
    });

    it('多次调用 tags 应该累积标签', () => {
      const template = NodeTemplateBuilder
        .create('test-template', NodeType.LLM)
        .tags('gpt-4')
        .tags('test')
        .build();

      expect(template.metadata?.['tags']).toEqual(['gpt-4', 'test']);
    });

    it('category 和 tags 应该可以一起使用', () => {
      const template = NodeTemplateBuilder
        .create('test-template', NodeType.LLM)
        .category('llm')
        .tags('gpt-4', 'test')
        .build();

      expect(template.metadata?.['category']).toBe('llm');
      expect(template.metadata?.['tags']).toEqual(['gpt-4', 'test']);
    });
  });

  describe('build', () => {
    it('应该构建完整的节点模板', () => {
      const template = NodeTemplateBuilder
        .create('test-template', NodeType.LLM)
        .description('测试描述')
        .config({ profileId: 'gpt-4' })
        .category('llm')
        .tags('gpt-4', 'test')
        .build();

      expect(template.name).toBe('test-template');
      expect(template.type).toBe(NodeType.LLM);
      expect(template.description).toBe('测试描述');
      expect(template.config).toEqual({ profileId: 'gpt-4' });
      expect(template.metadata?.['category']).toBe('llm');
      expect(template.metadata?.['tags']).toEqual(['gpt-4', 'test']);
      expect(template.createdAt).toBeDefined();
      expect(template.updatedAt).toBeDefined();
    });

    it('应该抛出错误如果名称为空', () => {
      const builder = NodeTemplateBuilder.create('' as any, NodeType.LLM);
      expect(() => builder.build()).toThrow('模板名称不能为空');
    });

    it('应该抛出错误如果类型为空', () => {
      const builder = NodeTemplateBuilder.create('test', null as any);
      expect(() => builder.build()).toThrow('节点类型不能为空');
    });

    it('应该抛出错误如果配置为空', () => {
      const builder = NodeTemplateBuilder.create('test', NodeType.LLM);
      (builder as any).template.config = null;
      expect(() => builder.build()).toThrow('节点配置不能为空');
    });

    it('应该设置默认的空配置', () => {
      const template = NodeTemplateBuilder
        .create('test-template', NodeType.LLM)
        .build();

      expect(template.config).toEqual({});
    });

    it('应该自动设置时间戳', () => {
      const beforeCreate = Date.now();
      const template = NodeTemplateBuilder
        .create('test-template', NodeType.LLM)
        .build();
      const afterCreate = Date.now();

      expect(template.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(template.createdAt).toBeLessThanOrEqual(afterCreate);
      expect(template.updatedAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(template.updatedAt).toBeLessThanOrEqual(afterCreate);
    });
  });

  describe('register', () => {
    it('应该注册模板到注册表', () => {
      const builder = NodeTemplateBuilder
        .create('test-template', NodeType.LLM)
        .config({ profileId: 'gpt-4' });

      builder.register();

      expect(nodeTemplateRegistry.register).toHaveBeenCalledTimes(1);
      const registeredTemplate = (nodeTemplateRegistry.register as jest.Mock).mock.calls[0][0];
      expect(registeredTemplate.name).toBe('test-template');
      expect(registeredTemplate.type).toBe(NodeType.LLM);
    });

    it('register 应该返回 this 以支持链式调用', () => {
      const builder = NodeTemplateBuilder
        .create('test-template', NodeType.LLM)
        .config({ profileId: 'gpt-4' });

      const result = builder.register();
      expect(result).toBe(builder);
    });
  });

  describe('buildAndRegister', () => {
    it('应该构建并注册模板', () => {
      const template = NodeTemplateBuilder
        .create('test-template', NodeType.LLM)
        .config({ profileId: 'gpt-4' })
        .buildAndRegister();

      expect(template.name).toBe('test-template');
      expect(template.type).toBe(NodeType.LLM);
      expect(nodeTemplateRegistry.register).toHaveBeenCalledTimes(1);
    });

    it('应该返回构建的模板', () => {
      const template = NodeTemplateBuilder
        .create('test-template', NodeType.LLM)
        .config({ profileId: 'gpt-4' })
        .buildAndRegister();

      expect(template).toBeDefined();
      expect(template.name).toBe('test-template');
    });
  });

  describe('完整使用场景', () => {
    it('应该支持完整的构建流程', () => {
      const template = NodeTemplateBuilder
        .create('gpt4-process', NodeType.LLM)
        .description('GPT-4处理节点')
        .config({
          profileId: 'gpt-4',
          prompt: '处理这个任务'
        })
        .category('llm')
        .tags('gpt-4', 'process', 'ai')
        .build();

      expect(template.name).toBe('gpt4-process');
      expect(template.type).toBe(NodeType.LLM);
      expect(template.description).toBe('GPT-4处理节点');
      expect(template.config).toEqual({
        profileId: 'gpt-4',
        prompt: '处理这个任务'
      });
      expect(template.metadata?.['category']).toBe('llm');
      expect(template.metadata?.['tags']).toEqual(['gpt-4', 'process', 'ai']);
    });

    it('应该支持构建并立即注册', () => {
      NodeTemplateBuilder
        .create('gpt4-process', NodeType.LLM)
        .description('GPT-4处理节点')
        .config({
          profileId: 'gpt-4',
          prompt: '处理这个任务'
        })
        .category('llm')
        .tags('gpt-4', 'process')
        .register();

      expect(nodeTemplateRegistry.register).toHaveBeenCalledTimes(1);
    });

    it('应该支持构建并注册并获取模板', () => {
      const template = NodeTemplateBuilder
        .create('gpt4-process', NodeType.LLM)
        .description('GPT-4处理节点')
        .config({
          profileId: 'gpt-4',
          prompt: '处理这个任务'
        })
        .category('llm')
        .tags('gpt-4', 'process')
        .buildAndRegister();

      expect(template).toBeDefined();
      expect(nodeTemplateRegistry.register).toHaveBeenCalledTimes(1);
    });
  });

  describe('不同节点类型', () => {
    it('应该支持 CODE 节点', () => {
      const template = NodeTemplateBuilder
        .create('python-script', NodeType.CODE)
        .config({
          scriptName: 'test.py',
          scriptType: 'python',
          risk: 'low'
        })
        .build();

      expect(template.type).toBe(NodeType.CODE);
      expect(template.config).toEqual({
        scriptName: 'test.py',
        scriptType: 'python',
        risk: 'low'
      });
    });

    it('应该支持 VARIABLE 节点', () => {
      const template = NodeTemplateBuilder
        .create('set-variable', NodeType.VARIABLE)
        .config({
          variableName: 'count',
          variableType: 'number',
          expression: '{{count}} + 1'
        })
        .build();

      expect(template.type).toBe(NodeType.VARIABLE);
      expect(template.config).toEqual({
        variableName: 'count',
        variableType: 'number',
        expression: '{{count}} + 1'
      });
    });

    it('应该支持 ROUTE 节点', () => {
      const template = NodeTemplateBuilder
        .create('router', NodeType.ROUTE)
        .config({
          routes: [
            { condition: { expression: '{{status}} === "success"' }, targetNodeId: 'success' },
            { condition: { expression: '{{status}} === "failure"' }, targetNodeId: 'failure' }
          ],
          defaultTargetNodeId: 'default'
        } as any)
        .build();

      expect(template.type).toBe(NodeType.ROUTE);
      expect((template.config as any).routes).toHaveLength(2);
    });
  });
});
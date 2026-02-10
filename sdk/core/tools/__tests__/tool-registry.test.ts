/**
 * 工具注册表单元测试
 */

import { ToolRegistry } from '../tool-registry';
import type { Tool } from '../../../types/tool';
import { ToolType } from '../../../types/tool';
import { ValidationError, NotFoundError } from '../../../types/errors';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;
  let mockTool: Tool;

  beforeEach(() => {
    registry = new ToolRegistry();
    mockTool = {
      id: 'test-tool-1',
      name: 'test-tool',
      type: ToolType.STATELESS,
      description: 'Test tool',
      parameters: {
        properties: {
          input: { type: 'string' as const, description: 'Input parameter' }
        },
        required: ['input']
      }
    };
  });

  describe('register', () => {
    it('should register a valid tool', () => {
      registry.register(mockTool);
      expect(registry.has('test-tool')).toBe(true);
    });

    it('should throw ValidationError if tool name is missing', () => {
      const invalidTool = { ...mockTool, name: '' };
      expect(() => registry.register(invalidTool)).toThrow(ValidationError);
    });

    it('should throw ValidationError if tool type is missing', () => {
      const invalidTool = { ...mockTool, type: '' as ToolType };
      expect(() => registry.register(invalidTool)).toThrow(ValidationError);
    });

    it('should throw ValidationError if tool description is missing', () => {
      const invalidTool = { ...mockTool, description: '' };
      expect(() => registry.register(invalidTool)).toThrow(ValidationError);
    });

    it('should throw ValidationError if parameters schema is missing', () => {
      const invalidTool = { ...mockTool, parameters: undefined as any };
      expect(() => registry.register(invalidTool)).toThrow(ValidationError);
    });

    it('should throw ValidationError if required parameter is not in properties', () => {
      const invalidTool = {
        ...mockTool,
        parameters: {
          properties: {
            input: { type: 'string' as const, description: 'Input parameter' }
          },
          required: ['input', 'missing']
        }
      };
      expect(() => registry.register(invalidTool)).toThrow(ValidationError);
    });

    it('should throw ValidationError if tool name already exists', () => {
      registry.register(mockTool);
      expect(() => registry.register(mockTool)).toThrow(ValidationError);
    });
  });

  describe('registerBatch', () => {
    it('should register multiple tools', () => {
      const tools = [
        mockTool,
        {
          ...mockTool,
          id: 'test-tool-2',
          name: 'test-tool-2'
        }
      ];
      registry.registerBatch(tools);
      expect(registry.size()).toBe(2);
    });
  });

  describe('get', () => {
    it('should return tool if exists', () => {
      registry.register(mockTool);
      const tool = registry.get('test-tool');
      expect(tool).toEqual(mockTool);
    });

    it('should return undefined if tool does not exist', () => {
      const tool = registry.get('non-existent');
      expect(tool).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true if tool exists', () => {
      registry.register(mockTool);
      expect(registry.has('test-tool')).toBe(true);
    });

    it('should return false if tool does not exist', () => {
      expect(registry.has('non-existent')).toBe(false);
    });
  });

  describe('remove', () => {
    it('should remove tool if exists', () => {
      registry.register(mockTool);
      registry.remove('test-tool');
      expect(registry.has('test-tool')).toBe(false);
    });

    it('should throw NotFoundError if tool does not exist', () => {
      expect(() => registry.remove('non-existent')).toThrow(NotFoundError);
    });
  });

  describe('list', () => {
    it('should return all registered tools', () => {
      registry.register(mockTool);
      const tools = registry.list();
      expect(tools).toHaveLength(1);
      expect(tools[0]).toEqual(mockTool);
    });

    it('should return empty array if no tools registered', () => {
      const tools = registry.list();
      expect(tools).toHaveLength(0);
    });
  });

  describe('listByType', () => {
    it('should return tools of specified type', () => {
      registry.register(mockTool);
      registry.register({
        ...mockTool,
        id: 'test-tool-2',
        name: 'test-tool-2',
        type: ToolType.STATEFUL
      });
      const statelessTools = registry.listByType(ToolType.STATELESS);
      expect(statelessTools).toHaveLength(1);
      expect(statelessTools[0]?.type).toBe(ToolType.STATELESS);
    });
  });

  describe('listByCategory', () => {
    it('should return tools of specified category', () => {
      registry.register({
        ...mockTool,
        metadata: { category: 'math' }
      });
      registry.register({
        ...mockTool,
        id: 'test-tool-2',
        name: 'test-tool-2',
        metadata: { category: 'string' }
      });
      const mathTools = registry.listByCategory('math');
      expect(mathTools).toHaveLength(1);
      expect(mathTools[0]?.metadata?.category).toBe('math');
    });
  });

  describe('clear', () => {
    it('should clear all tools', () => {
      registry.register(mockTool);
      registry.clear();
      expect(registry.size()).toBe(0);
    });
  });

  describe('size', () => {
    it('should return correct size', () => {
      expect(registry.size()).toBe(0);
      registry.register(mockTool);
      expect(registry.size()).toBe(1);
    });
  });

  describe('search', () => {
    it('should search tools by name', () => {
      registry.register(mockTool);
      const results = registry.search('test');
      expect(results).toHaveLength(1);
    });

    it('should search tools by description', () => {
      registry.register(mockTool);
      const results = registry.search('Test tool');
      expect(results).toHaveLength(1);
    });

    it('should search tools by tags', () => {
      registry.register({
        ...mockTool,
        metadata: { tags: ['calculator', 'math'] }
      });
      const results = registry.search('calculator');
      expect(results).toHaveLength(1);
    });

    it('should search tools by category', () => {
      registry.register({
        ...mockTool,
        metadata: { category: 'math' }
      });
      const results = registry.search('math');
      expect(results).toHaveLength(1);
    });

    it('should return empty array if no matches', () => {
      registry.register(mockTool);
      const results = registry.search('nonexistent');
      expect(results).toHaveLength(0);
    });
  });
});
/**
 * 工具服务单元测试
 */

import { ToolService } from '../tool-service';
import type { Tool } from '../../../types/tool';
import { ToolType } from '../../../types/tool';
import { NotFoundError, ToolError } from '../../../types/errors';

describe('ToolService', () => {
  let service: ToolService;
  let mockTool: Tool;

  beforeEach(() => {
    service = new ToolService();
    mockTool = {
      id: 'test-tool-1',
      name: 'test-tool',
      type: ToolType.BUILTIN,
      description: 'Test tool',
      parameters: {
        properties: {
          input: { type: 'string' as const, description: 'Input parameter' }
        },
        required: ['input']
      }
    };
  });

  describe('registerTool', () => {
    it('should register a tool', () => {
      service.registerTool(mockTool);
      expect(service.hasTool('test-tool')).toBe(true);
    });
  });

  describe('registerTools', () => {
    it('should register multiple tools', () => {
      const tools = [
        mockTool,
        {
          ...mockTool,
          id: 'test-tool-2',
          name: 'test-tool-2'
        }
      ];
      service.registerTools(tools);
      expect(service.getToolCount()).toBe(2);
    });
  });

  describe('unregisterTool', () => {
    it('should unregister a tool', () => {
      service.registerTool(mockTool);
      service.unregisterTool('test-tool');
      expect(service.hasTool('test-tool')).toBe(false);
    });
  });

  describe('getTool', () => {
    it('should return tool if exists', () => {
      service.registerTool(mockTool);
      const tool = service.getTool('test-tool');
      expect(tool).toEqual(mockTool);
    });

    it('should throw NotFoundError if tool does not exist', () => {
      expect(() => service.getTool('non-existent')).toThrow(NotFoundError);
    });
  });

  describe('listTools', () => {
    it('should return all tools', () => {
      service.registerTool(mockTool);
      const tools = service.listTools();
      expect(tools).toHaveLength(1);
    });
  });

  describe('listToolsByType', () => {
    it('should return tools of specified type', () => {
      service.registerTool(mockTool);
      service.registerTool({
        ...mockTool,
        id: 'test-tool-2',
        name: 'test-tool-2',
        type: ToolType.NATIVE
      });
      const builtinTools = service.listToolsByType(ToolType.BUILTIN);
      expect(builtinTools).toHaveLength(1);
    });
  });

  describe('listToolsByCategory', () => {
    it('should return tools of specified category', () => {
      service.registerTool({
        ...mockTool,
        metadata: { category: 'math' }
      });
      const mathTools = service.listToolsByCategory('math');
      expect(mathTools).toHaveLength(1);
    });
  });

  describe('searchTools', () => {
    it('should search tools by keyword', () => {
      service.registerTool(mockTool);
      const results = service.searchTools('test');
      expect(results).toHaveLength(1);
    });
  });

  describe('hasTool', () => {
    it('should return true if tool exists', () => {
      service.registerTool(mockTool);
      expect(service.hasTool('test-tool')).toBe(true);
    });

    it('should return false if tool does not exist', () => {
      expect(service.hasTool('non-existent')).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute builtin calculator tool', async () => {
      const calculatorTool: Tool = {
        id: 'calculator',
        name: 'calculator',
        type: ToolType.BUILTIN,
        description: 'Calculator tool',
        parameters: {
          properties: {
            expression: { type: 'string' as const, description: 'Math expression' },
            precision: { type: 'number' as const, description: 'Precision' }
          },
          required: ['expression']
        }
      };

      service.registerTool(calculatorTool);
      const result = await service.execute('calculator', {
        expression: '2 + 3',
        precision: 2
      });

      expect(result.success).toBe(true);
      expect(result.result).toEqual({
        expression: '2 + 3',
        result: 5,
        precision: 2
      });
    });

    it('should throw NotFoundError if tool does not exist', async () => {
      await expect(
        service.execute('non-existent', {})
      ).rejects.toThrow(NotFoundError);
    });

    it('should handle execution errors', async () => {
      const calculatorTool: Tool = {
        id: 'calculator',
        name: 'calculator',
        type: ToolType.BUILTIN,
        description: 'Calculator tool',
        parameters: {
          properties: {
            expression: { type: 'string', description: 'Math expression' }
          },
          required: ['expression']
        }
      };

      service.registerTool(calculatorTool);
      const result = await service.execute('calculator', {
        expression: 'invalid expression'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('executeBatch', () => {
    it('should execute multiple tools in parallel', async () => {
      const calculatorTool: Tool = {
        id: 'calculator',
        name: 'calculator',
        type: ToolType.BUILTIN,
        description: 'Calculator tool',
        parameters: {
          properties: {
            expression: { type: 'string', description: 'Math expression' }
          },
          required: ['expression']
        }
      };

      service.registerTool(calculatorTool);

      const results = await service.executeBatch([
        { toolName: 'calculator', parameters: { expression: '2 + 3' } },
        { toolName: 'calculator', parameters: { expression: '5 * 6' } }
      ]);

      expect(results).toHaveLength(2);
      expect(results[0]?.success).toBe(true);
      expect(results[1]?.success).toBe(true);
    });
  });

  describe('validateParameters', () => {
    it('should validate parameters successfully', () => {
      service.registerTool(mockTool);
      const result = service.validateParameters('test-tool', {
        input: 'test'
      });
      expect(result.valid).toBe(true);
    });

    it('should return errors if tool does not exist', () => {
      const result = service.validateParameters('non-existent', {});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getToolCount', () => {
    it('should return correct tool count', () => {
      expect(service.getToolCount()).toBe(0);
      service.registerTool(mockTool);
      expect(service.getToolCount()).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all tools', () => {
      service.registerTool(mockTool);
      service.clear();
      expect(service.getToolCount()).toBe(0);
    });
  });

  describe('getRegistry', () => {
    it('should return the registry', () => {
      const registry = service.getRegistry();
      expect(registry).toBeDefined();
    });
  });
});
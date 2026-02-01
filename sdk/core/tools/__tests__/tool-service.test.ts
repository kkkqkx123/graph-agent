/**
 * 工具服务单元测试
 */

import { ToolService } from '../../services/tool-service';
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
      type: ToolType.STATELESS,
      description: 'Test tool',
      parameters: {
        properties: {
          input: { type: 'string' as const, description: 'Input parameter' }
        },
        required: ['input']
      },
      config: {
        execute: async (params: Record<string, any>) => ({
          input: params.input,
          processed: true
        })
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
        type: ToolType.REST
      });
      const statelessTools = service.listToolsByType(ToolType.STATELESS);
      expect(statelessTools).toHaveLength(1);
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
    it('should execute stateless tool', async () => {
      const statelessTool: Tool = {
        id: 'test-stateless',
        name: 'test-stateless',
        type: ToolType.STATELESS,
        description: 'Stateless tool',
        parameters: {
          properties: {
            input: { type: 'string' as const, description: 'Input' }
          },
          required: ['input']
        },
        config: {
          execute: async (params: Record<string, any>) => ({
            input: params.input,
            result: `processed: ${params.input}`
          })
        }
      };

      service.registerTool(statelessTool);
      const result = await service.execute('test-stateless', {
        input: 'test'
      });

      expect(result.success).toBe(true);
      expect(result.result).toEqual({
        input: 'test',
        result: 'processed: test'
      });
    });

    it('should throw NotFoundError if tool does not exist', async () => {
      await expect(
        service.execute('non-existent', {})
      ).rejects.toThrow(NotFoundError);
    });

    it('should handle execution errors for stateless tool', async () => {
      const statelessTool: Tool = {
        id: 'error-tool',
        name: 'error-tool',
        type: ToolType.STATELESS,
        description: 'Tool that throws error',
        parameters: {
          properties: {
            input: { type: 'string', description: 'Input' }
          },
          required: ['input']
        },
        config: {
          execute: async () => {
            throw new Error('Execution failed');
          }
        }
      };

      service.registerTool(statelessTool);
      await expect(
        service.execute('error-tool', { input: 'test' })
      ).rejects.toThrow();
    });
  });

  describe('executeBatch', () => {
    it('should execute multiple tools in parallel', async () => {
      const statelessTool: Tool = {
        id: 'test-batch',
        name: 'test-batch',
        type: ToolType.STATELESS,
        description: 'Stateless tool for batch testing',
        parameters: {
          properties: {
            value: { type: 'number', description: 'Value to process' }
          },
          required: ['value']
        },
        config: {
          execute: async (params: Record<string, any>) => ({
            input: params.value,
            result: params.value * 2
          })
        }
      };

      service.registerTool(statelessTool);

      const results = await service.executeBatch([
        { toolName: 'test-batch', parameters: { value: 5 } },
        { toolName: 'test-batch', parameters: { value: 10 } }
      ]);

      expect(results).toHaveLength(2);
      expect(results[0]?.success).toBe(true);
      expect(results[1]?.success).toBe(true);
      expect(results[0]?.result?.result).toBe(10);
      expect(results[1]?.result?.result).toBe(20);
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
/**
 * 内置工具执行器单元测试
 */

import { BuiltinToolExecutor } from '../executors/builtin';
import type { Tool } from '../../../types/tool';
import { ToolType } from '../../../types/tool';

describe('BuiltinToolExecutor', () => {
  let executor: BuiltinToolExecutor;

  beforeEach(() => {
    executor = new BuiltinToolExecutor();
  });

  describe('calculator', () => {
    it('should calculate simple expression', async () => {
      const tool: Tool = {
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

      const result = await executor.execute(tool, {
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

    it('should calculate complex expression', async () => {
      const tool: Tool = {
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

      const result = await executor.execute(tool, {
        expression: '2 * 3 + 4 / 2'
      });

      expect(result.success).toBe(true);
      expect(result.result.result).toBe(8);
    });

    it('should handle precision', async () => {
      const tool: Tool = {
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

      const result = await executor.execute(tool, {
        expression: '10 / 3',
        precision: 4
      });

      expect(result.success).toBe(true);
      expect(result.result.result).toBe(3.3333);
    });

    it('should reject invalid characters', async () => {
      const tool: Tool = {
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

      const result = await executor.execute(tool, {
        expression: '2 + eval("malicious")'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('datetime', () => {
    it('should get current time', async () => {
      const tool: Tool = {
        id: 'datetime',
        name: 'datetime',
        type: ToolType.BUILTIN,
        description: 'Datetime tool',
        parameters: {
          properties: {
            operation: { type: 'string', description: 'Operation' }
          },
          required: ['operation']
        }
      };

      const result = await executor.execute(tool, {
        operation: 'now'
      });

      expect(result.success).toBe(true);
      expect(result.result.timestamp).toBeDefined();
      expect(result.result.iso).toBeDefined();
    });

    it('should format date', async () => {
      const tool: Tool = {
        id: 'datetime',
        name: 'datetime',
        type: ToolType.BUILTIN,
        description: 'Datetime tool',
        parameters: {
          properties: {
            operation: { type: 'string', description: 'Operation' },
            format: { type: 'string', description: 'Format' }
          },
          required: ['operation', 'format']
        }
      };

      const result = await executor.execute(tool, {
        operation: 'format',
        format: 'YYYY-MM-DD'
      });

      expect(result.success).toBe(true);
      expect(result.result.formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should add time offset', async () => {
      const tool: Tool = {
        id: 'datetime',
        name: 'datetime',
        type: ToolType.BUILTIN,
        description: 'Datetime tool',
        parameters: {
          properties: {
            operation: { type: 'string' as const, description: 'Operation' },
            offset: { type: 'number' as const, description: 'Offset in ms' }
          },
          required: ['operation', 'offset']
        }
      };

      const result = await executor.execute(tool, {
        operation: 'add',
        offset: 3600000 // 1 hour
      });

      expect(result.success).toBe(true);
      expect(result.result.offset).toBe(3600000);
    });
  });

  describe('string', () => {
    it('should get string length', async () => {
      const tool: Tool = {
        id: 'string',
        name: 'string',
        type: ToolType.BUILTIN,
        description: 'String tool',
        parameters: {
          properties: {
            operation: { type: 'string', description: 'Operation' },
            text: { type: 'string', description: 'Text' }
          },
          required: ['operation', 'text']
        }
      };

      const result = await executor.execute(tool, {
        operation: 'length',
        text: 'hello'
      });

      expect(result.success).toBe(true);
      expect(result.result.length).toBe(5);
    });

    it('should convert to uppercase', async () => {
      const tool: Tool = {
        id: 'string',
        name: 'string',
        type: ToolType.BUILTIN,
        description: 'String tool',
        parameters: {
          properties: {
            operation: { type: 'string', description: 'Operation' },
            text: { type: 'string', description: 'Text' }
          },
          required: ['operation', 'text']
        }
      };

      const result = await executor.execute(tool, {
        operation: 'uppercase',
        text: 'hello'
      });

      expect(result.success).toBe(true);
      expect(result.result.uppercase).toBe('HELLO');
    });

    it('should replace text', async () => {
      const tool: Tool = {
        id: 'string',
        name: 'string',
        type: ToolType.BUILTIN,
        description: 'String tool',
        parameters: {
          properties: {
            operation: { type: 'string', description: 'Operation' },
            text: { type: 'string', description: 'Text' },
            pattern: { type: 'string', description: 'Pattern' },
            replacement: { type: 'string', description: 'Replacement' }
          },
          required: ['operation', 'text', 'pattern', 'replacement']
        }
      };

      const result = await executor.execute(tool, {
        operation: 'replace',
        text: 'hello world',
        pattern: 'world',
        replacement: 'there'
      });

      expect(result.success).toBe(true);
      expect(result.result.replaced).toBe('hello there');
    });
  });

  describe('array', () => {
    it('should get array length', async () => {
      const tool: Tool = {
        id: 'array',
        name: 'array',
        type: ToolType.BUILTIN,
        description: 'Array tool',
        parameters: {
          properties: {
            operation: { type: 'string', description: 'Operation' },
            array: { type: 'array', description: 'Array' }
          },
          required: ['operation', 'array']
        }
      };

      const result = await executor.execute(tool, {
        operation: 'length',
        array: [1, 2, 3]
      });

      expect(result.success).toBe(true);
      expect(result.result.length).toBe(3);
    });

    it('should push item to array', async () => {
      const tool: Tool = {
        id: 'array',
        name: 'array',
        type: ToolType.BUILTIN,
        description: 'Array tool',
        parameters: {
          properties: {
            operation: { type: 'string' as const, description: 'Operation' },
            array: { type: 'array' as const, description: 'Array' },
            item: { type: 'number' as const, description: 'Item' }
          },
          required: ['operation', 'array', 'item']
        }
      };

      const result = await executor.execute(tool, {
        operation: 'push',
        array: [1, 2],
        item: 3
      });

      expect(result.success).toBe(true);
      expect(result.result.result).toEqual([1, 2, 3]);
    });
  });

  describe('object', () => {
    it('should get object keys', async () => {
      const tool: Tool = {
        id: 'object',
        name: 'object',
        type: ToolType.BUILTIN,
        description: 'Object tool',
        parameters: {
          properties: {
            operation: { type: 'string', description: 'Operation' },
            object: { type: 'object', description: 'Object' }
          },
          required: ['operation', 'object']
        }
      };

      const result = await executor.execute(tool, {
        operation: 'keys',
        object: { a: 1, b: 2 }
      });

      expect(result.success).toBe(true);
      expect(result.result.keys).toEqual(['a', 'b']);
    });

    it('should set object property', async () => {
      const tool: Tool = {
        id: 'object',
        name: 'object',
        type: ToolType.BUILTIN,
        description: 'Object tool',
        parameters: {
          properties: {
            operation: { type: 'string' as const, description: 'Operation' },
            object: { type: 'object' as const, description: 'Object' },
            key: { type: 'string' as const, description: 'Key' },
            value: { type: 'number' as const, description: 'Value' }
          },
          required: ['operation', 'object', 'key', 'value']
        }
      };

      const result = await executor.execute(tool, {
        operation: 'set',
        object: { a: 1 },
        key: 'b',
        value: 2
      });

      expect(result.success).toBe(true);
      expect(result.result.result).toEqual({ a: 1, b: 2 });
    });
  });

  describe('hash_convert', () => {
    it('should encode to base64', async () => {
      const tool: Tool = {
        id: 'hash_convert',
        name: 'hash_convert',
        type: ToolType.BUILTIN,
        description: 'Hash convert tool',
        parameters: {
          properties: {
            operation: { type: 'string', description: 'Operation' },
            input: { type: 'string', description: 'Input' }
          },
          required: ['operation', 'input']
        }
      };

      const result = await executor.execute(tool, {
        operation: 'encode',
        input: 'hello'
      });

      expect(result.success).toBe(true);
      expect(result.result.encoded).toBe('aGVsbG8=');
    });

    it('should decode from base64', async () => {
      const tool: Tool = {
        id: 'hash_convert',
        name: 'hash_convert',
        type: ToolType.BUILTIN,
        description: 'Hash convert tool',
        parameters: {
          properties: {
            operation: { type: 'string', description: 'Operation' },
            input: { type: 'string', description: 'Input' }
          },
          required: ['operation', 'input']
        }
      };

      const result = await executor.execute(tool, {
        operation: 'decode',
        input: 'aGVsbG8='
      });

      expect(result.success).toBe(true);
      expect(result.result.decoded).toBe('hello');
    });
  });

  describe('time_tool', () => {
    it('should get current timestamp', async () => {
      const tool: Tool = {
        id: 'time_tool',
        name: 'time_tool',
        type: ToolType.BUILTIN,
        description: 'Time tool',
        parameters: {
          properties: {
            operation: { type: 'string', description: 'Operation' }
          },
          required: ['operation']
        }
      };

      const result = await executor.execute(tool, {
        operation: 'current'
      });

      expect(result.success).toBe(true);
      expect(result.result.timestamp).toBeDefined();
    });

    it('should get unix timestamp', async () => {
      const tool: Tool = {
        id: 'time_tool',
        name: 'time_tool',
        type: ToolType.BUILTIN,
        description: 'Time tool',
        parameters: {
          properties: {
            operation: { type: 'string', description: 'Operation' }
          },
          required: ['operation']
        }
      };

      const result = await executor.execute(tool, {
        operation: 'unix'
      });

      expect(result.success).toBe(true);
      expect(result.result.timestamp).toBeDefined();
      expect(result.result.milliseconds).toBeDefined();
    });
  });
});
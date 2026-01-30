/**
 * RestToolExecutor 测试
 */

import { RestToolExecutor } from '../executors/rest';
import { Tool, ToolType } from '../../../types/tool';
import { ValidationError, ToolError } from '../../../types/errors';

describe('RestToolExecutor', () => {
  let executor: RestToolExecutor;

  beforeEach(() => {
    executor = new RestToolExecutor();
  });

  describe('基本功能', () => {
    it('应该成功执行GET请求', async () => {
      const tool: Tool = {
        id: 'test-rest-tool',
        name: 'test-rest-tool',
        type: ToolType.REST,
        description: 'Test REST tool',
        parameters: {
          properties: {
            url: { type: 'string' },
          },
          required: ['url'],
        },
        config: {
          baseUrl: 'https://jsonplaceholder.typicode.com',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      };

      const parameters = {
        url: '/posts/1',
        method: 'GET',
      };

      const result = await executor.execute(tool, parameters);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.status).toBe(200);
      expect(result.result.data).toBeDefined();
    });

    it('应该成功执行POST请求', async () => {
      const tool: Tool = {
        id: 'test-rest-tool',
        name: 'test-rest-tool',
        type: ToolType.REST,
        description: 'Test REST tool',
        parameters: {
          properties: {
            url: { type: 'string' },
            body: { type: 'object' },
          },
          required: ['url', 'body'],
        },
        config: {
          baseUrl: 'https://jsonplaceholder.typicode.com',
        },
      };

      const parameters = {
        url: '/posts',
        method: 'POST',
        body: {
          title: 'Test Post',
          body: 'Test body',
          userId: 1,
        },
      };

      const result = await executor.execute(tool, parameters);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.status).toBe(201);
      expect(result.result.data).toBeDefined();
    });

    it('应该支持PUT请求', async () => {
      const tool: Tool = {
        id: 'test-rest-tool',
        name: 'test-rest-tool',
        type: ToolType.REST,
        description: 'Test REST tool',
        parameters: {
          properties: {
            url: { type: 'string' },
            body: { type: 'object' },
          },
          required: ['url', 'body'],
        },
        config: {
          baseUrl: 'https://jsonplaceholder.typicode.com',
        },
      };

      const parameters = {
        url: '/posts/1',
        method: 'PUT',
        body: {
          id: 1,
          title: 'Updated Post',
          body: 'Updated body',
          userId: 1,
        },
      };

      const result = await executor.execute(tool, parameters);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.status).toBeGreaterThanOrEqual(200);
      expect(result.result.status).toBeLessThan(300);
    });

    it('应该支持DELETE请求', async () => {
      const tool: Tool = {
        id: 'test-rest-tool',
        name: 'test-rest-tool',
        type: ToolType.REST,
        description: 'Test REST tool',
        parameters: {
          properties: {
            url: { type: 'string' },
          },
          required: ['url'],
        },
        config: {
          baseUrl: 'https://jsonplaceholder.typicode.com',
        },
      };

      const parameters = {
        url: '/posts/1',
        method: 'DELETE',
      };

      const result = await executor.execute(tool, parameters);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.status).toBe(200);
    });
  });

  describe('错误处理', () => {
    it('应该在缺少URL时返回错误', async () => {
      const tool: Tool = {
        id: 'test-rest-tool',
        name: 'test-rest-tool',
        type: ToolType.REST,
        description: 'Test REST tool',
        parameters: {
          properties: {
            method: { type: 'string' },
          },
          required: [],
        },
        config: {},
      };

      const parameters = {
        method: 'GET',
      };

      const result = await executor.execute(tool, parameters);

      expect(result.success).toBe(false);
      expect(result.error).toContain('URL is required for REST tool');
    });

    it('应该处理HTTP错误', async () => {
      const tool: Tool = {
        id: 'test-rest-tool',
        name: 'test-rest-tool',
        type: ToolType.REST,
        description: 'Test REST tool',
        parameters: {
          properties: {
            url: { type: 'string' },
          },
          required: ['url'],
        },
        config: {
          baseUrl: 'https://jsonplaceholder.typicode.com',
        },
      };

      const parameters = {
        url: '/invalid-endpoint',
        method: 'GET',
      };

      const result = await executor.execute(tool, parameters);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该处理不支持的HTTP方法', async () => {
      const tool: Tool = {
        id: 'test-rest-tool',
        name: 'test-rest-tool',
        type: ToolType.REST,
        description: 'Test REST tool',
        parameters: {
          properties: {
            url: { type: 'string' },
            method: { type: 'string' },
          },
          required: ['url', 'method'],
        },
        config: {
          baseUrl: 'https://jsonplaceholder.typicode.com',
        },
      };

      const parameters = {
        url: '/posts/1',
        method: 'PATCH',
      };

      const result = await executor.execute(tool, parameters);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported HTTP method: PATCH');
    });
  });

  describe('高级功能', () => {
    it('应该支持自定义请求头', async () => {
      const tool: Tool = {
        id: 'test-rest-tool',
        name: 'test-rest-tool',
        type: ToolType.REST,
        description: 'Test REST tool',
        parameters: {
          properties: {
            url: { type: 'string' },
            headers: { type: 'object' },
          },
          required: ['url'],
        },
        config: {
          baseUrl: 'https://jsonplaceholder.typicode.com',
        },
      };

      const parameters = {
        url: '/posts/1',
        method: 'GET',
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      };

      const result = await executor.execute(tool, parameters);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
    });

    it('应该支持查询参数', async () => {
      const tool: Tool = {
        id: 'test-rest-tool',
        name: 'test-rest-tool',
        type: ToolType.REST,
        description: 'Test REST tool',
        parameters: {
          properties: {
            url: { type: 'string' },
            query: { type: 'object' },
          },
          required: ['url'],
        },
        config: {
          baseUrl: 'https://jsonplaceholder.typicode.com',
        },
      };

      const parameters = {
        url: '/posts',
        method: 'GET',
        query: {
          userId: 1,
        },
      };

      const result = await executor.execute(tool, parameters);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.url).toContain('userId=1');
    });

    it('应该支持超时配置', async () => {
      const tool: Tool = {
        id: 'test-rest-tool',
        name: 'test-rest-tool',
        type: ToolType.REST,
        description: 'Test REST tool',
        parameters: {
          properties: {
            url: { type: 'string' },
          },
          required: ['url'],
        },
        config: {
          baseUrl: 'https://jsonplaceholder.typicode.com',
          timeout: 5000,
        },
      };

      const parameters = {
        url: '/posts/1',
        method: 'GET',
      };

      const result = await executor.execute(tool, parameters);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
    });

    it('应该支持重试配置', async () => {
      const tool: Tool = {
        id: 'test-rest-tool',
        name: 'test-rest-tool',
        type: ToolType.REST,
        description: 'Test REST tool',
        parameters: {
          properties: {
            url: { type: 'string' },
          },
          required: ['url'],
        },
        config: {
          baseUrl: 'https://jsonplaceholder.typicode.com',
          maxRetries: 2,
          retryDelay: 100,
        },
      };

      const parameters = {
        url: '/posts/1',
        method: 'GET',
      };

      const result = await executor.execute(tool, parameters);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
    });

    it('应该支持完整的URL（不使用baseUrl）', async () => {
      const tool: Tool = {
        id: 'test-rest-tool',
        name: 'test-rest-tool',
        type: ToolType.REST,
        description: 'Test REST tool',
        parameters: {
          properties: {
            url: { type: 'string' },
          },
          required: ['url'],
        },
        config: {},
      };

      const parameters = {
        url: 'https://jsonplaceholder.typicode.com/posts/1',
        method: 'GET',
      };

      const result = await executor.execute(tool, parameters);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.url).toBe('https://jsonplaceholder.typicode.com/posts/1');
    });
  });

  describe('响应格式', () => {
    it('应该返回正确的响应格式', async () => {
      const tool: Tool = {
        id: 'test-rest-tool',
        name: 'test-rest-tool',
        type: ToolType.REST,
        description: 'Test REST tool',
        parameters: {
          properties: {
            url: { type: 'string' },
          },
          required: ['url'],
        },
        config: {
          baseUrl: 'https://jsonplaceholder.typicode.com',
        },
      };

      const parameters = {
        url: '/posts/1',
        method: 'GET',
      };

      const result = await executor.execute(tool, parameters);

      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('url');
      expect(result.result).toHaveProperty('method');
      expect(result.result).toHaveProperty('status');
      expect(result.result).toHaveProperty('statusText');
      expect(result.result).toHaveProperty('headers');
      expect(result.result).toHaveProperty('data');
      expect(result.result.method).toBe('GET');
      expect(result.result.status).toBe(200);
      expect(result.result.statusText).toBe('OK');
    });
  });
});